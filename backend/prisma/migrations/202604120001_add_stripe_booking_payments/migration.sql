ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20),
ADD COLUMN IF NOT EXISTS stripe_checkout_session_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_event_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'eur';

DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'bookings'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%status%'
    AND pg_get_constraintdef(oid) LIKE '%confirmed%'
    AND pg_get_constraintdef(oid) LIKE '%cancelled%'
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE bookings DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

ALTER TABLE bookings
ADD CONSTRAINT bookings_status_check
CHECK (status IN ('pending_payment', 'confirmed', 'cancelled'));

DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'bookings'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%payment_status%'
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE bookings DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

ALTER TABLE bookings
ADD CONSTRAINT bookings_payment_status_check
CHECK (
  payment_status IS NULL OR
  payment_status IN ('unpaid', 'paid', 'failed', 'cancelled', 'expired')
);

