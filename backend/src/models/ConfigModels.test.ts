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
    process.env.API_KEY_ENCRYPTION_SECRET = 'test-encryption-secret-with-enough-entropy';
  });

  it('upserts LLM configs and masks keys', async () => {
    const row = { user_id: 7, provider_key: 'openai', api_key: 'secret' };
    query.mockResolvedValueOnce({ rows: [row] } as any);

    await expect(LLMConfigModel.upsert(7, 'openai', 'secret')).resolves.toEqual(row);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO llm_configs'),
      [7, 'openai', expect.stringMatching(/^enc:v1:/)]
    );

    const masked = [{ provider_key: 'openai', is_active: true, has_key: true }];
    query.mockResolvedValueOnce({ rows: masked } as any);

    await expect(LLMConfigModel.listMasked(7)).resolves.toEqual(masked);
    expect(query).toHaveBeenLastCalledWith(expect.stringContaining('WHERE user_id = $1'), [7]);
  });

  it('finds and toggles LLM configs', async () => {
    query.mockResolvedValueOnce({ rows: [] } as any);
    await expect(LLMConfigModel.findByProvider(7, 'openai')).resolves.toBeNull();
    expect(query).toHaveBeenLastCalledWith(expect.stringContaining('WHERE user_id = $1'), [7, 'openai']);

    query.mockResolvedValueOnce({ rows: [{ user_id: 7, provider_key: 'openai', is_active: false }] } as any);
    await expect(LLMConfigModel.setActive(7, 'openai', false)).resolves.toEqual({
      user_id: 7,
      provider_key: 'openai',
      is_active: false,
    });
    expect(query).toHaveBeenLastCalledWith(expect.stringContaining('WHERE user_id = $2'), [false, 7, 'openai']);
  });

  it('manages embedding configs', async () => {
    query.mockResolvedValueOnce({ rows: [{ provider_key: 'qwen' }] } as any);
    await expect(EmbeddingConfigModel.findAll()).resolves.toEqual([{ provider_key: 'qwen' }]);

    query.mockResolvedValueOnce({ rows: [{ user_id: 7, provider_key: 'qwen', api_key: 'secret' }] } as any);
    await expect(EmbeddingConfigModel.findByProvider(7, 'qwen')).resolves.toEqual({
      user_id: 7,
      provider_key: 'qwen',
      api_key: 'secret',
    });
    expect(query).toHaveBeenLastCalledWith(expect.stringContaining('WHERE user_id = $1'), [7, 'qwen']);

    query.mockResolvedValueOnce({ rowCount: 1 } as any);
    await expect(EmbeddingConfigModel.delete(7, 'qwen')).resolves.toBe(true);

    query.mockResolvedValueOnce({ rowCount: 0 } as any);
    await expect(EmbeddingConfigModel.delete(7, 'missing')).resolves.toBe(false);
  });
});
