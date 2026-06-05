ALTER TABLE notes
  ADD COLUMN IF NOT EXISTS ai_summary TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ai_summary_content_hash VARCHAR(64) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ai_summary_generated_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_notes_summary_cache
  ON notes(id, user_id, ai_summary_content_hash);
