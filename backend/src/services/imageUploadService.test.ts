import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  getImageUploadConfig,
  prepareImageUpload,
  validateImageBuffer,
} from './imageUploadService';

const png = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d,
]);

describe('imageUploadService', () => {
  let uploadDir: string;

  beforeEach(() => {
    uploadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ainote-images-'));
  });

  afterEach(() => {
    fs.rmSync(uploadDir, { recursive: true, force: true });
  });

  it('accepts supported images by MIME type and magic bytes', () => {
    expect(validateImageBuffer(png, 'image/png')).toEqual({
      extension: 'png',
      mimeType: 'image/png',
    });
  });

  it('rejects unsupported or spoofed image uploads', () => {
    expect(() => validateImageBuffer(Buffer.from('<svg></svg>'), 'image/svg+xml')).toThrow('Unsupported image type');
    expect(() => validateImageBuffer(Buffer.from('not a png'), 'image/png')).toThrow('Invalid image content');
  });

  it('writes images with random names and content hashes', async () => {
    const saved = await prepareImageUpload({
      buffer: png,
      originalName: 'photo.png',
      mimeType: 'image/png',
      uploadDir,
    });

    expect(saved.storageKey).toMatch(/^[a-f0-9-]+\.png$/);
    expect(saved.originalName).toBe('photo.png');
    expect(saved.sizeBytes).toBe(png.length);
    expect(saved.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(fs.existsSync(saved.absolutePath)).toBe(true);
    expect(saved.absolutePath.startsWith(uploadDir)).toBe(true);
  });

  it('uses bounded defaults for upload size and location', () => {
    const config = getImageUploadConfig({
      IMAGE_UPLOAD_MAX_BYTES: '1024',
      IMAGE_UPLOAD_DIR: uploadDir,
    });

    expect(config.maxBytes).toBe(1024);
    expect(config.uploadDir).toBe(uploadDir);
  });
});
