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
  "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20)",
  "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stripe_checkout_session_id VARCHAR(255)",
  "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(255)",
  "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stripe_event_id VARCHAR(255)",
  "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(10,2)",
  "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'eur'",
  "ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check",
  "ALTER TABLE bookings ADD CONSTRAINT bookings_status_check CHECK (status IN ('pending_payment', 'confirmed', 'cancelled'))",
  "ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_payment_status_check",
  "ALTER TABLE bookings ADD CONSTRAINT bookings_payment_status_check CHECK (payment_status IS NULL OR payment_status IN ('unpaid', 'paid', 'failed', 'cancelled', 'expired'))",
];

try {
  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement);
  }

  console.log("Booking payment schema applied successfully.");
} catch (error) {
  console.error("Booking payment schema failed:", error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}

