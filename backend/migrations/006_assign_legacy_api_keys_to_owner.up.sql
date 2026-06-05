UPDATE llm_configs
SET user_id = (
  SELECT id FROM users WHERE email = '1206677183@qq.com'
)
WHERE user_id IS NULL
  AND EXISTS (SELECT 1 FROM users WHERE email = '1206677183@qq.com')
  AND NOT EXISTS (
    SELECT 1
    FROM llm_configs existing
    JOIN users owner ON owner.id = existing.user_id
    WHERE owner.email = '1206677183@qq.com'
      AND existing.provider_key = llm_configs.provider_key
  );

DELETE FROM llm_configs legacy
WHERE legacy.user_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM llm_configs existing
    JOIN users owner ON owner.id = existing.user_id
    WHERE owner.email = '1206677183@qq.com'
      AND existing.provider_key = legacy.provider_key
  );

UPDATE embedding_configs
SET user_id = (
  SELECT id FROM users WHERE email = '1206677183@qq.com'
)
WHERE user_id IS NULL
  AND EXISTS (SELECT 1 FROM users WHERE email = '1206677183@qq.com')
  AND NOT EXISTS (
    SELECT 1
    FROM embedding_configs existing
    JOIN users owner ON owner.id = existing.user_id
    WHERE owner.email = '1206677183@qq.com'
      AND existing.provider_key = embedding_configs.provider_key
  );

DELETE FROM embedding_configs legacy
WHERE legacy.user_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM embedding_configs existing
    JOIN users owner ON owner.id = existing.user_id
    WHERE owner.email = '1206677183@qq.com'
      AND existing.provider_key = legacy.provider_key
  );
