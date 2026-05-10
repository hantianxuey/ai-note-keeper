import pool from '../config/database';

interface LLMConfigRow {
  id: number;
  provider_key: string;
  api_key: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export const LLMConfigModel = {
  async findAll(): Promise<LLMConfigRow[]> {
    const result = await pool.query(
      'SELECT id, provider_key, api_key, is_active, created_at, updated_at FROM llm_configs ORDER BY provider_key'
    );
    return result.rows;
  },

  async findByProvider(providerKey: string): Promise<LLMConfigRow | null> {
    const result = await pool.query(
      'SELECT * FROM llm_configs WHERE provider_key = $1',
      [providerKey]
    );
    return result.rows[0] || null;
  },

  async upsert(providerKey: string, apiKey: string): Promise<LLMConfigRow> {
    const result = await pool.query(
      `INSERT INTO llm_configs (provider_key, api_key, is_active, updated_at)
       VALUES ($1, $2, true, NOW())
       ON CONFLICT (provider_key)
       DO UPDATE SET api_key = $2, is_active = true, updated_at = NOW()
       RETURNING *`,
      [providerKey, apiKey]
    );
    return result.rows[0];
  },

  async delete(providerKey: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM llm_configs WHERE provider_key = $1',
      [providerKey]
    );
    return (result.rowCount || 0) > 0;
  },

  async setActive(providerKey: string, isActive: boolean): Promise<LLMConfigRow | null> {
    const result = await pool.query(
      'UPDATE llm_configs SET is_active = $1, updated_at = NOW() WHERE provider_key = $2 RETURNING *',
      [isActive, providerKey]
    );
    return result.rows[0] || null;
  },

  async listMasked(): Promise<Array<{ provider_key: string; is_active: boolean; has_key: boolean }>> {
    const result = await pool.query(
      'SELECT provider_key, is_active, CASE WHEN api_key IS NOT NULL AND api_key != \'\' THEN true ELSE false END as has_key FROM llm_configs ORDER BY provider_key'
    );
    return result.rows;
  },
};
