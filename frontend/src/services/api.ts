import axios from 'axios';
import { AskResponse, Conversation, Note, NoteSummary, User } from '../types';
import { encryptWithPublicKey } from '../utils/requestEncryption';

export const resolveApiBaseUrl = (configuredUrl?: string, isProduction = false) => {
  if (!configuredUrl) {
    return '/api';
  }

  if (isProduction && /^http:\/\//i.test(configuredUrl)) {
    return '/api';
  }

  if (isProduction && /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?(\/|$)/i.test(configuredUrl)) {
    return '/api';
  }

  return configuredUrl;
};

const API_BASE_URL = resolveApiBaseUrl((import.meta as any).env.VITE_API_URL, Boolean((import.meta as any).env.PROD));

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

const getCookie = (name: string) => document.cookie
  .split(';')
  .map((part) => part.trim())
  .find((part) => part.startsWith(`${name}=`))
  ?.slice(name.length + 1);

api.interceptors.request.use((config) => {
  const method = (config.method || 'get').toLowerCase();
  if (['post', 'put', 'patch', 'delete'].includes(method)) {
    const csrfToken = getCookie('csrf_token');
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = decodeURIComponent(csrfToken);
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isAuthProbe = error.config?.url?.includes('/auth/me');
      const isAuthPage = error.config?.url?.includes('/auth/login') || error.config?.url?.includes('/auth/register');
      if (!isAuthPage && !isAuthProbe) {
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
  source?: 'env' | 'database' | 'none';
}

interface LLMConfig {
  provider: string;
  model: string;
}

let publicEncryptionKey: string | null = null;

const getPublicEncryptionKey = async () => {
  if (publicEncryptionKey) {
    return publicEncryptionKey;
  }

  const response = await api.get<{ publicKey: string }>('/security/public-key');
  publicEncryptionKey = response.data.publicKey;
  return publicEncryptionKey;
};

const encryptedField = async (fieldName: string, value: string) => {
  const publicKey = await getPublicEncryptionKey();
  const encryptedValue = await encryptWithPublicKey(value, publicKey);
  const encryptedName = `encrypted${fieldName.charAt(0).toUpperCase()}${fieldName.slice(1)}`;

  return {
    [encryptedName]: encryptedValue,
  };
};

const getLLMConfig = (): LLMConfig => {
  return {
    provider: localStorage.getItem('llm_provider') || 'demo',
    model: localStorage.getItem('llm_model') || 'demo-chat',
  };
};

export const authAPI = {
  sendVerificationCode: (email: string) =>
    api.post<{ message: string; devCode?: string }>('/auth/verification-code', { email }),
  sendPasswordResetCode: (email: string) =>
    api.post<{ message: string; devCode?: string }>('/auth/password-reset-code', { email }),
  login: async (data: { email: string; password: string }) =>
    api.post<{ user: User }>('/auth/login', {
      email: data.email,
      ...(await encryptedField('password', data.password)),
    }),
  resetPassword: async (data: { email: string; password: string; verificationCode: string }) =>
    api.post<{ user: User }>('/auth/reset-password', {
      email: data.email,
      verificationCode: data.verificationCode,
      ...(await encryptedField('password', data.password)),
    }),
  register: async (data: { email: string; password: string; verificationCode: string }) =>
    api.post<{ user: User }>('/auth/register', {
      email: data.email,
      verificationCode: data.verificationCode,
      ...(await encryptedField('password', data.password)),
    }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get<{ user: User }>('/auth/me'),
};

export const notesAPI = {
  list: () => api.get<{ notes: NoteSummary[] }>('/notes'),
  get: (id: number) => api.get<{ note: Note }>('/notes/' + id),
  create: (data: Partial<Note>) => api.post<{ note: Note }>('/notes', data),
  update: (id: number, data: Partial<Note>) => api.put<{ note: Note }>('/notes/' + id, data),
  delete: (id: number) => api.delete('/notes/' + id),
};

export const attachmentsAPI = {
  uploadNoteImage: (noteId: number, file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post<{ attachment: { id: number }; url: string }>(
      `/notes/${noteId}/images`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
  },
};

export const llmAPI = {
  getProviders: () => api.get<{ providers: LLMProvider[]; allSupportedProviders: LLMProvider[] }>('/llm/providers'),
  getModels: (provider?: string) => api.get<{ models: LLMModel[] }>(provider ? `/llm/models/${provider}` : '/llm/models'),
  getAllModels: () => api.get<{ models: LLMModel[] }>('/llm/models'),
  testConnection: (provider: string, model: string) => api.post('/llm/test', { provider, model }),
  generateSummary: (content: string, provider?: string, model?: string, noteId?: number) =>
    api.post<{ summary: string; cached?: boolean }>('/llm/summary', { content, provider, model, noteId }),
  extractKeywords: (content: string, provider?: string, model?: string) =>
    api.post<{ keywords: string[] }>('/llm/keywords', { content, provider, model }),
  rewriteNote: (content: string, instruction?: string, provider?: string, model?: string) =>
    api.post<{ rewritten: string }>('/llm/rewrite', { content, instruction, provider, model }),
  getApiKeys: () => api.get<{ keys: ApiKeyInfo[] }>('/llm/keys'),
  saveApiKey: async (provider: string, apiKey: string) =>
    api.post<{ success: boolean; message: string }>('/llm/keys', {
      provider,
      ...(await encryptedField('apiKey', apiKey)),
    }),
  deleteApiKey: (provider: string) =>
    api.delete<{ success: boolean; message: string }>('/llm/keys/' + provider),
};

export const embeddingAPI = {
  getProviders: () => api.get<{ providers: EmbeddingProvider[]; allSupportedProviders: EmbeddingProvider[] }>('/embedding/providers'),
  getModels: () => api.get<{ models: EmbeddingModel[] }>('/embedding/models'),
  testConnection: (provider: string, model: string) => api.post('/embedding/test', { provider, model }),
  getApiKeys: () => api.get<{ keys: ApiKeyInfo[] }>('/embedding/keys'),
  saveApiKey: async (provider: string, apiKey: string) =>
    api.post<{ success: boolean; message: string }>('/embedding/keys', {
      provider,
      ...(await encryptedField('apiKey', apiKey)),
    }),
  deleteApiKey: (provider: string) =>
    api.delete<{ success: boolean; message: string }>('/embedding/keys/' + provider),
};

export const aiAPI = {
  summary: (_noteId: number, content?: string) => {
    const config = getLLMConfig();
    return llmAPI.generateSummary(content || '', config.provider, config.model, _noteId);
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
    api.post<AskResponse>('/rag/ask', data),
  listConversations: () => api.get<{ conversations: Conversation[] }>('/rag/conversations'),
  getConversation: (id: number) => api.get<{ conversation: Conversation }>('/rag/conversations/' + id),
  deleteConversation: (id: number) => api.delete('/rag/conversations/' + id),
};

export default api;
