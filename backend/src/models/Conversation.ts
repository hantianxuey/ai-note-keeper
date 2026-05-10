import pool from '../config/database';

interface ConversationRow {
  id: number;
  user_id: number;
  title: string;
  messages: any[];
  created_at: Date;
  updated_at: Date;
}

export const ConversationModel = {
  async findAllByUserId(userId: number): Promise<ConversationRow[]> {
    const result = await pool.query(
      'SELECT * FROM conversations WHERE user_id = $1 ORDER BY updated_at DESC',
      [userId]
    );
    return result.rows;
  },

  async findById(id: number, userId: number): Promise<ConversationRow | null> {
    const result = await pool.query(
      'SELECT * FROM conversations WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return result.rows[0] || null;
  },

  async create(userId: number, title: string, messages: any[] = []): Promise<ConversationRow> {
    const result = await pool.query(
      `INSERT INTO conversations (user_id, title, messages)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, title, JSON.stringify(messages)]
    );
    return result.rows[0];
  },

  async addMessage(id: number, userId: number, message: any): Promise<ConversationRow | null> {
    const conversation = await this.findById(id, userId);
    if (!conversation) return null;

    const messages = [...(conversation.messages || []), message];
    const result = await pool.query(
      `UPDATE conversations
       SET messages = $1, updated_at = NOW()
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [JSON.stringify(messages), id, userId]
    );
    return result.rows[0] || null;
  },

  async updateMessages(id: number, userId: number, messages: any[]): Promise<ConversationRow | null> {
    const result = await pool.query(
      `UPDATE conversations
       SET messages = $1, updated_at = NOW()
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [JSON.stringify(messages), id, userId]
    );
    return result.rows[0] || null;
  },

  async updateTitle(id: number, userId: number, title: string): Promise<ConversationRow | null> {
    const result = await pool.query(
      `UPDATE conversations
       SET title = $1, updated_at = NOW()
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [title, id, userId]
    );
    return result.rows[0] || null;
  },

  async delete(id: number, userId: number): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM conversations WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return (result.rowCount || 0) > 0;
  },
};
