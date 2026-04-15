import pool from '../config/database';
import { Note } from '../types';

export const NoteModel = {
  async findAllByUserId(userId: number): Promise<Note[]> {
    const result = await pool.query(
      'SELECT * FROM notes WHERE user_id = $1 ORDER BY updated_at DESC',
      [userId]
    );
    return result.rows;
  },

  async findById(id: number, userId: number): Promise<Note | null> {
    const result = await pool.query(
      'SELECT * FROM notes WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return result.rows[0] || null;
  },

  async create(
    userId: number,
    title: string,
    content: string,
    tags?: string[] | null,
    category?: string | null
  ): Promise<Note> {
    const result = await pool.query(
      `INSERT INTO notes (user_id, title, content, tags, category)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, title, content, tags, category || null]
    );
    return result.rows[0];
  },

  async update(
    id: number,
    userId: number,
    title: string,
    content: string,
    tags?: string[] | null,
    category?: string | null
  ): Promise<Note | null> {
    const result = await pool.query(
      `UPDATE notes
       SET title = $1, content = $2, tags = $3, category = $4, updated_at = NOW()
       WHERE id = $5 AND user_id = $6
       RETURNING *`,
      [title, content, tags, category || null, id, userId]
    );
    return result.rows[0] || null;
  },

  async delete(id: number, userId: number): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM notes WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return (result.rowCount || 0) > 0;
  },

  async search(userId: number, query: string): Promise<Note[]> {
    const searchQuery = `%${query}%`;
    const result = await pool.query(
      `SELECT * FROM notes
       WHERE user_id = $1
       AND (title ILIKE $2 OR content ILIKE $2)
       ORDER BY updated_at DESC`,
      [userId, searchQuery]
    );
    return result.rows;
  },
};
