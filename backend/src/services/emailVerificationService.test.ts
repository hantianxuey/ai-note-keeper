import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createVerificationCodeHash, emailVerificationService, verifyCodeHash } from './emailVerificationService';
import { EmailVerificationModel } from '../models/EmailVerification';

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
