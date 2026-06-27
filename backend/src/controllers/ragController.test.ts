import { beforeEach, describe, expect, it, vi } from 'vitest';
import { vectorSearchService } from '../services/vectorSearchService';
import { llmService } from '../services/llmService';
import { ConversationModel } from '../models/Conversation';
import { NoteModel } from '../models/Note';
import { askQuestion, reindexNotes } from './ragController';

vi.mock('../services/vectorSearchService', () => ({
  vectorSearchService: {
    reindexUserNotes: vi.fn(),
    getContextForQuestion: vi.fn(),
  },
}));

vi.mock('../services/llmService', () => ({
  llmService: {
    ragAnswer: vi.fn(),
  },
}));

vi.mock('../services/embeddingService', () => ({
  embeddingService: {
    getDefaultProviderForUser: vi.fn(),
  },
}));

vi.mock('../models/Conversation', () => ({
  ConversationModel: {
    create: vi.fn(),
    findById: vi.fn(),
    updateMessages: vi.fn(),
  },
}));

vi.mock('../models/Note', () => ({
  NoteModel: {
    findAllByUserId: vi.fn(),
  },
}));

const response = () => ({
  json: vi.fn(),
});

describe('ragController', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('reindexes only the authenticated user notes', async () => {
    vi.mocked(vectorSearchService.reindexUserNotes).mockResolvedValue(2);
    const res = response();

    await reindexNotes({ userId: 7 } as any, res as any, vi.fn());

    expect(vectorSearchService.reindexUserNotes).toHaveBeenCalledWith(7);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Reindexed 2 notes',
      count: 2,
    });
  });

  it('answers note-count questions from the database instead of retrieved snippets', async () => {
    vi.mocked(ConversationModel.findById).mockResolvedValue(null as any);
    vi.mocked(ConversationModel.create).mockResolvedValue({
      id: 99,
      user_id: 7,
      title: '我一共有多少篇笔记？',
      messages: [],
      created_at: new Date(),
      updated_at: new Date(),
    } as any);
    vi.mocked(ConversationModel.updateMessages).mockResolvedValue(undefined as any);
    vi.mocked(NoteModel.findAllByUserId).mockResolvedValue([
      { id: 1, title: 'A' },
      { id: 2, title: 'B' },
      { id: 3, title: 'C' },
      { id: 4, title: 'D' },
      { id: 5, title: 'E' },
      { id: 6, title: 'F' },
      { id: 7, title: 'G' },
    ] as any);
    const res = response();

    await askQuestion({
      userId: 7,
      body: {
        question: '我一共有多少篇笔记？',
        provider: 'demo',
        model: 'demo-chat',
        embeddingProvider: 'demo',
      },
    } as any, res as any, vi.fn());

    expect(NoteModel.findAllByUserId).toHaveBeenCalledWith(7);
    expect(vectorSearchService.getContextForQuestion).not.toHaveBeenCalled();
    expect(llmService.ragAnswer).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      answer: expect.stringContaining('7 篇笔记'),
      citations: [],
      conversationId: 99,
    }));
    expect(res.json.mock.calls[0][0].answer).toContain('A');
    expect(res.json.mock.calls[0][0].answer).toContain('G');
  });
});
