import axios from 'axios';
import {
  User,
  Note,
  Conversation,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  CreateNoteRequest,
  UpdateNoteRequest,
  AskRequest,
  SearchResponse,
  SummaryResponse,
  KeywordsResponse,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authAPI = {
  login: (data: LoginRequest) =>
    api.post<LoginResponse>('/auth/login', data),
  register: (data: RegisterRequest) =>
    api.post<LoginResponse>('/auth/register', data),
  me: () => api.get<{ user: User }>('/auth/me'),
};

// Notes API
export const notesAPI = {
  list: () => api.get<{ notes: Note[] }>('/notes'),
  get: (id: number) => api.get<{ note: Note }>(`/notes/${id}`),
  create: (data: CreateNoteRequest) =>
    api.post<{ note: Note }>('/notes', data),
  update: (id: number, data: UpdateNoteRequest) =>
    api.put<{ note: Note }>(`/notes/${id}`, data),
  delete: (id: number) => api.delete(`/notes/${id}`),
  search: (query: string) =>
    api.get<SearchResponse>(`/notes/search?q=${encodeURIComponent(query)}`),
  semanticSearch: (query: string) =>
    api.get<SearchResponse>(`/notes/semantic-search?q=${encodeURIComponent(query)}`),
};

// Upload API
export const uploadAPI = {
  upload: (file: File, onProgress?: (progress: number) => void) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<{ note: Note }>('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (event) => {
        if (onProgress && event.total) {
          onProgress(Math.round((event.loaded * 100) / event.total));
        }
      },
    });
  },
};

// AI API
export const aiAPI = {
  summary: (noteId: number) =>
    api.get<SummaryResponse>(`/ai/summary/${noteId}`),
  keywords: (noteId: number) =>
    api.get<KeywordsResponse>(`/ai/keywords/${noteId}`),
  rewrite: (noteId: number, instruction?: string) =>
    api.post<{ rewritten: string }>(`/ai/rewrite/${noteId}`, { instruction }),
};

// RAG Chat API
export const ragAPI = {
  ask: (data: AskRequest) => api.post<{ answer: string; citations: Citation[] }>('/rag/ask', data),
  askStream: (data: AskRequest, onChunk: (chunk: string) => void) => {
    return new Promise<void>((resolve, reject) => {
      const eventSource = new EventSource(`${API_BASE_URL}/rag/ask-stream?question=${encodeURIComponent(data.question)}${data.conversationId ? `&conversationId=${data.conversationId}` : ''}`, {
        withCredentials: true,
      });

      eventSource.onmessage = (event) => {
        if (event.data === '[DONE]') {
          eventSource.close();
          resolve();
        } else {
          onChunk(event.data);
        }
      };

      eventSource.onerror = (error) => {
        eventSource.close();
        reject(error);
      };
    });
  },
  listConversations: () =>
    api.get<{ conversations: Conversation[] }>('/rag/conversations'),
  getConversation: (id: number) =>
    api.get<{ conversation: Conversation }>(`/rag/conversations/${id}`),
  deleteConversation: (id: number) => api.delete(`/rag/conversations/${id}`),
};

export default api;
