ALTER TABLE users
ADD COLUMN IF NOT EXISTS password_reset_token_hash VARCHAR(64),
ADD COLUMN IF NOT EXISTS password_reset_expires_at TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS users_password_reset_token_hash_idx
ON users(password_reset_token_hash);
