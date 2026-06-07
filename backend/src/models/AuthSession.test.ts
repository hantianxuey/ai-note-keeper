import { beforeEach, describe, expect, it, vi } from 'vitest';
import pool from '../config/database';
import { AuthSessionModel } from './AuthSession';

vi.mock('../config/database', () => ({
  default: {
    query: vi.fn(),
  },
}));

const query = vi.mocked(pool.query);

describe('AuthSessionModel', () => {
  beforeEach(() => {
    query.mockReset();
  });

  it('creates a server-side session with token version 1', async () => {
    const row = {
      id: 'session-id',
      user_id: 7,
      token_version: 1,
      expires_at: new Date('2026-06-14T00:00:00.000Z'),
    };
    query.mockResolvedValueOnce({ rows: [row] } as any);

    await expect(AuthSessionModel.create(7, row.expires_at)).resolves.toEqual(row);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO auth_sessions'),
      [expect.any(String), 7, row.expires_at]
    );
  });

  it('finds only active unexpired sessions', async () => {
    query.mockResolvedValueOnce({ rows: [] } as any);

    await expect(AuthSessionModel.findActive('session-id', 7)).resolves.toBeNull();
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('revoked_at IS NULL'),
      ['session-id', 7]
    );
  });

  it('revokes one session or all sessions for a user', async () => {
    query.mockResolvedValueOnce({ rowCount: 1 } as any);
    await expect(AuthSessionModel.revoke('session-id', 7)).resolves.toBe(true);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE auth_sessions'),
      ['session-id', 7]
    );

    query.mockResolvedValueOnce({ rowCount: 2 } as any);
    await expect(AuthSessionModel.revokeAllForUser(7)).resolves.toBe(2);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('WHERE user_id = $1'), [7]);
  });
});
