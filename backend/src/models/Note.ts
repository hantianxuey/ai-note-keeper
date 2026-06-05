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
    markdownContent?: string | null,
    tags?: string[] | null,
    category?: string | null
  ): Promise<Note> {
    const result = await pool.query(
      `INSERT INTO notes (user_id, title, content, markdown_content, tags, category)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, title, content, markdownContent || null, tags, category || null]
    );
    return result.rows[0];
  },

  async update(
    id: number,
    userId: number,
    title: string,
    content: string,
    markdownContent?: string | null,
    tags?: string[] | null,
    category?: string | null
  ): Promise<Note | null> {
    const result = await pool.query(
      `UPDATE notes
       SET title = $1, content = $2, markdown_content = $3, tags = $4, category = $5, updated_at = NOW()
       WHERE id = $6 AND user_id = $7
       RETURNING *`,
      [title, content, markdownContent || null, tags, category || null, id, userId]
    );
    return result.rows[0] || null;
  },

  async findCachedSummary(id: number, userId: number, contentHash: string): Promise<string | null> {
    const result = await pool.query(
      `SELECT ai_summary
       FROM notes
       WHERE id = $1
         AND user_id = $2
         AND ai_summary_content_hash = $3
         AND ai_summary IS NOT NULL`,
      [id, userId, contentHash]
    );
    return result.rows[0]?.ai_summary || null;
  },

  async updateSummary(id: number, userId: number, summary: string, contentHash: string): Promise<void> {
    await pool.query(
      `UPDATE notes
       SET ai_summary = $1,
           ai_summary_content_hash = $2,
           ai_summary_generated_at = NOW()
       WHERE id = $3 AND user_id = $4`,
      [summary, contentHash, id, userId]
    );
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
