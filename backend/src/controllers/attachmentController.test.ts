import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NoteModel } from '../models/Note';
import { AttachmentModel } from '../models/Attachment';
import { uploadNoteImage } from './attachmentController';

vi.mock('../models/Note', () => ({
  NoteModel: {
    findById: vi.fn(),
  },
}));

vi.mock('../models/Attachment', () => ({
  AttachmentModel: {
    create: vi.fn(),
  },
}));

vi.mock('../services/imageUploadService', () => ({
  getImageUploadConfig: vi.fn(() => ({
    maxBytes: 5 * 1024 * 1024,
    uploadDir: '/uploads',
  })),
  prepareImageUpload: vi.fn(async () => ({
    storageKey: 'image.png',
    originalName: 'image.png',
    mimeType: 'image/png',
    sizeBytes: 12,
    sha256: 'a'.repeat(64),
    absolutePath: '/uploads/image.png',
  })),
}));

const response = () => {
  const res = {
    json: vi.fn(),
    status: vi.fn(),
  };
  res.status.mockReturnValue(res);
  return res;
};

describe('attachmentController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uploads note images only when the note belongs to the authenticated user', async () => {
    vi.mocked(NoteModel.findById).mockResolvedValue({ id: 9, user_id: 7 } as any);
    vi.mocked(AttachmentModel.create).mockResolvedValue({
      id: 3,
      note_id: 9,
      user_id: 7,
      mime_type: 'image/png',
      size_bytes: 12,
    } as any);
    const res = response();

    await uploadNoteImage({
      userId: 7,
      params: { id: '9' },
      file: {
        buffer: Buffer.from([1, 2, 3]),
        originalname: 'image.png',
        mimetype: 'image/png',
      },
    } as any, res as any, vi.fn());

    expect(NoteModel.findById).toHaveBeenCalledWith(9, 7);
    expect(AttachmentModel.create).toHaveBeenCalledWith(expect.objectContaining({
      noteId: 9,
      userId: 7,
      mimeType: 'image/png',
    }));
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      attachment: expect.objectContaining({ id: 3 }),
      url: '/api/attachments/3/content',
    });
  });

  it('rejects uploads for missing notes', async () => {
    const next = vi.fn();
    vi.mocked(NoteModel.findById).mockResolvedValue(null);

    await uploadNoteImage({
      userId: 7,
      params: { id: '9' },
      file: {
        buffer: Buffer.from([1]),
        originalname: 'image.png',
        mimetype: 'image/png',
      },
    } as any, response() as any, next);

    await vi.waitFor(() => expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 })));
  });
});
