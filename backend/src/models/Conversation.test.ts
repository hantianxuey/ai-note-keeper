import { beforeEach, describe, expect, it, vi } from 'vitest';
import pool from '../config/database';
import { ConversationModel } from './Conversation';

vi.mock('../config/database', () => ({
  default: {
    query: vi.fn(),
  },
}));

const query = vi.mocked(pool.query);

describe('ConversationModel', () => {
  beforeEach(() => {
    query.mockReset();
  });

  it('lists conversations by user id', async () => {
    const rows = [{ id: 1, title: 'Chat' }];
    query.mockResolvedValueOnce({ rows } as any);

    await expect(ConversationModel.findAllByUserId(7)).resolves.toEqual(rows);
    expect(query).toHaveBeenCalledWith(
      'SELECT * FROM conversations WHERE user_id = $1 ORDER BY updated_at DESC',
      [7]
    );
  });

  it('creates conversations with serialized messages', async () => {
    const row = { id: 1 };
    const messages = [{ role: 'user', content: 'hi' }];
    query.mockResolvedValueOnce({ rows: [row] } as any);

    await expect(ConversationModel.create(7, 'New', messages)).resolves.toEqual(row);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO conversations'), [
      7,
      'New',
      JSON.stringify(messages),
    ]);
  });

  it('adds a message to an existing conversation', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ id: 1, messages: [{ role: 'user', content: 'hi' }] }] } as any)
      .mockResolvedValueOnce({ rows: [{ id: 1, messages: [] }] } as any);

    await expect(ConversationModel.addMessage(1, 7, { role: 'assistant', content: 'ok' })).resolves.toEqual({
      id: 1,
      messages: [],
    });

    expect(query).toHaveBeenLastCalledWith(expect.stringContaining('UPDATE conversations'), [
      JSON.stringify([
        { role: 'user', content: 'hi' },
        { role: 'assistant', content: 'ok' },
      ]),
      1,
      7,
    ]);
  });

  it('returns null when adding to a missing conversation', async () => {
    query.mockResolvedValueOnce({ rows: [] } as any);

    await expect(ConversationModel.addMessage(1, 7, { role: 'user', content: 'hi' })).resolves.toBeNull();
  });

  it('updates title and reports delete status', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 1, title: 'Renamed' }] } as any);
    await expect(ConversationModel.updateTitle(1, 7, 'Renamed')).resolves.toEqual({ id: 1, title: 'Renamed' });

    query.mockResolvedValueOnce({ rowCount: 1 } as any);
    await expect(ConversationModel.delete(1, 7)).resolves.toBe(true);

    query.mockResolvedValueOnce({ rowCount: 0 } as any);
    await expect(ConversationModel.delete(2, 7)).resolves.toBe(false);
  });
});
