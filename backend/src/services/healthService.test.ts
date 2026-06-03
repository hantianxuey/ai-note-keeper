import { describe, expect, it, vi } from 'vitest';
import { createReadinessSnapshot } from './healthService';

describe('createReadinessSnapshot', () => {
  it('marks the service ready when PostgreSQL is healthy and ChromaDB is unavailable', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ ok: 1 }] });
    const vectorStore = {
      getVectorStoreStatus: vi.fn().mockResolvedValue({
        status: 'down',
        message: 'ChromaDB did not respond',
        url: 'http://localhost:8000',
      }),
    };

    const snapshot = await createReadinessSnapshot({
      database: { query } as any,
      vectorStore: vectorStore as any,
    });

    expect(snapshot.httpStatus).toBe(200);
    expect(snapshot.body.status).toBe('degraded');
    expect(snapshot.body.checks.database.status).toBe('ok');
    expect(snapshot.body.checks.vectorStore.status).toBe('down');
  });

  it('marks the service unavailable when PostgreSQL is down', async () => {
    const query = vi.fn().mockRejectedValue(new Error('connection refused'));
    const vectorStore = {
      getVectorStoreStatus: vi.fn().mockResolvedValue({
        status: 'ok',
        message: 'ChromaDB responded',
        url: 'http://localhost:8000',
      }),
    };

    const snapshot = await createReadinessSnapshot({
      database: { query } as any,
      vectorStore: vectorStore as any,
    });

    expect(snapshot.httpStatus).toBe(503);
    expect(snapshot.body.status).toBe('down');
    expect(snapshot.body.checks.database.status).toBe('down');
  });
});
