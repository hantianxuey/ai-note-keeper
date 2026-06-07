import { beforeEach, describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { authenticate } from './auth';
import { AuthSessionModel } from '../models/AuthSession';

vi.hoisted(() => {
  process.env.JWT_SECRET = 'test-secret';
});

vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn(),
  },
}));

vi.mock('../models/AuthSession', () => ({
  AuthSessionModel: {
    findActive: vi.fn(),
    touch: vi.fn(),
  },
}));

describe('authenticate', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
    vi.resetAllMocks();
  });

  it('rejects bearer tokens and requires the httpOnly auth cookie', async () => {
    const next = vi.fn();

    await authenticate({ headers: { authorization: 'Bearer token' } } as any, {} as any, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
    expect(jwt.verify).not.toHaveBeenCalled();
  });

  it('accepts a valid cookie token bound to an active session', async () => {
    vi.mocked(jwt.verify).mockReturnValue({ userId: 7, sessionId: 'session-id', tokenVersion: 1 } as any);
    vi.mocked(AuthSessionModel.findActive).mockResolvedValue({
      id: 'session-id',
      user_id: 7,
      token_version: 1,
    } as any);
    const req = { headers: { cookie: 'auth_token=token' } } as any;
    const next = vi.fn();

    await authenticate(req, {} as any, next);

    expect(req.userId).toBe(7);
    expect(req.sessionId).toBe('session-id');
    expect(next).toHaveBeenCalledWith();
  });

  it('rejects valid JWTs when the server-side session is revoked or versioned out', async () => {
    vi.mocked(jwt.verify).mockReturnValue({ userId: 7, sessionId: 'session-id', tokenVersion: 2 } as any);
    vi.mocked(AuthSessionModel.findActive).mockResolvedValue({
      id: 'session-id',
      user_id: 7,
      token_version: 1,
    } as any);
    const next = vi.fn();

    await authenticate({ headers: { cookie: 'auth_token=token' } } as any, {} as any, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });
});
