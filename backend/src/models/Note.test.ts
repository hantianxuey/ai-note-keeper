import { beforeEach, describe, expect, it, vi } from 'vitest';
import pool from '../config/database';
import { NoteModel } from './Note';

vi.mock('../config/database', () => ({
  default: {
    query: vi.fn(),
  },
}));

const query = vi.mocked(pool.query);

describe('NoteModel', () => {
  beforeEach(() => {
    query.mockReset();
  });

  it('lists notes by user id', async () => {
    const notes = [{ id: 1, title: 'A' }];
    query.mockResolvedValueOnce({ rows: notes } as any);

    await expect(NoteModel.findAllByUserId(7)).resolves.toEqual(notes);
    expect(query).toHaveBeenCalledWith(
      'SELECT * FROM notes WHERE user_id = $1 ORDER BY updated_at DESC',
      [7]
    );
  });

  it('returns null when a note is not found', async () => {
    query.mockResolvedValueOnce({ rows: [] } as any);

    await expect(NoteModel.findById(1, 7)).resolves.toBeNull();
  });

  it('creates a note with optional values normalized', async () => {
    const note = { id: 1, title: 'A' };
    query.mockResolvedValueOnce({ rows: [note] } as any);

    await expect(NoteModel.create(7, 'A', 'Body')).resolves.toEqual(note);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO notes'), [
      7,
      'A',
      'Body',
      null,
      undefined,
      null,
    ]);
  });

  it('reports whether delete removed a row', async () => {
    query.mockResolvedValueOnce({ rowCount: 1 } as any);
    await expect(NoteModel.delete(1, 7)).resolves.toBe(true);

    query.mockResolvedValueOnce({ rowCount: 0 } as any);
    await expect(NoteModel.delete(2, 7)).resolves.toBe(false);
  });

  it('searches by a wrapped query', async () => {
    query.mockResolvedValueOnce({ rows: [] } as any);

    await NoteModel.search(7, 'memo');

    expect(query).toHaveBeenCalledWith(expect.stringContaining('ILIKE'), [7, '%memo%']);
  });
});
