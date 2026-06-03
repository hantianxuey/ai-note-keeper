import { llmAPI, LLMModel, LLMProvider } from '../services/api';
import { createProviderStore } from './createProviderStore';

export const useLLMStore = createProviderStore<LLMProvider, LLMModel>({
  storagePrefix: 'llm',
  defaultProvider: 'demo',
  defaultModel: 'demo-chat',
  logLabel: 'LLM',
  loadProviders: async () => {
    const response = await llmAPI.getProviders();
    return response.data;
  },
  loadModels: async () => {
    const response = await llmAPI.getAllModels();
    return response.data.models;
  },
  testConnection: async (provider: string, model: string) => {
    const response = await llmAPI.testConnection(provider, model);
    const providerName = response.data.provider || provider;
    const modelName = response.data.model || model;
    const content = response.data.response || 'Success';

    return {
      success: true,
      message: `OK - ${providerName}:${modelName} - "${content}"`,
    };
  },
});
