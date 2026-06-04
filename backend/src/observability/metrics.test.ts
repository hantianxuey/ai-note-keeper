import { describe, expect, it } from 'vitest';
import { routeLabelForMetrics } from './metrics';

describe('routeLabelForMetrics', () => {
  it('normalizes dynamic ids and strips query strings', () => {
    expect(routeLabelForMetrics('/api/notes/42?include=all')).toBe('/api/notes/:id');
    expect(routeLabelForMetrics('/api/rag/conversations/123')).toBe('/api/rag/conversations/:id');
  });

  it('uses root for blank paths', () => {
    expect(routeLabelForMetrics('')).toBe('/');
  });
});
