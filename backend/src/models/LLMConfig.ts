import pool from '../config/database';
import { decryptSecret, encryptSecret } from '../config/secrets';

interface LLMConfigRow {
  id: number;
  user_id: number | null;
  provider_key: string;
  api_key: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const decryptRow = (row: LLMConfigRow): LLMConfigRow => ({
  ...row,
  api_key: row.api_key ? decryptSecret(row.api_key) : row.api_key,
});

export const LLMConfigModel = {
  async findAll(): Promise<LLMConfigRow[]> {
    const result = await pool.query(
      'SELECT id, user_id, provider_key, api_key, is_active, created_at, updated_at FROM llm_configs WHERE user_id IS NULL ORDER BY provider_key'
    );
    return result.rows.map(decryptRow);
  },

  async findByProvider(userId: number, providerKey: string): Promise<LLMConfigRow | null> {
    const result = await pool.query(
      'SELECT * FROM llm_configs WHERE user_id = $1 AND provider_key = $2',
      [userId, providerKey]
    );
    return result.rows[0] ? decryptRow(result.rows[0]) : null;
  },

  async upsert(userId: number, providerKey: string, apiKey: string): Promise<LLMConfigRow> {
    const encryptedApiKey = encryptSecret(apiKey);
    const result = await pool.query(
      `INSERT INTO llm_configs (user_id, provider_key, api_key, is_active, updated_at)
       VALUES ($1, $2, $3, true, NOW())
       ON CONFLICT (user_id, provider_key)
       DO UPDATE SET api_key = $3, is_active = true, updated_at = NOW()
       RETURNING *`,
      [userId, providerKey, encryptedApiKey]
    );
    return decryptRow(result.rows[0]);
  },

  async delete(userId: number, providerKey: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM llm_configs WHERE user_id = $1 AND provider_key = $2',
      [userId, providerKey]
    );
    return (result.rowCount || 0) > 0;
  },

  async setActive(userId: number, providerKey: string, isActive: boolean): Promise<LLMConfigRow | null> {
    const result = await pool.query(
      'UPDATE llm_configs SET is_active = $1, updated_at = NOW() WHERE user_id = $2 AND provider_key = $3 RETURNING *',
      [isActive, userId, providerKey]
    );
    return result.rows[0] ? decryptRow(result.rows[0]) : null;
  },

  async listMasked(userId: number): Promise<Array<{ provider_key: string; is_active: boolean; has_key: boolean }>> {
    const result = await pool.query(
      'SELECT provider_key, is_active, CASE WHEN api_key IS NOT NULL AND api_key != \'\' THEN true ELSE false END as has_key FROM llm_configs WHERE user_id = $1 ORDER BY provider_key',
      [userId]
    );
    return result.rows;
  },
};
