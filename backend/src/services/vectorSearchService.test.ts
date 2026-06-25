import { beforeEach, describe, expect, it, vi } from 'vitest';
import pool from '../config/database';
import { embeddingService } from './embeddingService';
import { vectorSearchService } from './vectorSearchService';

vi.mock('../config/database', () => ({
  default: {
    query: vi.fn(),
  },
}));

vi.mock('../config/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('../observability/metrics', () => ({
  recordRagRetrieval: vi.fn(),
}));

vi.mock('./embeddingService', () => ({
  embeddingService: {
    getDefaultProviderForUser: vi.fn(),
    indexNote: vi.fn(),
    removeNote: vi.fn(),
    search: vi.fn(),
  },
}));

describe('vectorSearchService reindexing', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(pool.query).mockReset();
    vi.mocked(embeddingService.getDefaultProviderForUser).mockResolvedValue('demo');
  });

  it('loads and reindexes notes only for the requested user', async () => {
    vi.mocked(pool.query)
      .mockResolvedValueOnce({ rows: [] } as any)
      .mockResolvedValueOnce({ rows: [] } as any)
      .mockResolvedValueOnce({ rows: [] } as any)
      .mockResolvedValueOnce({ rows: [] } as any)
      .mockResolvedValueOnce({ rows: [] } as any)
      .mockResolvedValueOnce({
        rows: [
          { id: 11, user_id: 7, title: 'A', content: 'alpha' },
          { id: 12, user_id: 7, title: 'B', content: 'beta' },
        ],
      } as any);
    const indexNote = vi.spyOn(vectorSearchService, 'indexNote').mockResolvedValue(undefined);

    const count = await vectorSearchService.reindexUserNotes(7);

    expect(pool.query).toHaveBeenLastCalledWith(
      'SELECT id, user_id, title, content FROM notes WHERE user_id = $1',
      [7]
    );
    expect(indexNote).toHaveBeenNthCalledWith(1, 11, 7, 'A', 'alpha', 'demo');
    expect(indexNote).toHaveBeenNthCalledWith(2, 12, 7, 'B', 'beta', 'demo');
    expect(count).toBe(2);
  });
});
