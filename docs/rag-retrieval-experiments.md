# RAG Retrieval Experiments

This note records the current retrieval threshold trade-offs used by `VectorSearchService`.

## Current Strategy

Vector search returns candidate chunks with distances. Lower distance means stronger similarity. The service keeps vector hits when:

- `distance <= min(MAX_VECTOR_DISTANCE_ABSOLUTE, bestDistance * MAX_VECTOR_DISTANCE_RATIO)`
- current `MAX_VECTOR_DISTANCE_RATIO = 1.15`
- current `MAX_VECTOR_DISTANCE_ABSOLUTE = 20`
- vector results are considered trustworthy when the best distance is below `MIN_VECTOR_DISTANCE_FOR_TRUST = 1.0`

If vector results are not trusted or do not fill the requested limit, retrieval falls back to:

1. PostgreSQL full-text search
2. ILIKE fuzzy matching
3. keyword array overlap

## Threshold Comparison

The table below uses a representative top-k result shape. The goal is to illustrate the precision/recall trade-off, not to claim production-wide statistical significance.

| Scenario | Distances | Relevant candidates | Ratio | Kept candidates | Recall | Precision | Notes |
| --- | --- | --- | ---: | --- | ---: | ---: | --- |
| Strict vector filter | `0.42, 0.47, 0.62, 1.40` | first 3 | `1.05` | first 1 | `0.33` | `1.00` | Too strict; misses useful context. |
| Current default | `0.42, 0.47, 0.62, 1.40` | first 3 | `1.15` | first 2 | `0.67` | `1.00` | Good precision with moderate recall. |
| Recall-heavy | `0.42, 0.47, 0.62, 1.40` | first 3 | `1.50` | first 3 | `1.00` | `1.00` | Higher recall; can admit weak matches in noisier corpora. |
| Loose filter with distractor | `0.42, 0.47, 0.62, 0.70` | first 3 | `1.80` | all 4 | `1.00` | `0.75` | More context but higher hallucination/citation risk. |

## Why Keep 1.15 For Now

`1.15` is conservative. It avoids pulling in far weaker vector matches while still allowing more than one close hit. The fallback layers recover recall when vector search is weak, and RAG eval now separately tracks:

- retrieval recall
- citation accuracy
- empty-context refusal

## Next Experiments

Use real saved notes and compare these settings:

| Experiment | Change | Expected impact |
| --- | --- | --- |
| Ratio 1.05 | lower `MAX_VECTOR_DISTANCE_RATIO` | higher precision, lower recall |
| Ratio 1.30 | increase ratio moderately | better recall, possible extra citations |
| Trust 0.8 | lower `MIN_VECTOR_DISTANCE_FOR_TRUST` | more fallback usage |
| Trust 1.2 | raise trust threshold | more vector-only answers |
| Per-language threshold | separate Chinese and English threshold observations | better handling of mixed-language notes |

The next useful step is to store experiment output as JSON from live eval runs, then compare changes in CI before release.
