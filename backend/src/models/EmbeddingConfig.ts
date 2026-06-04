import pool from '../config/database';

interface EmbeddingConfigRow {
  id: number;
  provider_key: string;
  api_key: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export const EmbeddingConfigModel = {
  async findAll(): Promise<EmbeddingConfigRow[]> {
    const result = await pool.query(
      'SELECT id, provider_key, api_key, is_active, created_at, updated_at FROM embedding_configs ORDER BY provider_key'
    );
    return result.rows;
  },

  async findByProvider(providerKey: string): Promise<EmbeddingConfigRow | null> {
    const result = await pool.query(
      'SELECT * FROM embedding_configs WHERE provider_key = $1',
      [providerKey]
    );
    return result.rows[0] || null;
  },

  async upsert(providerKey: string, apiKey: string): Promise<EmbeddingConfigRow> {
    const result = await pool.query(
      `INSERT INTO embedding_configs (provider_key, api_key, is_active, updated_at)
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
      'DELETE FROM embedding_configs WHERE provider_key = $1',
      [providerKey]
    );
    return (result.rowCount || 0) > 0;
  },

  async listMasked(): Promise<Array<{ provider_key: string; is_active: boolean; has_key: boolean }>> {
    const result = await pool.query(
      'SELECT provider_key, is_active, CASE WHEN api_key IS NOT NULL AND api_key != \'\' THEN true ELSE false END as has_key FROM embedding_configs ORDER BY provider_key'
    );
    return result.rows;
  },
};
