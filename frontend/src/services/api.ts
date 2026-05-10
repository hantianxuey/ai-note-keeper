import axios from 'axios';
import { Note, User } from '../types';

const API_BASE_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = 'Bearer ' + token;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isAuthPage = error.config?.url?.includes('/auth/login') || error.config?.url?.includes('/auth/register');
      if (!isAuthPage) {
        localStorage.removeItem('token');
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export interface LLMProvider {
  key: string;
  name: string;
  models: string[];
  baseURL?: string;
  apiKeyEnv?: string;
  hasKey?: boolean;
  isActive?: boolean;
}

export interface EmbeddingProvider {
  key: string;
  name: string;
  models: string[];
  baseURL?: string;
  apiKeyEnv?: string;
  hasKey?: boolean;
  isActive?: boolean;
}

export interface LLMModel {
  provider: string;
  model: string;
  name: string;
  maxTokens?: number;
}

export interface EmbeddingModel {
  provider: string;
  model: string;
  providerName: string;
}

export interface ApiKeyInfo {
  provider: string;
  name: string;
  hasKey: boolean;
  source?: 'env' | 'database';
}

interface LLMConfig {
  provider: string;
  model: string;
}

const getLLMConfig = (): LLMConfig => {
  return {
    provider: localStorage.getItem('llm_provider') || 'demo',
    model: localStorage.getItem('llm_model') || 'demo-chat',
  };
};

export const authAPI = {
  login: (data: { email: string; password: string }) => api.post<{ user: User; token: string }>('/auth/login', data),
  register: (data: { email: string; password: string }) => api.post<{ user: User; token: string }>('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get<{ user: User }>('/auth/me'),
};

export const notesAPI = {
  list: () => api.get<{ notes: Note[] }>('/notes'),
  get: (id: number) => api.get<{ note: Note }>('/notes/' + id),
  create: (data: Partial<Note>) => api.post<{ note: Note }>('/notes', data),
  update: (id: number, data: Partial<Note>) => api.put<{ note: Note }>('/notes/' + id, data),
  delete: (id: number) => api.delete('/notes/' + id),
};

export const llmAPI = {
  getProviders: () => api.get<{ providers: LLMProvider[]; allSupportedProviders: LLMProvider[] }>('/llm/providers'),
  getModels: (provider?: string) => api.get<{ models: LLMModel[] }>(provider ? `/llm/models/${provider}` : '/llm/models'),
  getAllModels: () => api.get<{ models: LLMModel[] }>('/llm/models'),
  testConnection: (provider: string, model: string) => api.post('/llm/test', { provider, model }),
  generateSummary: (content: string, provider?: string, model?: string) =>
    api.post<{ summary: string }>('/llm/summary', { content, provider, model }),
  extractKeywords: (content: string, provider?: string, model?: string) =>
    api.post<{ keywords: string[] }>('/llm/keywords', { content, provider, model }),
  rewriteNote: (content: string, instruction?: string, provider?: string, model?: string) =>
    api.post<{ rewritten: string }>('/llm/rewrite', { content, instruction, provider, model }),
  getApiKeys: () => api.get<{ keys: ApiKeyInfo[] }>('/llm/keys'),
  saveApiKey: (provider: string, apiKey: string) =>
    api.post<{ success: boolean; message: string }>('/llm/keys', { provider, apiKey }),
  deleteApiKey: (provider: string) =>
    api.delete<{ success: boolean; message: string }>('/llm/keys/' + provider),
};

export const embeddingAPI = {
  getProviders: () => api.get<{ providers: EmbeddingProvider[]; allSupportedProviders: EmbeddingProvider[] }>('/embedding/providers'),
  getModels: () => api.get<{ models: EmbeddingModel[] }>('/embedding/models'),
  testConnection: (provider: string, model: string) => api.post('/embedding/test', { provider, model }),
  getApiKeys: () => api.get<{ keys: ApiKeyInfo[] }>('/embedding/keys'),
  saveApiKey: (provider: string, apiKey: string) =>
    api.post<{ success: boolean; message: string }>('/embedding/keys', { provider, apiKey }),
  deleteApiKey: (provider: string) =>
    api.delete<{ success: boolean; message: string }>('/embedding/keys/' + provider),
};

export const aiAPI = {
  summary: (_noteId: number, content?: string) => {
    const config = getLLMConfig();
    return llmAPI.generateSummary(content || '', config.provider, config.model);
  },
  keywords: (_noteId: number, content?: string) => {
    const config = getLLMConfig();
    return llmAPI.extractKeywords(content || '', config.provider, config.model);
  },
  rewrite: (_noteId: number, instruction?: string, content?: string) => {
    const config = getLLMConfig();
    return llmAPI.rewriteNote(content || '', instruction, config.provider, config.model);
  },
};

export const ragAPI = {
  ask: (data: { question: string; conversationId?: number; provider?: string; model?: string; embeddingProvider?: string }) =>
    api.post('/rag/ask', data),
  listConversations: () => api.get('/rag/conversations'),
  getConversation: (id: number) => api.get('/rag/conversations/' + id),
  deleteConversation: (id: number) => api.delete('/rag/conversations/' + id),
};

export default api;
