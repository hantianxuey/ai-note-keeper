ALTER TABLE llm_configs
  ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE embedding_configs
  ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE llm_configs
  DROP CONSTRAINT IF EXISTS llm_configs_provider_key_key;

ALTER TABLE embedding_configs
  DROP CONSTRAINT IF EXISTS embedding_configs_provider_key_key;

DROP INDEX IF EXISTS idx_llm_configs_provider_key;
DROP INDEX IF EXISTS idx_embedding_configs_provider_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'llm_configs_user_provider_key'
  ) THEN
    ALTER TABLE llm_configs
      ADD CONSTRAINT llm_configs_user_provider_key UNIQUE (user_id, provider_key);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'embedding_configs_user_provider_key'
  ) THEN
    ALTER TABLE embedding_configs
      ADD CONSTRAINT embedding_configs_user_provider_key UNIQUE (user_id, provider_key);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_llm_configs_user_id ON llm_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_embedding_configs_user_id ON embedding_configs(user_id);
