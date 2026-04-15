import { Request, Response, NextFunction } from 'express';
import { NoteModel } from '../models/Note';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

export const listNotes = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.userId!;
    const notes = await NoteModel.findAllByUserId(userId);
    res.json({ notes });
  } catch (error) {
    next(error);
  }
};

export const getNote = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.userId!;
    const noteId = parseInt(req.params.id);

    if (isNaN(noteId)) {
      return next(new AppError('Invalid note ID', 400));
    }

    const note = await NoteModel.findById(noteId, userId);

    if (!note) {
      return next(new AppError('Note not found', 404));
    }

    res.json({ note });
  } catch (error) {
    next(error);
  }
};

export const createNote = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.userId!;
    const { title, content, tags, category } = req.body;

    if (!title || !content) {
      return next(new AppError('Title and content are required', 400));
    }

    const note = await NoteModel.create(
      userId,
      title,
      content,
      tags || null,
      category || null
    );

    res.status(201).json({ note });
  } catch (error) {
    next(error);
  }
};

export const updateNote = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.userId!;
    const noteId = parseInt(req.params.id);
    const { title, content, tags, category } = req.body;

    if (isNaN(noteId)) {
      return next(new AppError('Invalid note ID', 400));
    }

    if (!title || !content) {
      return next(new AppError('Title and content are required', 400));
    }

    const note = await NoteModel.update(
      noteId,
      userId,
      title,
      content,
      tags || null,
      category || null
    );

    if (!note) {
      return next(new AppError('Note not found', 404));
    }

    res.json({ note });
  } catch (error) {
    next(error);
  }
};

export const deleteNote = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.userId!;
    const noteId = parseInt(req.params.id);

    if (isNaN(noteId)) {
      return next(new AppError('Invalid note ID', 400));
    }

    const deleted = await NoteModel.delete(noteId, userId);

    if (!deleted) {
      return next(new AppError('Note not found', 404));
    }

    res.status(204).end();
  } catch (error) {
    next(error);
  }
};

export const searchNotes = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.userId!;
    const query = req.query.q as string;

    if (!query) {
      return res.json({ results: [] });
    }

    const results = await NoteModel.search(userId, query);
    res.json({ results });
  } catch (error) {
    next(error);
  }
};
