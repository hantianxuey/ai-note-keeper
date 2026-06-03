import { embeddingAPI, EmbeddingModel, EmbeddingProvider } from '../services/api';
import { createProviderStore } from './createProviderStore';

export const useEmbeddingStore = createProviderStore<EmbeddingProvider, EmbeddingModel>({
  storagePrefix: 'embedding',
  defaultProvider: 'qwen',
  defaultModel: 'text-embedding-v4',
  logLabel: 'embedding',
  loadProviders: async () => {
    const response = await embeddingAPI.getProviders();
    return response.data;
  },
  loadModels: async () => {
    const response = await embeddingAPI.getModels();
    return response.data.models;
  },
  testConnection: async (provider: string, model: string) => {
    const response = await embeddingAPI.testConnection(provider, model);
    return {
      success: response.data.success,
      message: response.data.message,
    };
  },
});
