import pool from '../config/database';

export interface AttachmentCreateInput {
  userId: number;
  noteId: number;
  storageKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
}

export const AttachmentModel = {
  async create(input: AttachmentCreateInput) {
    const result = await pool.query(
      `INSERT INTO note_attachments
        (user_id, note_id, storage_key, original_name, mime_type, size_bytes, sha256)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        input.userId,
        input.noteId,
        input.storageKey,
        input.originalName,
        input.mimeType,
        input.sizeBytes,
        input.sha256,
      ]
    );
    return result.rows[0];
  },

  async findById(id: number, userId: number) {
    const result = await pool.query(
      `SELECT * FROM note_attachments
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return result.rows[0] || null;
  },

  async findByNoteId(noteId: number, userId: number) {
    const result = await pool.query(
      `SELECT * FROM note_attachments
       WHERE note_id = $1 AND user_id = $2`,
      [noteId, userId]
    );
    return result.rows;
  },

  async delete(id: number, userId: number): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM note_attachments WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return (result.rowCount || 0) > 0;
  },
};
