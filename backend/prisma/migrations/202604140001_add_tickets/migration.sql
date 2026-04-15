CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  booking_item_id UUID NOT NULL REFERENCES booking_items(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  ticket_tier_id UUID NOT NULL REFERENCES ticket_tiers(id),
  ticket_code VARCHAR(80) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'valid',
  issued_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  checked_in_at TIMESTAMP(3),
  CONSTRAINT tickets_status_check CHECK (status IN ('valid', 'cancelled', 'used'))
);

CREATE INDEX IF NOT EXISTS tickets_booking_id_idx ON tickets(booking_id);
CREATE INDEX IF NOT EXISTS tickets_event_id_idx ON tickets(event_id);
CREATE INDEX IF NOT EXISTS tickets_user_id_idx ON tickets(user_id);
CREATE INDEX IF NOT EXISTS tickets_ticket_tier_id_idx ON tickets(ticket_tier_id);
