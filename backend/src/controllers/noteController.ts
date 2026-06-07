import { NoteModel } from '../models/Note';
import { AttachmentModel } from '../models/Attachment';
import { vectorSearchService } from '../services/vectorSearchService';
import { resolveImagePath } from '../services/imageUploadService';
import { AppError } from '../middleware/errorHandler';
import type { AuthRequest } from '../middleware/auth';
import fs from 'fs/promises';
import {
  asyncHandler,
  parseIdParam,
  requireFields,
  requireUserId,
} from './controllerUtils';

const notePayload = (body: AuthRequest['body']) => ({
  title: body.title,
  content: body.content,
  markdownContent: body.markdownContent || null,
  tags: body.tags || null,
  category: body.category || null,
});

const indexInBackground = (
  noteId: number,
  userId: number,
  title: string,
  content: string
) => {
  vectorSearchService.indexNote(noteId, userId, title, content).catch((err) => {
    console.error('Background indexing failed:', err);
  });
};

export const listNotes = asyncHandler(async (req: AuthRequest, res) => {
  const notes = await NoteModel.findAllByUserId(requireUserId(req));
  res.json({ notes });
});

export const getNote = asyncHandler(async (req: AuthRequest, res) => {
  const note = await NoteModel.findById(parseIdParam(req, 'id', 'note ID'), requireUserId(req));

  if (!note) {
    throw new AppError('Note not found', 404);
  }

  res.json({ note });
});

export const createNote = asyncHandler(async (req: AuthRequest, res) => {
  const userId = requireUserId(req);
  requireFields(req.body, ['title', 'content'], 'Title and content are required');

  const payload = notePayload(req.body);
  const note = await NoteModel.create(
    userId,
    payload.title,
    payload.content,
    payload.markdownContent,
    payload.tags,
    payload.category
  );

  indexInBackground(note.id, userId, payload.title, payload.content);
  res.status(201).json({ note });
});

export const updateNote = asyncHandler(async (req: AuthRequest, res) => {
  const userId = requireUserId(req);
  const noteId = parseIdParam(req, 'id', 'note ID');
  requireFields(req.body, ['title', 'content'], 'Title and content are required');

  const payload = notePayload(req.body);
  const note = await NoteModel.update(
    noteId,
    userId,
    payload.title,
    payload.content,
    payload.markdownContent,
    payload.tags,
    payload.category
  );

  if (!note) {
    throw new AppError('Note not found', 404);
  }

  indexInBackground(noteId, userId, payload.title, payload.content);
  res.json({ note });
});

export const deleteNote = asyncHandler(async (req: AuthRequest, res) => {
  const userId = requireUserId(req);
  const noteId = parseIdParam(req, 'id', 'note ID');
  const attachments = await AttachmentModel.findByNoteId(noteId, userId);
  const deleted = await NoteModel.delete(noteId, userId);

  if (!deleted) {
    throw new AppError('Note not found', 404);
  }

  vectorSearchService.removeNoteIndex(noteId, userId).catch((err) => {
    console.error('Background index removal failed:', err);
  });
  Promise.all(
    attachments.map((attachment) => fs.rm(resolveImagePath(attachment.storage_key), { force: true }))
  ).catch((err) => {
    console.error('Background attachment cleanup failed:', err);
  });
  res.status(204).end();
});

export const searchNotes = asyncHandler(async (req: AuthRequest, res) => {
  const query = req.query.q as string;

  if (!query) {
    res.json({ results: [] });
    return;
  }

  const results = await NoteModel.search(requireUserId(req), query);
  res.json({ results });
});
