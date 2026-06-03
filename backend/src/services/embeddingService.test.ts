import { describe, expect, it } from 'vitest';
import { resolveChromaClientArgs, resolveChromaUrl } from './embeddingService';

describe('resolveChromaUrl', () => {
  it('uses CHROMA_URL when it is configured', () => {
    expect(resolveChromaUrl({ CHROMA_URL: 'http://chroma:8000/' })).toBe('http://chroma:8000');
  });

  it('falls back to the local ChromaDB URL', () => {
    expect(resolveChromaUrl({})).toBe('http://localhost:8000');
  });
});

describe('resolveChromaClientArgs', () => {
  it('converts the configured URL into Chroma client connection options', () => {
    expect(resolveChromaClientArgs('https://chroma.example:8443')).toEqual({
      host: 'chroma.example',
      port: 8443,
      ssl: true,
    });
  });
});
