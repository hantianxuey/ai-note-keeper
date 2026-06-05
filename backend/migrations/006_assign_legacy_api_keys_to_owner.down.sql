UPDATE llm_configs
SET user_id = NULL
WHERE user_id = (
  SELECT id FROM users WHERE email = '1206677183@qq.com'
);

UPDATE embedding_configs
SET user_id = NULL
WHERE user_id = (
  SELECT id FROM users WHERE email = '1206677183@qq.com'
);
