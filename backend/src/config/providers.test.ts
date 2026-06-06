import { describe, expect, it, vi } from 'vitest';
import { getOpenAIClient } from './openai';

vi.mock('openai', () => ({
  default: vi.fn().mockImplementation((options) => ({ options })),
}));

describe('provider clients', () => {
  it('requires an OpenAI API key', () => {
    delete process.env.OPENAI_API_KEY;

    expect(() => getOpenAIClient()).toThrow('OPENAI_API_KEY is required');
  });
});
