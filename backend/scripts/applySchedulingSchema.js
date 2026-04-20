import "dotenv/config";
import prismaPkg from "@prisma/client";

const { PrismaClient } = prismaPkg;

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set.");
  }

  const parsedUrl = new URL(databaseUrl);

  if (parsedUrl.hostname.includes("pooler.supabase.com")) {
    parsedUrl.searchParams.set("pgbouncer", "true");
    parsedUrl.searchParams.set("connection_limit", "1");
  }

  return parsedUrl.toString();
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: getDatabaseUrl(),
    },
  },
});

const statements = [
  `ALTER TABLE events
   ADD COLUMN IF NOT EXISTS event_end_date TIMESTAMP(3)`,
  `ALTER TABLE events
   ADD COLUMN IF NOT EXISTS timezone VARCHAR(100) NOT NULL DEFAULT 'Europe/Paris'`,
  `CREATE INDEX IF NOT EXISTS events_event_date_idx
   ON events(event_date)`,
  `CREATE TABLE IF NOT EXISTS event_tracks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS event_tracks_event_id_idx
   ON event_tracks(event_id)`,
  `CREATE TABLE IF NOT EXISTS event_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    track_id UUID NOT NULL REFERENCES event_tracks(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    speaker_name VARCHAR(150),
    location VARCHAR(150),
    starts_at TIMESTAMP(3) NOT NULL,
    ends_at TIMESTAMP(3) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS event_sessions_event_id_starts_at_idx
   ON event_sessions(event_id, starts_at)`,
  `CREATE INDEX IF NOT EXISTS event_sessions_track_id_starts_at_idx
   ON event_sessions(track_id, starts_at)`,
  `CREATE TABLE IF NOT EXISTS event_reminder_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reminder_key VARCHAR(20) NOT NULL,
    scheduled_for TIMESTAMP(3) NOT NULL,
    sent_at TIMESTAMP(3),
    notification_id UUID REFERENCES notifications(id) ON DELETE SET NULL,
    email_sent BOOLEAN NOT NULL DEFAULT FALSE,
    retry_count INTEGER NOT NULL DEFAULT 0,
    last_attempt_at TIMESTAMP(3),
    last_error TEXT,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS event_reminder_deliveries_event_id_user_id_reminder_key_key
   ON event_reminder_deliveries(event_id, user_id, reminder_key)`,
  `CREATE INDEX IF NOT EXISTS event_reminder_deliveries_scheduled_for_sent_at_idx
   ON event_reminder_deliveries(scheduled_for, sent_at)`,
  `CREATE INDEX IF NOT EXISTS event_reminder_deliveries_user_id_idx
   ON event_reminder_deliveries(user_id)`,
];

try {
  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement);
  }

  console.log("Scheduling schema applied successfully.");
} catch (error) {
  console.error("Scheduling schema failed:", error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
