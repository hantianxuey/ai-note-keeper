import { create } from 'zustand';
import { embeddingAPI, EmbeddingProvider, EmbeddingModel } from '../services/api';

interface EmbeddingConfig {
  provider: string;
  model: string;
}

interface EmbeddingState {
  providers: EmbeddingProvider[];
  allSupportedProviders: EmbeddingProvider[];
  models: EmbeddingModel[];
  config: EmbeddingConfig;
  isLoading: boolean;
  isTesting: boolean;
  testResult: { success: boolean; message: string } | null;
  loadProviders: () => Promise<void>;
  loadModels: () => Promise<void>;
  setConfig: (config: Partial<EmbeddingConfig>) => void;
  testConnection: (provider: string, model: string) => Promise<boolean>;
}

export const useEmbeddingStore = create<EmbeddingState>((set, get) => ({
  providers: [],
  allSupportedProviders: [],
  models: [],
  config: {
    provider: localStorage.getItem('embedding_provider') || 'qwen',
    model: localStorage.getItem('embedding_model') || 'text-embedding-v4',
  },
  isLoading: false,
  isTesting: false,
  testResult: null,

  loadProviders: async () => {
    set({ isLoading: true });
    try {
      const response = await embeddingAPI.getProviders();
      set({
        providers: response.data.providers,
        allSupportedProviders: response.data.allSupportedProviders,
      });
    } catch (error) {
      console.error('Failed to load embedding providers:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  loadModels: async () => {
    set({ isLoading: true });
    try {
      const response = await embeddingAPI.getModels();
      set({ models: response.data.models });
    } catch (error) {
      console.error('Failed to load embedding models:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  setConfig: (config: Partial<EmbeddingConfig>) => {
    const currentConfig = get().config;
    const allSupportedProviders = get().allSupportedProviders;

    let newConfig = { ...currentConfig, ...config };

    if (config.provider && config.provider !== currentConfig.provider) {
      const providerInfo = allSupportedProviders.find((p) => p.key === config.provider);
      if (providerInfo?.models && providerInfo.models.length > 0) {
        newConfig.model = providerInfo.models[0];
      }
      localStorage.setItem('embedding_provider', newConfig.provider);
      localStorage.setItem('embedding_model', newConfig.model);
    } else if (config.model) {
      localStorage.setItem('embedding_model', config.model);
    }

    set({ config: newConfig });
  },

  testConnection: async (provider: string, model: string) => {
    set({ isTesting: true, testResult: null });
    try {
      const response = await embeddingAPI.testConnection(provider, model);
      set({
        testResult: {
          success: response.data.success,
          message: response.data.message,
        },
      });
      return response.data.success;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Unknown error';
      set({
        testResult: {
          success: false,
          message: 'Connection failed: ' + errorMessage,
        },
      });
      return false;
    } finally {
      set({ isTesting: false });
    }
  },
}));
