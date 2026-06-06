import { describe, expect, it } from 'vitest';
import { metricsRegistry, recordRagRetrieval, recordSecurityEvent, routeLabelForMetrics } from './metrics';

describe('routeLabelForMetrics', () => {
  it('normalizes dynamic ids and strips query strings', () => {
    expect(routeLabelForMetrics('/api/notes/42?include=all')).toBe('/api/notes/:id');
    expect(routeLabelForMetrics('/api/rag/conversations/123')).toBe('/api/rag/conversations/:id');
  });

  it('uses root for blank paths', () => {
    expect(routeLabelForMetrics('')).toBe('/');
  });
});

describe('recordRagRetrieval', () => {
  it('exports retrieval duration, result count, and top score metrics', async () => {
    recordRagRetrieval('demo', 'ok', 0.12, { vector: 2, fulltext: 1 }, { vector: 0.91 });

    const metrics = await metricsRegistry.metrics();

    expect(metrics).toContain('ai_note_keeper_rag_retrieval_duration_seconds');
    expect(metrics).toContain('ai_note_keeper_rag_retrieval_results_total{provider="demo",source="vector"} 2');
    expect(metrics).toContain('ai_note_keeper_rag_retrieval_top_score{provider="demo",source="vector"} 0.91');
  });
});

describe('recordSecurityEvent', () => {
  it('exports security event counters without high-cardinality labels', async () => {
    recordSecurityEvent('auth.login', 'success');

    const metrics = await metricsRegistry.metrics();

    expect(metrics).toContain('ai_note_keeper_security_events_total{event="auth.login",outcome="success"} 1');
  });
});
