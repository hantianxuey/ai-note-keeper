CREATE TABLE IF NOT EXISTS note_attachments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  storage_key VARCHAR(255) NOT NULL UNIQUE,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(64) NOT NULL,
  size_bytes INTEGER NOT NULL,
  sha256 CHAR(64) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_note_attachments_user_note
  ON note_attachments(user_id, note_id);
