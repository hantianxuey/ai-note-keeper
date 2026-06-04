import pool from '../config/database';

export interface EmailVerificationCode {
  id: number;
  email: string;
  code_hash: string;
  attempts: number;
  expires_at: Date;
  consumed_at: Date | null;
  created_at: Date;
}

export const EmailVerificationModel = {
  async create(email: string, codeHash: string, expiresAt: Date): Promise<void> {
    await pool.query(
      `INSERT INTO email_verification_codes (email, code_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [email.toLowerCase(), codeHash, expiresAt]
    );
  },

  async findLatestValid(email: string): Promise<EmailVerificationCode | null> {
    const result = await pool.query(
      `SELECT *
       FROM email_verification_codes
       WHERE email = $1
         AND consumed_at IS NULL
         AND expires_at > NOW()
         AND attempts < 5
       ORDER BY created_at DESC
       LIMIT 1`,
      [email.toLowerCase()]
    );

    return result.rows[0] || null;
  },

  async incrementAttempts(id: number): Promise<void> {
    await pool.query(
      `UPDATE email_verification_codes
       SET attempts = attempts + 1
       WHERE id = $1`,
      [id]
    );
  },

  async markConsumed(id: number): Promise<void> {
    await pool.query(
      `UPDATE email_verification_codes
       SET consumed_at = NOW()
       WHERE id = $1`,
      [id]
    );
  },
};
