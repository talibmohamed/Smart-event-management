import "dotenv/config";
import crypto from "crypto";
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
  `CREATE TABLE IF NOT EXISTS tickets (
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
  )`,
  "CREATE INDEX IF NOT EXISTS tickets_booking_id_idx ON tickets(booking_id)",
  "CREATE INDEX IF NOT EXISTS tickets_event_id_idx ON tickets(event_id)",
  "CREATE INDEX IF NOT EXISTS tickets_user_id_idx ON tickets(user_id)",
  "CREATE INDEX IF NOT EXISTS tickets_ticket_tier_id_idx ON tickets(ticket_tier_id)",
];

const createTicketCode = () =>
  `SEM-${crypto.randomBytes(12).toString("hex").toUpperCase()}`;

async function insertTicket(item) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await prisma.$executeRaw`
        INSERT INTO tickets (
          booking_id,
          booking_item_id,
          event_id,
          user_id,
          ticket_tier_id,
          ticket_code,
          status
        )
        VALUES (
          CAST(${item.booking_id} AS uuid),
          CAST(${item.booking_item_id} AS uuid),
          CAST(${item.event_id} AS uuid),
          CAST(${item.user_id} AS uuid),
          CAST(${item.ticket_tier_id} AS uuid),
          ${createTicketCode()},
          'valid'
        )
      `;
      return;
    } catch (error) {
      if (!String(error.message).includes("tickets_ticket_code_key")) {
        throw error;
      }
    }
  }

  throw new Error("Could not generate a unique ticket code");
}

async function backfillConfirmedBookingTickets() {
  const bookingItems = await prisma.$queryRaw`
    SELECT
      b.id AS booking_id,
      b.user_id,
      b.event_id,
      bi.id AS booking_item_id,
      bi.ticket_tier_id,
      bi.quantity
    FROM bookings b
    JOIN booking_items bi ON bi.booking_id = b.id
    WHERE b.status = 'confirmed'
      AND NOT EXISTS (
        SELECT 1 FROM tickets t WHERE t.booking_id = b.id
      )
    ORDER BY b.booking_date ASC, bi.id ASC
  `;

  for (const item of bookingItems) {
    for (let index = 0; index < Number(item.quantity); index += 1) {
      await insertTicket(item);
    }
  }
}

try {
  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement);
  }

  await backfillConfirmedBookingTickets();

  console.log("Ticket schema applied successfully.");
} catch (error) {
  console.error("Ticket schema failed:", error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
