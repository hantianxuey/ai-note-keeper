import pool from '../config/database';
import { decryptSecret, encryptSecret } from '../config/secrets';

interface EmbeddingConfigRow {
  id: number;
  provider_key: string;
  api_key: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const decryptRow = (row: EmbeddingConfigRow): EmbeddingConfigRow => ({
  ...row,
  api_key: row.api_key ? decryptSecret(row.api_key) : row.api_key,
});

export const EmbeddingConfigModel = {
  async findAll(): Promise<EmbeddingConfigRow[]> {
    const result = await pool.query(
      'SELECT id, provider_key, api_key, is_active, created_at, updated_at FROM embedding_configs ORDER BY provider_key'
    );
    return result.rows.map(decryptRow);
  },

  async findByProvider(providerKey: string): Promise<EmbeddingConfigRow | null> {
    const result = await pool.query(
      'SELECT * FROM embedding_configs WHERE provider_key = $1',
      [providerKey]
    );
    return result.rows[0] ? decryptRow(result.rows[0]) : null;
  },

  async upsert(providerKey: string, apiKey: string): Promise<EmbeddingConfigRow> {
    const encryptedApiKey = encryptSecret(apiKey);
    const result = await pool.query(
      `INSERT INTO embedding_configs (provider_key, api_key, is_active, updated_at)
       VALUES ($1, $2, true, NOW())
       ON CONFLICT (provider_key)
       DO UPDATE SET api_key = $2, is_active = true, updated_at = NOW()
       RETURNING *`,
      [providerKey, encryptedApiKey]
    );
    return decryptRow(result.rows[0]);
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
