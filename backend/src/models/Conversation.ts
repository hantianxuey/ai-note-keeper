import pool from '../config/database';
import { Conversation, ConversationMessage } from '../types';

export const ConversationModel = {
  async findAllByUserId(userId: number): Promise<Conversation[]> {
    const result = await pool.query(
      'SELECT * FROM conversations WHERE user_id = $1 ORDER BY updated_at DESC',
      [userId]
    );
    return result.rows.map((row) => ({
      ...row,
      messages: JSON.parse(row.messages),
    }));
  },

  async findById(id: number, userId: number): Promise<Conversation | null> {
    const result = await pool.query(
      'SELECT * FROM conversations WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
      ...row,
      messages: JSON.parse(row.messages),
    };
  },

  async create(userId: number, title: string = 'New Conversation'): Promise<Conversation> {
    const result = await pool.query(
      'INSERT INTO conversations (user_id, title, messages) VALUES ($1, $2, $3) RETURNING *',
      [userId, title, JSON.stringify([])]
    );
    const row = result.rows[0];
    return {
      ...row,
      messages: JSON.parse(row.messages),
    };
  },

  async updateMessages(
    id: number,
    userId: number,
    messages: ConversationMessage[],
    title?: string
  ): Promise<Conversation | null> {
    const updateTitle = title || undefined;
    const query = updateTitle
      ? 'UPDATE conversations SET messages = $1, title = $3, updated_at = NOW() WHERE id = $2 AND user_id = $4 RETURNING *'
      : 'UPDATE conversations SET messages = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING *';

    const params = updateTitle
      ? [JSON.stringify(messages), id, updateTitle, userId]
      : [JSON.stringify(messages), id, userId];

    const result = await pool.query(query, params);

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      ...row,
      messages: JSON.parse(row.messages),
    };
  },

  async delete(id: number, userId: number): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM conversations WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return (result.rowCount || 0) > 0;
  },
};
