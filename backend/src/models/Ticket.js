import crypto from "crypto";
import prisma from "../config/prisma.js";

const toNumber = (value) => Number(value || 0);

const createTicketCode = () =>
  `SEM-${crypto.randomBytes(12).toString("hex").toUpperCase()}`;

const formatTicket = (row) => ({
  id: row.id,
  booking_id: row.booking_id,
  booking_item_id: row.booking_item_id,
  event_id: row.event_id,
  user_id: row.user_id,
  ticket_tier_id: row.ticket_tier_id,
  ticket_code: row.ticket_code,
  qr_value: row.ticket_code,
  status: row.status,
  issued_at: row.issued_at,
  checked_in_at: row.checked_in_at,
  booking: row.booking_id
    ? {
        id: row.booking_id,
        status: row.booking_status,
        payment_status: row.payment_status,
      }
    : undefined,
  event: row.event_title
    ? {
        id: row.event_id,
        title: row.event_title,
        event_date: row.event_date,
        address: row.address,
        city: row.city,
        organizer_id: row.organizer_id,
      }
    : undefined,
  ticket_tier: row.ticket_tier_name
    ? {
        id: row.ticket_tier_id,
        name: row.ticket_tier_name,
        price: toNumber(row.ticket_tier_price).toFixed(2),
      }
    : undefined,
  attendee: row.email
    ? {
        id: row.user_id,
        first_name: row.first_name,
        last_name: row.last_name,
        email: row.email,
      }
    : undefined,
});

const getExistingTicketCount = async (booking_id, client = prisma) => {
  const rows = await client.$queryRaw`
    SELECT COUNT(*)::int AS total
    FROM tickets
    WHERE booking_id = CAST(${booking_id} AS uuid)
  `;

  return Number(rows[0]?.total || 0);
};

const getBookingItemsForTicketGeneration = async (booking_id, client = prisma) => {
  return client.$queryRaw`
    SELECT
      b.id AS booking_id,
      b.user_id,
      b.event_id,
      bi.id AS booking_item_id,
      bi.ticket_tier_id,
      bi.quantity
    FROM bookings b
    JOIN booking_items bi ON bi.booking_id = b.id
    WHERE b.id = CAST(${booking_id} AS uuid)
      AND b.status = 'confirmed'
    ORDER BY bi.id ASC
  `;
};

const insertTicket = async (client, item) => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await client.$executeRaw`
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
      if (error.code !== "P2002" && !String(error.message).includes("tickets_ticket_code_key")) {
        throw error;
      }
    }
  }

  throw new Error("Could not generate a unique ticket code");
};

const generateTicketsForBooking = async (booking_id) => {
  return prisma.$transaction(async (tx) => {
    const existingCount = await getExistingTicketCount(booking_id, tx);

    if (existingCount > 0) {
      return {
        created: false,
        tickets: await getTicketsForBooking(booking_id, tx),
      };
    }

    const bookingItems = await getBookingItemsForTicketGeneration(booking_id, tx);

    for (const item of bookingItems) {
      for (let index = 0; index < Number(item.quantity); index += 1) {
        await insertTicket(tx, item);
      }
    }

    return {
      created: true,
      tickets: await getTicketsForBooking(booking_id, tx),
    };
  });
};

const getTicketsForBooking = async (booking_id, client = prisma) => {
  const rows = await client.$queryRaw`
    SELECT
      t.id,
      t.booking_id,
      t.booking_item_id,
      t.event_id,
      t.user_id,
      t.ticket_tier_id,
      t.ticket_code,
      t.status,
      t.issued_at,
      t.checked_in_at,
      b.status AS booking_status,
      b.payment_status,
      e.title AS event_title,
      e.event_date,
      e.address,
      e.city,
      e.organizer_id,
      u.first_name,
      u.last_name,
      u.email,
      tt.name AS ticket_tier_name,
      tt.price AS ticket_tier_price
    FROM tickets t
    JOIN bookings b ON b.id = t.booking_id
    JOIN events e ON e.id = t.event_id
    JOIN users u ON u.id = t.user_id
    JOIN ticket_tiers tt ON tt.id = t.ticket_tier_id
    WHERE t.booking_id = CAST(${booking_id} AS uuid)
    ORDER BY t.issued_at ASC, t.id ASC
  `;

  return rows.map(formatTicket);
};

const getBookingTicketsSummary = async (booking) => {
  const tickets = await getTicketsForBooking(booking.id);
  const firstTicket = tickets[0];

  return {
    booking: {
      id: booking.id,
      status: booking.status,
      payment_status: booking.payment_status,
    },
    event: firstTicket?.event || null,
    tickets: tickets.map((ticket) => ({
      id: ticket.id,
      ticket_code: ticket.ticket_code,
      status: ticket.status,
      qr_value: ticket.qr_value,
      checked_in_at: ticket.checked_in_at,
      ticket_tier: ticket.ticket_tier,
      attendee: {
        first_name: ticket.attendee.first_name,
        last_name: ticket.attendee.last_name,
        email: ticket.attendee.email,
      },
    })),
  };
};

const getTicketByCode = async (ticket_code) => {
  const rows = await prisma.$queryRaw`
    SELECT
      t.id,
      t.booking_id,
      t.booking_item_id,
      t.event_id,
      t.user_id,
      t.ticket_tier_id,
      t.ticket_code,
      t.status,
      t.issued_at,
      t.checked_in_at,
      b.status AS booking_status,
      b.payment_status,
      e.title AS event_title,
      e.event_date,
      e.address,
      e.city,
      e.organizer_id,
      u.first_name,
      u.last_name,
      u.email,
      tt.name AS ticket_tier_name,
      tt.price AS ticket_tier_price
    FROM tickets t
    JOIN bookings b ON b.id = t.booking_id
    JOIN events e ON e.id = t.event_id
    JOIN users u ON u.id = t.user_id
    JOIN ticket_tiers tt ON tt.id = t.ticket_tier_id
    WHERE t.ticket_code = ${ticket_code}
    LIMIT 1
  `;

  return rows[0] ? formatTicket(rows[0]) : null;
};

const checkInTicket = async (ticket_code) => {
  const rows = await prisma.$queryRaw`
    UPDATE tickets
    SET status = 'used',
        checked_in_at = CURRENT_TIMESTAMP
    WHERE ticket_code = ${ticket_code}
      AND status = 'valid'
    RETURNING ticket_code, status, checked_in_at
  `;

  return rows[0] || null;
};

const cancelTicketsForBooking = async (booking_id) => {
  await prisma.$executeRaw`
    UPDATE tickets
    SET status = 'cancelled'
    WHERE booking_id = CAST(${booking_id} AS uuid)
      AND status = 'valid'
  `;

  return getTicketsForBooking(booking_id);
};

export default {
  generateTicketsForBooking,
  getTicketsForBooking,
  getBookingTicketsSummary,
  getTicketByCode,
  checkInTicket,
  cancelTicketsForBooking,
};
