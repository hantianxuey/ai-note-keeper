import { beforeEach, describe, expect, it, vi } from 'vitest';
import nodemailer from 'nodemailer';
import { createVerificationCodeHash, emailVerificationService, verifyCodeHash } from './emailVerificationService';
import { EmailVerificationModel } from '../models/EmailVerification';

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(),
  },
}));

vi.mock('../models/EmailVerification', () => ({
  EmailVerificationModel: {
    create: vi.fn(),
    findLatestValid: vi.fn(),
    markConsumed: vi.fn(),
    incrementAttempts: vi.fn(),
  },
}));

describe('emailVerificationService', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.NODE_ENV = 'test';
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_SECURE;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    delete process.env.SMTP_FROM;
    delete process.env.SMTP_URL;
    delete process.env.EMAIL_VERIFICATION_EXPOSE_DEV_CODE;
    vi.resetAllMocks();
  });

  it('hashes and verifies codes using email as part of the digest', () => {
    const hash = createVerificationCodeHash('a@example.com', '123456');

    expect(verifyCodeHash(hash, 'a@example.com', '123456')).toBe(true);
    expect(verifyCodeHash(hash, 'b@example.com', '123456')).toBe(false);
  });

  it('creates a code and exposes it only outside production without SMTP', async () => {
    vi.mocked(EmailVerificationModel.create).mockResolvedValue(undefined);

    const result = await emailVerificationService.createAndSend('a@example.com');

    expect(result.devCode).toMatch(/^\d{6}$/);
    expect(EmailVerificationModel.create).toHaveBeenCalledWith(
      'a@example.com',
      expect.any(String),
      expect.any(Date)
    );
  });

  it('uses SMTP_URL to send verification emails in production', async () => {
    process.env.NODE_ENV = 'production';
    process.env.SMTP_URL = 'smtps://user:pass@smtp.example.com:465';
    process.env.SMTP_FROM = 'no-reply@example.com';
    vi.mocked(EmailVerificationModel.create).mockResolvedValue(undefined);
    const sendMail = vi.fn().mockResolvedValue(undefined);
    vi.mocked(nodemailer.createTransport).mockReturnValue({ sendMail } as any);

    const result = await emailVerificationService.createAndSend('a@example.com');

    expect(result).toEqual({});
    expect(nodemailer.createTransport).toHaveBeenCalledWith('smtps://user:pass@smtp.example.com:465');
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
      from: 'no-reply@example.com',
      to: 'a@example.com',
    }));
  });

  it('consumes valid codes and rejects invalid attempts', async () => {
    const hash = createVerificationCodeHash('a@example.com', '123456');
    vi.mocked(EmailVerificationModel.findLatestValid).mockResolvedValue({
      id: 7,
      code_hash: hash,
      attempts: 0,
    } as any);

    await expect(emailVerificationService.verify('a@example.com', '123456')).resolves.toBeUndefined();
    expect(EmailVerificationModel.markConsumed).toHaveBeenCalledWith(7);

    await expect(emailVerificationService.verify('a@example.com', '999999')).rejects.toThrow('Invalid verification code');
    expect(EmailVerificationModel.incrementAttempts).toHaveBeenCalledWith(7);
  });
});
