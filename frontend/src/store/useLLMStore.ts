import { create } from 'zustand';
import { llmAPI, LLMProvider, LLMModel } from '../services/api';

interface LLMConfig {
  provider: string;
  model: string;
}

interface LLMState {
  providers: LLMProvider[];
  allSupportedProviders: LLMProvider[];
  models: LLMModel[];
  config: LLMConfig;
  isLoading: boolean;
  isTesting: boolean;
  testResult: { success: boolean; message: string } | null;
  loadProviders: () => Promise<void>;
  loadModels: () => Promise<void>;
  setConfig: (config: Partial<LLMConfig>) => void;
  testConnection: (provider: string, model: string) => Promise<boolean>;
}

export const useLLMStore = create<LLMState>((set, get) => ({
  providers: [],
  allSupportedProviders: [],
  models: [],
  config: {
    provider: localStorage.getItem('llm_provider') || 'demo',
    model: localStorage.getItem('llm_model') || 'demo-chat',
  },
  isLoading: false,
  isTesting: false,
  testResult: null,

  loadProviders: async () => {
    set({ isLoading: true });
    try {
      const response = await llmAPI.getProviders();
      set({
        providers: response.data.providers,
        allSupportedProviders: response.data.allSupportedProviders,
      });
    } catch (error) {
      console.error('Failed to load providers:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  loadModels: async () => {
    set({ isLoading: true });
    try {
      const response = await llmAPI.getAllModels();
      set({ models: response.data.models });
    } catch (error) {
      console.error('Failed to load models:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  setConfig: (config: Partial<LLMConfig>) => {
    const currentConfig = get().config;
    const allSupportedProviders = get().allSupportedProviders;
    const models = get().models;
    
    let newConfig = { ...currentConfig, ...config };
    
    // 如果改变了 provider，确保 model 是该 provider 的有效模型
    if (config.provider && config.provider !== currentConfig.provider) {
      const modelsForProvider = models.filter(m => m.provider === config.provider);
      if (modelsForProvider.length > 0) {
        // 找到该 provider 的第一个模型
        newConfig.model = modelsForProvider[0].model;
      } else {
        // 找不到该 provider 的模型，查找 allSupportedProviders 中的默认模型
        const providerInfo = allSupportedProviders.find(p => p.key === config.provider);
        if (providerInfo?.models && providerInfo.models.length > 0) {
          newConfig.model = providerInfo.models[0];
        }
      }
      localStorage.setItem('llm_provider', newConfig.provider);
      localStorage.setItem('llm_model', newConfig.model);
    } else if (config.model) {
      // 只改变了 model
      localStorage.setItem('llm_model', config.model);
    }
    
    set({ config: newConfig });
  },

  testConnection: async (provider: string, model: string) => {
    set({ isTesting: true, testResult: null });
    try {
      const response = await llmAPI.testConnection(provider, model);
      const providerName = response.data.provider || provider;
      const modelName = response.data.model || model;
      const responseContent = response.data.response || 'Success';
      
      set({
        testResult: {
          success: true,
          message: 'OK - ' + providerName + ':' + modelName + ' - "' + responseContent + '"',
        },
      });
      return true;
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
