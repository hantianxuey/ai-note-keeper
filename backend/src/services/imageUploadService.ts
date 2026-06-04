import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { AppError } from '../middleware/errorHandler';

const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;
const DEFAULT_UPLOAD_DIR = path.resolve(process.cwd(), '../shared/uploads/images');

const MIME_TO_EXTENSION = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/gif', 'gif'],
  ['image/webp', 'webp'],
]);

interface ImageUploadEnv {
  IMAGE_UPLOAD_MAX_BYTES?: string;
  IMAGE_UPLOAD_DIR?: string;
}

interface PrepareImageUploadInput {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  uploadDir?: string;
}

export interface PreparedImageUpload {
  storageKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  absolutePath: string;
}

export function getImageUploadConfig(env: ImageUploadEnv = process.env) {
  const parsedMaxBytes = Number(env.IMAGE_UPLOAD_MAX_BYTES);
  return {
    maxBytes: Number.isFinite(parsedMaxBytes) && parsedMaxBytes > 0
      ? parsedMaxBytes
      : DEFAULT_MAX_BYTES,
    uploadDir: env.IMAGE_UPLOAD_DIR || DEFAULT_UPLOAD_DIR,
  };
}

function hasSignature(buffer: Buffer, mimeType: string): boolean {
  if (mimeType === 'image/png') {
    return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }

  if (mimeType === 'image/jpeg') {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  if (mimeType === 'image/gif') {
    const header = buffer.subarray(0, 6).toString('ascii');
    return header === 'GIF87a' || header === 'GIF89a';
  }

  if (mimeType === 'image/webp') {
    return buffer.length >= 12
      && buffer.subarray(0, 4).toString('ascii') === 'RIFF'
      && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
  }

  return false;
}

export function validateImageBuffer(buffer: Buffer, mimeType: string) {
  const extension = MIME_TO_EXTENSION.get(mimeType);
  if (!extension) {
    throw new AppError('Unsupported image type', 415);
  }

  if (!hasSignature(buffer, mimeType)) {
    throw new AppError('Invalid image content', 400);
  }

  return { extension, mimeType };
}

export async function prepareImageUpload(input: PrepareImageUploadInput): Promise<PreparedImageUpload> {
  const { extension, mimeType } = validateImageBuffer(input.buffer, input.mimeType);
  const uploadDir = path.resolve(input.uploadDir || getImageUploadConfig().uploadDir);
  await fs.mkdir(uploadDir, { recursive: true });

  const storageKey = `${crypto.randomUUID()}.${extension}`;
  const absolutePath = path.join(uploadDir, storageKey);
  if (!absolutePath.startsWith(uploadDir + path.sep)) {
    throw new AppError('Invalid upload path', 400);
  }

  await fs.writeFile(absolutePath, input.buffer, { flag: 'wx' });

  return {
    storageKey,
    originalName: path.basename(input.originalName || storageKey),
    mimeType,
    sizeBytes: input.buffer.length,
    sha256: crypto.createHash('sha256').update(input.buffer).digest('hex'),
    absolutePath,
  };
}

export function resolveImagePath(storageKey: string, uploadDir = getImageUploadConfig().uploadDir) {
  const root = path.resolve(uploadDir);
  const absolutePath = path.resolve(root, storageKey);
  if (!absolutePath.startsWith(root + path.sep)) {
    throw new AppError('Invalid attachment path', 400);
  }
  return absolutePath;
}
