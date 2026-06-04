import { describe, expect, it } from 'vitest';
import { scoreRagEvalResults } from './ragEval';

describe('scoreRagEvalResults', () => {
  it('calculates citation hit rate and pass status', () => {
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
        citations: [{ noteTitle: 'Observability Notes' }],
      },
    ], {
      minCitationHitRate: 0.5,
    });

    expect(summary.totalCases).toBe(2);
    expect(summary.citationHits).toBe(1);
    expect(summary.citationHitRate).toBe(0.5);
    expect(summary.passed).toBe(true);
  });

  it('fails when citation quality is below the threshold', () => {
    const summary = scoreRagEvalResults([
      {
        name: 'rag eval',
        expectedCitationTitle: 'RAG Quality Notes',
        answer: 'Use recall and citation hit rate.',
        citations: [{ noteTitle: 'Observability Notes' }],
      },
    ], {
      minCitationHitRate: 1,
    });

    expect(summary.citationHitRate).toBe(0);
    expect(summary.passed).toBe(false);
  });
});
