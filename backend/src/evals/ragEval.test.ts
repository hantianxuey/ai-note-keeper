import { describe, expect, it } from 'vitest';
import { scoreRagEvalResults } from './ragEval';

describe('scoreRagEvalResults', () => {
  it('calculates retrieval, citation, and refusal quality', () => {
    const summary = scoreRagEvalResults([
      {
        name: 'deployment rollback',
        expectedCitationTitle: 'Deployment Runbook',
        answer: 'Use smoke tests before promoting a release.',
        citations: [
          { noteTitle: 'Deployment Runbook' },
          { noteTitle: 'Security Notes' },
        ],
      },
      {
        name: 'rag eval',
        expectedCitationTitle: 'RAG Quality Notes',
        answer: 'Use recall and citation hit rate.',
        citations: [
          { noteTitle: 'RAG Quality Notes' },
          { noteTitle: 'Observability Notes' },
        ],
      },
      {
        name: 'empty context',
        expectRefusal: true,
        answer: 'I could not find reliable information in the knowledge base to answer this question.',
        citations: [],
      },
    ], {
      minRetrievalRecall: 1,
      minCitationAccuracy: 0.5,
      minEmptyContextRefusalRate: 1,
    });

    expect(summary.totalCases).toBe(3);
    expect(summary.relevantCases).toBe(2);
    expect(summary.retrievalHits).toBe(2);
    expect(summary.retrievalRecall).toBe(1);
    expect(summary.citationAccuracy).toBe(0.5);
    expect(summary.emptyContextCases).toBe(1);
    expect(summary.emptyContextRefusals).toBe(1);
    expect(summary.emptyContextRefusalRate).toBe(1);
    expect(summary.passed).toBe(true);
  });

  it('fails when any quality gate is below threshold', () => {
    const summary = scoreRagEvalResults([
      {
        name: 'rag eval',
        expectedCitationTitle: 'RAG Quality Notes',
        answer: 'Use recall and citation hit rate.',
        citations: [{ noteTitle: 'Observability Notes' }],
      },
      {
        name: 'empty context',
        expectRefusal: true,
        answer: 'Here is an unsupported answer.',
        citations: [],
      },
    ], {
      minRetrievalRecall: 1,
      minCitationAccuracy: 1,
      minEmptyContextRefusalRate: 1,
    });

    expect(summary.retrievalRecall).toBe(0);
    expect(summary.citationAccuracy).toBe(0);
    expect(summary.emptyContextRefusalRate).toBe(0);
    expect(summary.passed).toBe(false);
  });
});
