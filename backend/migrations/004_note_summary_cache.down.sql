DROP INDEX IF EXISTS idx_notes_summary_cache;

ALTER TABLE notes
  DROP COLUMN IF EXISTS ai_summary_generated_at,
  DROP COLUMN IF EXISTS ai_summary_content_hash,
  DROP COLUMN IF EXISTS ai_summary;
