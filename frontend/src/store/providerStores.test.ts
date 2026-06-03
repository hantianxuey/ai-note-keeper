import { beforeEach, describe, expect, it, vi } from 'vitest';
import { embeddingAPI, llmAPI } from '../services/api';

vi.mock('../services/api', () => ({
  llmAPI: {
    getProviders: vi.fn(),
    getAllModels: vi.fn(),
    testConnection: vi.fn(),
  },
  embeddingAPI: {
    getProviders: vi.fn(),
    getModels: vi.fn(),
    testConnection: vi.fn(),
  },
}));

describe('provider store wrappers', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
    vi.resetModules();
  });

  it('loads and tests LLM providers', async () => {
    vi.mocked(llmAPI.getProviders).mockResolvedValue({
      data: { providers: [], allSupportedProviders: [] },
    } as any);
    vi.mocked(llmAPI.getAllModels).mockResolvedValue({ data: { models: [] } } as any);
    vi.mocked(llmAPI.testConnection).mockResolvedValue({
      data: { provider: 'demo', model: 'demo-chat', response: 'OK' },
    } as any);
    const { useLLMStore } = await import('./useLLMStore');

    await useLLMStore.getState().loadProviders();
    await useLLMStore.getState().loadModels();
    await expect(useLLMStore.getState().testConnection('demo', 'demo-chat')).resolves.toBe(true);

    expect(llmAPI.getProviders).toHaveBeenCalled();
    expect(llmAPI.getAllModels).toHaveBeenCalled();
    expect(llmAPI.testConnection).toHaveBeenCalledWith('demo', 'demo-chat');
    expect(useLLMStore.getState().testResult?.message).toContain('demo:demo-chat');
  });

  it('loads and tests embedding providers', async () => {
    vi.mocked(embeddingAPI.getProviders).mockResolvedValue({
      data: { providers: [], allSupportedProviders: [] },
    } as any);
    vi.mocked(embeddingAPI.getModels).mockResolvedValue({ data: { models: [] } } as any);
    vi.mocked(embeddingAPI.testConnection).mockResolvedValue({
      data: { success: true, message: 'embedding ok' },
    } as any);
    const { useEmbeddingStore } = await import('./useEmbeddingStore');

    await useEmbeddingStore.getState().loadProviders();
    await useEmbeddingStore.getState().loadModels();
    await expect(useEmbeddingStore.getState().testConnection('qwen', 'text-embedding-v4')).resolves.toBe(true);

    expect(embeddingAPI.getProviders).toHaveBeenCalled();
    expect(embeddingAPI.getModels).toHaveBeenCalled();
    expect(embeddingAPI.testConnection).toHaveBeenCalledWith('qwen', 'text-embedding-v4');
    expect(useEmbeddingStore.getState().testResult).toEqual({
      success: true,
      message: 'embedding ok',
    });
  });
});
