CREATE TABLE IF NOT EXISTS ticket_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  capacity INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ticket_tiers_capacity_check CHECK (capacity > 0),
  CONSTRAINT ticket_tiers_price_check CHECK (price >= 0)
);

CREATE INDEX IF NOT EXISTS ticket_tiers_event_id_idx
ON ticket_tiers(event_id);

CREATE TABLE IF NOT EXISTS booking_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  ticket_tier_id UUID NOT NULL REFERENCES ticket_tiers(id),
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  CONSTRAINT booking_items_quantity_check CHECK (quantity > 0),
  CONSTRAINT booking_items_unit_price_check CHECK (unit_price >= 0),
  CONSTRAINT booking_items_total_price_check CHECK (total_price >= 0)
);

CREATE INDEX IF NOT EXISTS booking_items_booking_id_idx
ON booking_items(booking_id);

CREATE INDEX IF NOT EXISTS booking_items_ticket_tier_id_idx
ON booking_items(ticket_tier_id);

INSERT INTO ticket_tiers (event_id, name, description, price, capacity, is_active, sort_order)
SELECT e.id, 'Standard', 'Standard ticket', e.price, e.capacity, TRUE, 0
FROM events e
WHERE NOT EXISTS (
  SELECT 1
  FROM ticket_tiers tt
  WHERE tt.event_id = e.id
);

INSERT INTO booking_items (booking_id, ticket_tier_id, quantity, unit_price, total_price)
SELECT b.id, tt.id, 1, tt.price, tt.price
FROM bookings b
JOIN ticket_tiers tt ON tt.event_id = b.event_id AND tt.name = 'Standard'
WHERE NOT EXISTS (
  SELECT 1
  FROM booking_items bi
  WHERE bi.booking_id = b.id
);
