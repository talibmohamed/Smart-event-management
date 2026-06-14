import prisma from "../config/prisma.js";

const ACTIVE_BOOKING_STATUSES = ["confirmed", "pending_payment"];

const getEventAvailabilityRecord = async (event_id) => {
  const event = await prisma.event.findUnique({
    where: { id: event_id },
    select: {
      id: true,
      title: true,
      capacity: true,
    },
  });

  if (!event) {
    return null;
  }

  const rows = await prisma.$queryRaw`
    SELECT COALESCE(SUM(bi.quantity), 0)::int AS total
    FROM booking_items bi
    JOIN bookings b ON b.id = bi.booking_id
    WHERE b.event_id = CAST(${event_id} AS uuid)
      AND b.status = 'confirmed'
  `;

  const confirmed_tickets = Number(rows[0]?.total || 0);
  const remaining_seats = Math.max(Number(event.capacity) - confirmed_tickets, 0);

  return {
    ...event,
    confirmed_tickets,
    remaining_seats,
    is_full: remaining_seats === 0,
  };
};

const findActiveBookingForUser = async ({ event_id, user_id }) => {
  return prisma.booking.findFirst({
    where: {
      event_id,
      user_id,
      status: {
        in: ACTIVE_BOOKING_STATUSES,
      },
    },
    select: {
      id: true,
      status: true,
      payment_status: true,
    },
  });
};

const joinWaitlist = async ({ event_id, user_id }) => {
  return prisma.waitlist.create({
    data: {
      event_id,
      user_id,
    },
  });
};

const leaveWaitlist = async ({ event_id, user_id }) => {
  return prisma.waitlist.deleteMany({
    where: {
      event_id,
      user_id,
    },
  });
};

const getWaitlistStatus = async ({ event_id, user_id }) => {
  const waitlist = await prisma.waitlist.findMany({
    where: { event_id },
    select: {
      id: true,
      user_id: true,
      created_at: true,
    },
    orderBy: [
      { created_at: "asc" },
      { id: "asc" },
    ],
  });

  const userIndex = waitlist.findIndex((entry) => entry.user_id === user_id);
  const is_waiting = userIndex !== -1;

  return {
    is_waiting,
    position: is_waiting ? userIndex + 1 : null,
    total_waiting: waitlist.length,
  };
};

const removeUserFromEvent = async ({ event_id, user_id, client = prisma }) => {
  return client.waitlist.deleteMany({
    where: {
      event_id,
      user_id,
    },
  });
};

export default {
  getEventAvailabilityRecord,
  findActiveBookingForUser,
  joinWaitlist,
  leaveWaitlist,
  getWaitlistStatus,
  removeUserFromEvent,
};
