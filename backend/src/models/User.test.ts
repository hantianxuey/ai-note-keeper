import { beforeEach, describe, expect, it, vi } from 'vitest';
import pool from '../config/database';
import { UserModel } from './User';

vi.mock('../config/database', () => ({
  default: {
    query: vi.fn(),
  },
}));

const query = vi.mocked(pool.query);

describe('UserModel', () => {
  beforeEach(() => {
    query.mockReset();
  });

  it('creates a user', async () => {
    const user = { id: 1, email: 'a@example.com' };
    query.mockResolvedValueOnce({ rows: [user] } as any);

    await expect(UserModel.create('a@example.com', 'hash')).resolves.toEqual(user);
    expect(query).toHaveBeenCalledWith(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING *',
      ['a@example.com', 'hash']
    );
  });

  it('returns null when an email is not found', async () => {
    query.mockResolvedValueOnce({ rows: [] } as any);

    await expect(UserModel.findByEmail('missing@example.com')).resolves.toBeNull();
  });

  it('finds a user by id', async () => {
    const user = { id: 2, email: 'b@example.com' };
    query.mockResolvedValueOnce({ rows: [user] } as any);

    await expect(UserModel.findById(2)).resolves.toEqual(user);
  });
});
