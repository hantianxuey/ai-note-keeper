export interface User {
  id: number;
  email: string;
}

export interface Note {
  id: number;
  user_id: number;
  title: string;
  content: string;
  markdown_content?: string | null;
  tags: string[] | null;
  category: string | null;
  ai_summary?: string | null;
  ai_summary_content_hash?: string | null;
  ai_summary_generated_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface NoteSummary {
  id: number;
  user_id: number;
  title: string;
  preview?: string;
  content?: string;
  markdown_content?: string | null;
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
  sourceIndex?: number;
  searchSource?: 'vector' | 'fulltext' | 'ilike' | 'keyword' | 'demo';
  rank?: number;
  score?: number;
}

export type RetrievalStatus = 'ok' | 'empty' | 'error';

export interface RetrievalMetadata {
  status: RetrievalStatus;
  message?: string;
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
  provider?: string;
  model?: string;
  embeddingProvider?: string;
}

export interface AskResponse {
  answer: string;
  citations: Citation[];
  conversationId: number;
  retrieval?: RetrievalMetadata;
  metadata?: {
    provider: string;
    model: string;
    embeddingProvider: string;
    citationCount: number;
  };
}

export interface SearchResponse {
  results: Note[];
}

export interface SummaryResponse {
  summary: string;
  cached?: boolean;
}

export interface KeywordsResponse {
  keywords: string[];
}
