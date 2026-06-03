import { describe, expect, it, vi } from 'vitest';
import { getOpenAIClient } from './openai';
import { getPinecone } from './pinecone';

vi.mock('openai', () => ({
  default: vi.fn().mockImplementation((options) => ({ options })),
}));

vi.mock('@pinecone-database/pinecone', () => ({
  Pinecone: vi.fn().mockImplementation((options) => ({
    options,
    Index: vi.fn().mockImplementation((name) => ({ name })),
  })),
}));

describe('provider clients', () => {
  it('requires an OpenAI API key', () => {
    delete process.env.OPENAI_API_KEY;

    expect(() => getOpenAIClient()).toThrow('OPENAI_API_KEY is required');
  });

  it('requires Pinecone credentials', () => {
    delete process.env.PINECONE_API_KEY;
    delete process.env.PINECONE_INDEX;

    expect(() => getPinecone()).toThrow('PINECONE_API_KEY is required');
  });

  it('requires a Pinecone index name after the API key is configured', () => {
    process.env.PINECONE_API_KEY = 'test-key';
    delete process.env.PINECONE_INDEX;

    expect(() => getPinecone()).toThrow('PINECONE_INDEX is required');
  });
});
