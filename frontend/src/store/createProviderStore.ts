import { create } from 'zustand';

export interface ProviderOption {
  key: string;
  name: string;
  models: string[];
}

export interface ProviderModel {
  provider: string;
  model: string;
}

interface ProviderConfig {
  provider: string;
  model: string;
}

export interface ProviderStoreState<TProvider extends ProviderOption, TModel extends ProviderModel> {
  providers: TProvider[];
  allSupportedProviders: TProvider[];
  models: TModel[];
  config: ProviderConfig;
  isLoading: boolean;
  isTesting: boolean;
  testResult: { success: boolean; message: string } | null;
  loadProviders: () => Promise<void>;
  loadModels: () => Promise<void>;
  setConfig: (config: Partial<ProviderConfig>) => void;
  testConnection: (provider: string, model: string) => Promise<boolean>;
}

interface ProviderStoreOptions<TProvider extends ProviderOption, TModel extends ProviderModel> {
  storagePrefix: string;
  defaultProvider: string;
  defaultModel: string;
  loadProviders: () => Promise<{ providers: TProvider[]; allSupportedProviders: TProvider[] }>;
  loadModels: () => Promise<TModel[]>;
  testConnection: (provider: string, model: string) => Promise<{ success: boolean; message: string }>;
  logLabel: string;
}

export const createProviderStore = <
  TProvider extends ProviderOption,
  TModel extends ProviderModel
>(
  options: ProviderStoreOptions<TProvider, TModel>
) => create<ProviderStoreState<TProvider, TModel>>((set, get) => ({
  providers: [],
  allSupportedProviders: [],
  models: [],
  config: {
    provider: localStorage.getItem(`${options.storagePrefix}_provider`) || options.defaultProvider,
    model: localStorage.getItem(`${options.storagePrefix}_model`) || options.defaultModel,
  },
  isLoading: false,
  isTesting: false,
  testResult: null,

  loadProviders: async () => {
    set({ isLoading: true });
    try {
      set(await options.loadProviders());
    } catch (error) {
      console.error(`Failed to load ${options.logLabel} providers:`, error);
    } finally {
      set({ isLoading: false });
    }
  },

  loadModels: async () => {
    set({ isLoading: true });
    try {
      set({ models: await options.loadModels() });
    } catch (error) {
      console.error(`Failed to load ${options.logLabel} models:`, error);
    } finally {
      set({ isLoading: false });
    }
  },

  setConfig: (config: Partial<ProviderConfig>) => {
    const currentConfig = get().config;
    const newConfig = { ...currentConfig, ...config };

    if (config.provider && config.provider !== currentConfig.provider) {
      const nextModel = selectDefaultModel(
        config.provider,
        get().models,
        get().allSupportedProviders
      );
      if (nextModel) {
        newConfig.model = nextModel;
      }
      localStorage.setItem(`${options.storagePrefix}_provider`, newConfig.provider);
      localStorage.setItem(`${options.storagePrefix}_model`, newConfig.model);
    } else if (config.model) {
      localStorage.setItem(`${options.storagePrefix}_model`, config.model);
    }

    set({ config: newConfig });
  },

  testConnection: async (provider: string, model: string) => {
    set({ isTesting: true, testResult: null });
    try {
      const result = await options.testConnection(provider, model);
      set({ testResult: result });
      return result.success;
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

const selectDefaultModel = <TProvider extends ProviderOption, TModel extends ProviderModel>(
  provider: string,
  models: TModel[],
  allSupportedProviders: TProvider[]
) => {
  const listedModel = models.find((model) => model.provider === provider);
  if (listedModel) {
    return listedModel.model;
  }

  return allSupportedProviders.find((item) => item.key === provider)?.models[0];
};
