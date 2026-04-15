export interface User {
  id: number;
  email: string;
}

export interface Note {
  id: number;
  user_id: number;
  title: string;
  content: string;
  tags: string[] | null;
  category: string | null;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: number;
  user_id: number;
  title: string;
  messages: ConversationMessage[];
  created_at: string;
  updated_at: string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  timestamp: number;
}

export interface Citation {
  noteId: number;
  noteTitle: string;
  snippet: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface CreateNoteRequest {
  title: string;
  content: string;
  tags?: string[];
  category?: string;
}

export interface UpdateNoteRequest extends CreateNoteRequest {}

export interface AskRequest {
  question: string;
  conversationId?: number;
}

export interface SearchResponse {
  results: Note[];
}

export interface SummaryResponse {
  summary: string;
}

export interface KeywordsResponse {
  keywords: string[];
}
