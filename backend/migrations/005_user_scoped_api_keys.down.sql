ALTER TABLE llm_configs
  DROP CONSTRAINT IF EXISTS llm_configs_user_provider_key;

ALTER TABLE embedding_configs
  DROP CONSTRAINT IF EXISTS embedding_configs_user_provider_key;

DROP INDEX IF EXISTS idx_llm_configs_user_id;
DROP INDEX IF EXISTS idx_embedding_configs_user_id;

DELETE FROM llm_configs WHERE user_id IS NOT NULL;
DELETE FROM embedding_configs WHERE user_id IS NOT NULL;

ALTER TABLE llm_configs
  DROP COLUMN IF EXISTS user_id;

ALTER TABLE embedding_configs
  DROP COLUMN IF EXISTS user_id;

ALTER TABLE llm_configs
  ADD CONSTRAINT llm_configs_provider_key_key UNIQUE (provider_key);

ALTER TABLE embedding_configs
  ADD CONSTRAINT embedding_configs_provider_key_key UNIQUE (provider_key);

CREATE INDEX IF NOT EXISTS idx_llm_configs_provider_key ON llm_configs(provider_key);
CREATE INDEX IF NOT EXISTS idx_embedding_configs_provider_key ON embedding_configs(provider_key);
