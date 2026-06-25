import { beforeEach, describe, expect, it, vi } from 'vitest';
import { vectorSearchService } from '../services/vectorSearchService';
import { reindexNotes } from './ragController';

vi.mock('../services/vectorSearchService', () => ({
  vectorSearchService: {
    reindexUserNotes: vi.fn(),
  },
}));

vi.mock('../services/llmService', () => ({
  llmService: {},
}));

vi.mock('../services/embeddingService', () => ({
  embeddingService: {},
}));

vi.mock('../models/Conversation', () => ({
  ConversationModel: {},
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
});
