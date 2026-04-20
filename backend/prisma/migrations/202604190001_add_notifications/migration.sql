CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  dedupe_key VARCHAR(255),
  read_at TIMESTAMP(3),
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS notifications_user_id_dedupe_key_key
ON notifications(user_id, dedupe_key);

CREATE INDEX IF NOT EXISTS notifications_user_id_created_at_idx
ON notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS notifications_user_id_read_at_idx
ON notifications(user_id, read_at);
