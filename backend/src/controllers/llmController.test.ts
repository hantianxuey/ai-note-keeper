import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateSummary } from './llmController';
import { llmService } from '../services/llmService';
import { NoteModel } from '../models/Note';

vi.mock('../services/llmService', () => ({
  llmService: {
    generateSummary: vi.fn(),
  },
}));

vi.mock('../models/Note', () => ({
  NoteModel: {
    findById: vi.fn(),
    findCachedSummary: vi.fn(),
    updateSummary: vi.fn(),
  },
}));

const response = () => {
  const res = {
    json: vi.fn(),
    status: vi.fn(),
  };
  res.status.mockReturnValue(res);
  return res;
};

describe('llmController', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns a cached summary for an unchanged note without calling the LLM', async () => {
    vi.mocked(NoteModel.findById).mockResolvedValue({ id: 3, user_id: 7 } as any);
    vi.mocked(NoteModel.findCachedSummary).mockResolvedValue('cached summary');
    const res = response();

    await generateSummary({
      userId: 7,
      body: { noteId: 3, content: 'same content', provider: 'demo', model: 'demo-chat' },
    } as any, res as any, vi.fn());

    expect(NoteModel.findById).toHaveBeenCalledWith(3, 7);
    expect(NoteModel.findCachedSummary).toHaveBeenCalledWith(3, 7, expect.any(String));
    expect(llmService.generateSummary).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ summary: 'cached summary', cached: true });
  });

  it('stores a generated summary for existing notes', async () => {
    vi.mocked(NoteModel.findById).mockResolvedValue({ id: 3, user_id: 7 } as any);
    vi.mocked(NoteModel.findCachedSummary).mockResolvedValue(null);
    vi.mocked(llmService.generateSummary).mockResolvedValue('fresh summary');
    const res = response();

    await generateSummary({
      userId: 7,
      body: { noteId: 3, content: 'new content', provider: 'demo', model: 'demo-chat' },
    } as any, res as any, vi.fn());

    expect(llmService.generateSummary).toHaveBeenCalledWith('new content', expect.objectContaining({
      provider: 'demo',
      model: 'demo-chat',
    }));
    expect(NoteModel.updateSummary).toHaveBeenCalledWith(3, 7, 'fresh summary', expect.any(String));
    expect(res.json).toHaveBeenCalledWith({ summary: 'fresh summary', cached: false });
  });
});
