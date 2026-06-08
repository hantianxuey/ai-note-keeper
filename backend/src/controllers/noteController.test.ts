import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NoteModel } from '../models/Note';
import { AttachmentModel } from '../models/Attachment';
import { vectorSearchService } from '../services/vectorSearchService';
import {
  createNote,
  deleteNote,
  getNote,
  listNotes,
  searchNotes,
  updateNote,
} from './noteController';

vi.mock('../models/Note', () => ({
  NoteModel: {
    findAllByUserId: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    search: vi.fn(),
  },
}));

vi.mock('../models/Attachment', () => ({
  AttachmentModel: {
    findByNoteId: vi.fn(),
  },
}));

vi.mock('../services/vectorSearchService', () => ({
  vectorSearchService: {
    indexNote: vi.fn(),
    removeNoteIndex: vi.fn(),
  },
}));

const response = () => {
  const res = {
    json: vi.fn(),
    status: vi.fn(),
    end: vi.fn(),
  };
  res.status.mockReturnValue(res);
  return res;
};

describe('noteController', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(AttachmentModel.findByNoteId).mockResolvedValue([]);
    vi.mocked(vectorSearchService.indexNote).mockResolvedValue(undefined);
    vi.mocked(vectorSearchService.removeNoteIndex).mockResolvedValue(undefined);
  });

  it('lists notes for the authenticated user', async () => {
    const notes = [{
      id: 1,
      title: 'A',
      content: '<h2>工作内容</h2>\\n- **RAG** 评测',
      markdown_content: '# 工作内容\n\n- RAG 评测',
    }];
    vi.mocked(NoteModel.findAllByUserId).mockResolvedValue(notes as any);
    const res = response();

    await listNotes({ userId: 7 } as any, res as any, vi.fn());

    expect(NoteModel.findAllByUserId).toHaveBeenCalledWith(7);
    expect(res.json).toHaveBeenCalledWith({
      notes: [{
        id: 1,
        title: 'A',
        preview: '工作内容 RAG 评测',
      }],
    });
  });

  it('returns a note or forwards not-found errors', async () => {
    const next = vi.fn();
    const res = response();
    vi.mocked(NoteModel.findById).mockResolvedValueOnce({ id: 3 } as any);

    await getNote({ userId: 7, params: { id: '3' } } as any, res as any, next);

    expect(res.json).toHaveBeenCalledWith({ note: { id: 3 } });

    vi.mocked(NoteModel.findById).mockResolvedValueOnce(null);
    await getNote({ userId: 7, params: { id: '4' } } as any, res as any, next);

    await vi.waitFor(() => expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 })));
  });

  it('creates notes and indexes them in the background', async () => {
    const note = { id: 10, title: 'A', content: 'B' };
    vi.mocked(NoteModel.create).mockResolvedValue(note as any);
    const res = response();

    await createNote({
      userId: 7,
      body: { title: 'A', content: 'B' },
    } as any, res as any, vi.fn());

    expect(NoteModel.create).toHaveBeenCalledWith(7, 'A', 'B', null, null, null);
    expect(vectorSearchService.indexNote).toHaveBeenCalledWith(10, 7, 'A', 'B');
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ note });
  });

  it('updates existing notes and rejects missing notes', async () => {
    const next = vi.fn();
    const res = response();
    vi.mocked(NoteModel.update).mockResolvedValueOnce({ id: 10 } as any);

    await updateNote({
      userId: 7,
      params: { id: '10' },
      body: { title: 'A', content: 'B' },
    } as any, res as any, next);

    expect(res.json).toHaveBeenCalledWith({ note: { id: 10 } });

    vi.mocked(NoteModel.update).mockResolvedValueOnce(null);
    await updateNote({
      userId: 7,
      params: { id: '10' },
      body: { title: 'A', content: 'B' },
    } as any, res as any, next);

    await vi.waitFor(() => expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 })));
  });

  it('deletes notes and removes their index entries', async () => {
    vi.mocked(NoteModel.delete).mockResolvedValue(true);
    const res = response();

    await deleteNote({ userId: 7, params: { id: '10' } } as any, res as any, vi.fn());

    expect(AttachmentModel.findByNoteId).toHaveBeenCalledWith(10, 7);
    expect(vectorSearchService.removeNoteIndex).toHaveBeenCalledWith(10, 7);
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.end).toHaveBeenCalled();
  });

  it('returns empty search results without a query', async () => {
    const res = response();

    await searchNotes({ userId: 7, query: {} } as any, res as any, vi.fn());

    expect(NoteModel.search).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ results: [] });
  });
});
