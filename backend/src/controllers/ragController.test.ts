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

  it('summarizes the note whose title is named in a Chinese prompt', async () => {
    vi.mocked(ConversationModel.findById).mockResolvedValue(null as any);
    vi.mocked(ConversationModel.create).mockResolvedValue({
      id: 100,
      user_id: 7,
      title: '总结笔记面经1',
      messages: [],
      created_at: new Date(),
      updated_at: new Date(),
    } as any);
    vi.mocked(ConversationModel.updateMessages).mockResolvedValue(undefined as any);
    vi.mocked(NoteModel.findAllByUserId).mockResolvedValue([
      { id: 18, title: '面经1', content: 'Java 面试题和项目经历复盘。' },
      { id: 2, title: 'OD wiki', content: 'OD content' },
      { id: 7, title: '谈判笔记', content: 'Negotiation content' },
    ] as any);
    vi.mocked(llmService.ragAnswer).mockResolvedValue('面经1总结');
    const res = response();

    await askQuestion({
      userId: 7,
      body: {
        question: '总结笔记面经1',
        provider: 'demo',
        model: 'demo-chat',
        embeddingProvider: 'demo',
      },
    } as any, res as any, vi.fn());

    expect(NoteModel.findAllByUserId).toHaveBeenCalledWith(7);
    expect(vectorSearchService.getContextForQuestion).not.toHaveBeenCalled();
    expect(llmService.ragAnswer).toHaveBeenCalledWith(
      '总结笔记面经1',
      [expect.stringContaining('[Source 1: "面经1"]')],
      expect.objectContaining({ provider: 'demo', model: 'demo-chat' }),
      7
    );
    expect(vi.mocked(llmService.ragAnswer).mock.calls[0][1][0]).toContain('Java 面试题');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      answer: '面经1总结',
      citations: [expect.objectContaining({ noteId: 18, noteTitle: '面经1', sourceIndex: 1 })],
      conversationId: 100,
    }));
  });
});
