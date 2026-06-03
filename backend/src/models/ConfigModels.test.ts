import { beforeEach, describe, expect, it, vi } from 'vitest';
import pool from '../config/database';
import { EmbeddingConfigModel } from './EmbeddingConfig';
import { LLMConfigModel } from './LLMConfig';

vi.mock('../config/database', () => ({
  default: {
    query: vi.fn(),
  },
}));

const query = vi.mocked(pool.query);

describe('configuration models', () => {
  beforeEach(() => {
    query.mockReset();
  });

  it('upserts LLM configs and masks keys', async () => {
    const row = { provider_key: 'openai', api_key: 'secret' };
    query.mockResolvedValueOnce({ rows: [row] } as any);

    await expect(LLMConfigModel.upsert('openai', 'secret')).resolves.toEqual(row);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO llm_configs'), ['openai', 'secret']);

    const masked = [{ provider_key: 'openai', is_active: true, has_key: true }];
    query.mockResolvedValueOnce({ rows: masked } as any);

    await expect(LLMConfigModel.listMasked()).resolves.toEqual(masked);
  });

  it('finds and toggles LLM configs', async () => {
    query.mockResolvedValueOnce({ rows: [] } as any);
    await expect(LLMConfigModel.findByProvider('openai')).resolves.toBeNull();

    query.mockResolvedValueOnce({ rows: [{ provider_key: 'openai', is_active: false }] } as any);
    await expect(LLMConfigModel.setActive('openai', false)).resolves.toEqual({
      provider_key: 'openai',
      is_active: false,
    });
  });

  it('manages embedding configs', async () => {
    query.mockResolvedValueOnce({ rows: [] } as any);
    await EmbeddingConfigModel.ensureTable();
    expect(query).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS embedding_configs'));

    query.mockResolvedValueOnce({ rows: [{ provider_key: 'qwen' }] } as any);
    await expect(EmbeddingConfigModel.findAll()).resolves.toEqual([{ provider_key: 'qwen' }]);

    query.mockResolvedValueOnce({ rowCount: 1 } as any);
    await expect(EmbeddingConfigModel.delete('qwen')).resolves.toBe(true);

    query.mockResolvedValueOnce({ rowCount: 0 } as any);
    await expect(EmbeddingConfigModel.delete('missing')).resolves.toBe(false);
  });
});
