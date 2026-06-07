import fs from 'fs/promises';
import { AttachmentModel } from '../models/Attachment';
import { NoteModel } from '../models/Note';
import { AppError } from '../middleware/errorHandler';
import type { AuthRequest } from '../middleware/auth';
import {
  asyncHandler,
  parseIdParam,
  requireUserId,
} from './controllerUtils';
import {
  getImageUploadConfig,
  prepareImageUpload,
  resolveImagePath,
} from '../services/imageUploadService';

export const uploadNoteImage = asyncHandler(async (req: AuthRequest, res) => {
  const userId = requireUserId(req);
  const noteId = parseIdParam(req, 'id', 'note ID');
  const note = await NoteModel.findById(noteId, userId);
  if (!note) {
    throw new AppError('Note not found', 404);
  }

  if (!req.file) {
    throw new AppError('Image file is required', 400);
  }

  const saved = await prepareImageUpload({
    buffer: req.file.buffer,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
  });

  const attachment = await AttachmentModel.create({
    userId,
    noteId,
    storageKey: saved.storageKey,
    originalName: saved.originalName,
    mimeType: saved.mimeType,
    sizeBytes: saved.sizeBytes,
    sha256: saved.sha256,
  });

  res.status(201).json({
    attachment,
    url: `/api/attachments/${attachment.id}/content`,
  });
});

export const getAttachmentContent = asyncHandler(async (req: AuthRequest, res) => {
  const userId = requireUserId(req);
  const attachmentId = parseIdParam(req, 'id', 'attachment ID');
  const attachment = await AttachmentModel.findById(attachmentId, userId);
  if (!attachment) {
    throw new AppError('Attachment not found', 404);
  }

  const filePath = resolveImagePath(attachment.storage_key);
  const file = await fs.readFile(filePath);

  res.setHeader('Content-Type', attachment.mime_type);
  res.setHeader('Content-Disposition', `inline; filename="${attachment.original_name.replace(/"/g, '')}"`);
  res.setHeader('Cache-Control', 'private, max-age=300');
  res.send(file);
});

export const deleteAttachment = asyncHandler(async (req: AuthRequest, res) => {
  const userId = requireUserId(req);
  const attachmentId = parseIdParam(req, 'id', 'attachment ID');
  const attachment = await AttachmentModel.findById(attachmentId, userId);
  if (!attachment) {
    throw new AppError('Attachment not found', 404);
  }

  await AttachmentModel.delete(attachmentId, userId);
  await fs.rm(resolveImagePath(attachment.storage_key), { force: true });
  res.status(204).end();
});

export const imageUploadLimits = {
  fileSize: getImageUploadConfig().maxBytes,
  files: 1,
};
