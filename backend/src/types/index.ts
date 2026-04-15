export interface User {
  id: number;
  email: string;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
}

export interface Note {
  id: number;
  user_id: number;
  title: string;
  content: string;
  tags: string[] | null;
  category: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Conversation {
  id: number;
  user_id: number;
  title: string;
  messages: ConversationMessage[];
  created_at: Date;
  updated_at: Date;
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

export interface SearchResult {
  note: Note;
  score: number;
}

export interface VectorSearchResult {
  id: string;
  score: number;
  metadata: {
    noteId: string;
    title: string;
    text: string;
    chunkIndex: number;
  };
}
