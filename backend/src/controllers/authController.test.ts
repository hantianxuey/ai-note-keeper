import { beforeEach, describe, expect, it, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/User';
import { login, me, register } from './authController';

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn(),
  },
}));

vi.mock('../models/User', () => ({
  UserModel: {
    create: vi.fn(),
    findByEmail: vi.fn(),
    findById: vi.fn(),
  },
}));

const response = () => {
  const res = {
    json: vi.fn(),
    status: vi.fn(),
  };
  res.status.mockReturnValue(res);
  return res;
};

describe('authController', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
    vi.resetAllMocks();
    vi.mocked(jwt.sign).mockReturnValue('token' as any);
  });

  it('registers a new user', async () => {
    vi.mocked(UserModel.findByEmail).mockResolvedValue(null);
    vi.mocked(bcrypt.hash).mockResolvedValue('hash' as never);
    vi.mocked(UserModel.create).mockResolvedValue({ id: 1, email: 'a@example.com' } as any);
    const res = response();

    await register({
      body: { email: 'a@example.com', password: 'secret1' },
    } as any, res as any, vi.fn());

    expect(UserModel.create).toHaveBeenCalledWith('a@example.com', 'hash');
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      token: 'token',
      user: { id: 1, email: 'a@example.com' },
    });
  });

  it('rejects duplicate registration', async () => {
    const next = vi.fn();
    vi.mocked(UserModel.findByEmail).mockResolvedValue({ id: 1 } as any);

    await register({
      body: { email: 'a@example.com', password: 'secret1' },
    } as any, response() as any, next);

    await vi.waitFor(() => expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 409 })));
  });

  it('logs in valid users', async () => {
    vi.mocked(UserModel.findByEmail).mockResolvedValue({
      id: 1,
      email: 'a@example.com',
      password_hash: 'hash',
    } as any);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
    const res = response();

    await login({
      body: { email: 'a@example.com', password: 'secret1' },
    } as any, res as any, vi.fn());

    expect(res.json).toHaveBeenCalledWith({
      token: 'token',
      user: { id: 1, email: 'a@example.com' },
    });
  });

  it('rejects invalid login credentials', async () => {
    const next = vi.fn();
    vi.mocked(UserModel.findByEmail).mockResolvedValue(null);

    await login({
      body: { email: 'a@example.com', password: 'secret1' },
    } as any, response() as any, next);

    await vi.waitFor(() => expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 })));
  });

  it('returns the current user', async () => {
    vi.mocked(UserModel.findById).mockResolvedValue({ id: 2, email: 'b@example.com' } as any);
    const res = response();

    await me({ userId: 2 } as any, res as any, vi.fn());

    expect(res.json).toHaveBeenCalledWith({
      user: { id: 2, email: 'b@example.com' },
    });
  });
});
