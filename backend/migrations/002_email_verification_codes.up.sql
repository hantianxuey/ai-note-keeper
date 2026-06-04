CREATE TABLE IF NOT EXISTS email_verification_codes (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  code_hash VARCHAR(128) NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  consumed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_verification_codes_email
  ON email_verification_codes(email);

CREATE INDEX IF NOT EXISTS idx_email_verification_codes_lookup
  ON email_verification_codes(email, expires_at, consumed_at);
