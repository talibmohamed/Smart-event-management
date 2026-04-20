-- Quickseat database schema
-- WARNING: This script is destructive. It drops application tables before recreating them.
-- Use this only when intentionally resetting a development database.

DROP TABLE IF EXISTS tickets CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS booking_items CASCADE;
DROP TABLE IF EXISTS ticket_tiers CASCADE;
DROP TABLE IF EXISTS feedback CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS event_categories CASCADE;
DROP TABLE IF EXISTS categories CASCADE;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'attendee',
    password_reset_token_hash VARCHAR(64),
    password_reset_expires_at TIMESTAMP(3),
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT users_role_check CHECK (role IN ('attendee', 'organizer', 'admin'))
);

CREATE INDEX users_password_reset_token_hash_idx
ON users(password_reset_token_hash);

CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    address VARCHAR(200),
    city VARCHAR(100),
    latitude NUMERIC(10,7),
    longitude NUMERIC(10,7),
    image_url TEXT,
    image_path VARCHAR(500),
    event_date TIMESTAMP(3) NOT NULL,
    capacity INTEGER NOT NULL,
    price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    organizer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT events_capacity_check CHECK (capacity > 0),
    CONSTRAINT events_price_check CHECK (price >= 0)
);

CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    booking_date TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'confirmed',
    payment_status VARCHAR(20),
    stripe_checkout_session_id VARCHAR(255),
    stripe_payment_intent_id VARCHAR(255),
    stripe_event_id VARCHAR(255),
    amount_paid NUMERIC(10,2),
    currency VARCHAR(3) NOT NULL DEFAULT 'eur',
    CONSTRAINT bookings_user_event_unique UNIQUE(user_id, event_id),
    CONSTRAINT bookings_status_check CHECK (status IN ('pending_payment', 'confirmed', 'cancelled')),
    CONSTRAINT bookings_payment_status_check CHECK (
        payment_status IS NULL
        OR payment_status IN ('unpaid', 'paid', 'failed', 'cancelled', 'expired')
    )
);

CREATE TABLE ticket_tiers (
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

CREATE INDEX ticket_tiers_event_id_idx
ON ticket_tiers(event_id);

CREATE TABLE booking_items (
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

CREATE INDEX booking_items_booking_id_idx
ON booking_items(booking_id);

CREATE INDEX booking_items_ticket_tier_id_idx
ON booking_items(ticket_tier_id);

CREATE TABLE tickets (
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

CREATE INDEX tickets_booking_id_idx
ON tickets(booking_id);

CREATE INDEX tickets_event_id_idx
ON tickets(event_id);

CREATE INDEX tickets_user_id_idx
ON tickets(user_id);

CREATE INDEX tickets_ticket_tier_id_idx
ON tickets(ticket_tier_id);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    dedupe_key VARCHAR(255),
    read_at TIMESTAMP(3),
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT notifications_user_dedupe_unique UNIQUE(user_id, dedupe_key)
);

CREATE INDEX notifications_user_id_created_at_idx
ON notifications(user_id, created_at DESC);

CREATE INDEX notifications_user_id_read_at_idx
ON notifications(user_id, read_at);

CREATE TABLE feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL,
    comment TEXT,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT feedback_user_event_unique UNIQUE(user_id, event_id),
    CONSTRAINT feedback_rating_check CHECK (rating BETWEEN 1 AND 5)
);
