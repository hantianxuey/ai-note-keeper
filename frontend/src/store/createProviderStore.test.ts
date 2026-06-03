import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createProviderStore } from './createProviderStore';

const providers = [
  { key: 'demo', name: 'Demo', models: ['demo-chat'] },
  { key: 'openai', name: 'OpenAI', models: ['gpt-4o'] },
];

const models = [
  { provider: 'openai', model: 'gpt-4o' },
  { provider: 'demo', model: 'demo-chat' },
];

const makeStore = () => createProviderStore({
  storagePrefix: 'test',
  defaultProvider: 'demo',
  defaultModel: 'demo-chat',
  logLabel: 'test',
  loadProviders: vi.fn().mockResolvedValue({
    providers: [providers[0]],
    allSupportedProviders: providers,
  }),
  loadModels: vi.fn().mockResolvedValue(models),
  testConnection: vi.fn().mockResolvedValue({
    success: true,
    message: 'ok',
  }),
});

describe('createProviderStore', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('loads providers and models', async () => {
    const store = makeStore();

    await store.getState().loadProviders();
    await store.getState().loadModels();

    expect(store.getState().providers).toEqual([providers[0]]);
    expect(store.getState().allSupportedProviders).toEqual(providers);
    expect(store.getState().models).toEqual(models);
    expect(store.getState().isLoading).toBe(false);
  });

  it('switches to the first listed model when provider changes', () => {
    const store = makeStore();
    store.setState({ models, allSupportedProviders: providers });

    store.getState().setConfig({ provider: 'openai' });

    expect(store.getState().config).toEqual({ provider: 'openai', model: 'gpt-4o' });
    expect(localStorage.getItem('test_provider')).toBe('openai');
    expect(localStorage.getItem('test_model')).toBe('gpt-4o');
  });

  it('uses provider metadata as a fallback default model', () => {
    const store = makeStore();
    store.setState({ allSupportedProviders: providers });

    store.getState().setConfig({ provider: 'openai' });

    expect(store.getState().config.model).toBe('gpt-4o');
  });

  it('tracks successful and failed connection tests', async () => {
    const store = makeStore();

    await expect(store.getState().testConnection('demo', 'demo-chat')).resolves.toBe(true);
    expect(store.getState().testResult).toEqual({ success: true, message: 'ok' });

    const failingStore = createProviderStore({
      storagePrefix: 'fail',
      defaultProvider: 'demo',
      defaultModel: 'demo-chat',
      logLabel: 'test',
      loadProviders: vi.fn(),
      loadModels: vi.fn(),
      testConnection: vi.fn().mockRejectedValue({ response: { data: { message: 'bad key' } } }),
    });

    await expect(failingStore.getState().testConnection('demo', 'demo-chat')).resolves.toBe(false);
    expect(failingStore.getState().testResult).toEqual({
      success: false,
      message: 'Connection failed: bad key',
    });
  });
});
