import crypto from 'crypto';
import pool from '../config/database';

export interface AuthSession {
  id: string;
  user_id: number;
  token_version: number;
  created_at: Date;
  expires_at: Date;
  revoked_at: Date | null;
  last_seen_at: Date | null;
}

export const AuthSessionModel = {
  async create(userId: number, expiresAt: Date): Promise<AuthSession> {
    const id = crypto.randomUUID();
    const result = await pool.query(
      `INSERT INTO auth_sessions (id, user_id, token_version, expires_at)
       VALUES ($1, $2, 1, $3)
       RETURNING *`,
      [id, userId, expiresAt]
    );
    return result.rows[0];
  },

  async findActive(id: string, userId: number): Promise<AuthSession | null> {
    const result = await pool.query(
      `SELECT *
       FROM auth_sessions
       WHERE id = $1
         AND user_id = $2
         AND revoked_at IS NULL
         AND expires_at > CURRENT_TIMESTAMP`,
      [id, userId]
    );
    return result.rows[0] || null;
  },

  async touch(id: string, userId: number): Promise<void> {
    await pool.query(
      `UPDATE auth_sessions
       SET last_seen_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL`,
      [id, userId]
    );
  },

  async revoke(id: string, userId: number): Promise<boolean> {
    const result = await pool.query(
      `UPDATE auth_sessions
       SET revoked_at = CURRENT_TIMESTAMP,
           token_version = token_version + 1
       WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL`,
      [id, userId]
    );
    return (result.rowCount || 0) > 0;
  },

  async revokeAllForUser(userId: number): Promise<number> {
    const result = await pool.query(
      `UPDATE auth_sessions
       SET revoked_at = CURRENT_TIMESTAMP,
           token_version = token_version + 1
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId]
    );
    return result.rowCount || 0;
  },
};
