import prisma from "../config/prisma.js";
import { Prisma } from "@prisma/client";
import {
  ANALYTICS_CURRENCY,
  eurosToCents,
  revenueBookingSqlCondition,
  revenueBookingWhere,
  toUtcDateKey,
  zeroFillDailySeries,
} from "../utils/adminAnalytics.js";

const toNumber = (value) => Number(value || 0);

const sumRevenueCents = async (where) => {
  const result = await prisma.booking.aggregate({
    where,
    _sum: {
      amount_paid: true,
    },
  });

  return eurosToCents(result._sum.amount_paid);
};

const getSummary = async ({ now = new Date() } = {}) => {
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    newUsersLast30Days,
    totalEvents,
    upcomingEvents,
    pastEvents,
    totalBookings,
    confirmedBookings,
    cancelledBookings,
    pendingPaymentBookings,
    totalRevenueCents,
    last30DaysRevenueCents,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { created_at: { gte: last30Days } } }),
    prisma.event.count(),
    prisma.event.count({ where: { event_date: { gte: now } } }),
    prisma.event.count({ where: { event_date: { lt: now } } }),
    prisma.booking.count(),
    prisma.booking.count({ where: { status: "confirmed" } }),
    prisma.booking.count({ where: { status: "cancelled" } }),
    prisma.booking.count({ where: { status: "pending_payment" } }),
    sumRevenueCents(revenueBookingWhere()),
    sumRevenueCents(revenueBookingWhere({ booking_date: { gte: last30Days } })),
  ]);

  return {
    users: {
      total: totalUsers,
      newLast30Days: newUsersLast30Days,
    },
    events: {
      total: totalEvents,
      upcoming: upcomingEvents,
      past: pastEvents,
    },
    bookings: {
      total: totalBookings,
      confirmed: confirmedBookings,
      cancelled: cancelledBookings,
      pendingPayment: pendingPaymentBookings,
    },
    revenue: {
      totalCents: totalRevenueCents,
      currency: ANALYTICS_CURRENCY,
      last30DaysCents: last30DaysRevenueCents,
    },
  };
};

const groupRowsByDate = ({ records, dateField, valueMapper = () => 1 }) => {
  const valuesByDate = new Map();

  for (const record of records) {
    const date = toUtcDateKey(record[dateField]);
    valuesByDate.set(date, (valuesByDate.get(date) || 0) + valueMapper(record));
  }

  return [...valuesByDate.entries()].map(([date, value]) => ({ date, value }));
};

const getTimeseries = async ({ metric, from, to }) => {
  const dateWhere = { gte: from, lte: to };
  let rows;

  if (metric === "users_created") {
    const records = await prisma.user.findMany({
      where: { created_at: dateWhere },
      select: { created_at: true },
    });
    rows = groupRowsByDate({ records, dateField: "created_at" });
  } else if (metric === "events_created") {
    const records = await prisma.event.findMany({
      where: { created_at: dateWhere },
      select: { created_at: true },
    });
    rows = groupRowsByDate({ records, dateField: "created_at" });
  } else if (metric === "bookings_created") {
    const records = await prisma.booking.findMany({
      where: { booking_date: dateWhere },
      select: { booking_date: true },
    });
    rows = groupRowsByDate({ records, dateField: "booking_date" });
  } else {
    const records = await prisma.booking.findMany({
      where: revenueBookingWhere({ booking_date: dateWhere }),
      select: {
        booking_date: true,
        amount_paid: true,
      },
    });
    rows = groupRowsByDate({
      records,
      dateField: "booking_date",
      valueMapper: (record) => eurosToCents(record.amount_paid),
    });
  }

  return zeroFillDailySeries({ from, to, rows });
};

const formatEventLeaderboardRow = (row) => ({
  eventId: row.event_id,
  title: row.title,
  organizerId: row.organizer_id,
  organizerName: [row.first_name, row.last_name].filter(Boolean).join(" "),
  eventDate: row.event_date,
  bookingsCount: Number(row.bookings_count || 0),
  revenueCents: eurosToCents(row.revenue_euros),
  currency: ANALYTICS_CURRENCY,
});

const getTopEvents = async ({ sortBy, limit, from, to }) => {
  const whereClause = from && to
    ? Prisma.sql`WHERE e.event_date >= ${from} AND e.event_date <= ${to}`
    : from
      ? Prisma.sql`WHERE e.event_date >= ${from}`
      : to
        ? Prisma.sql`WHERE e.event_date <= ${to}`
        : Prisma.empty;
  const orderBy = sortBy === "bookings"
    ? Prisma.sql`bookings_count DESC, revenue_euros DESC, e.event_date ASC`
    : Prisma.sql`revenue_euros DESC, bookings_count DESC, e.event_date ASC`;

  const rows = await prisma.$queryRaw`
    SELECT
      e.id AS event_id,
      e.title,
      e.organizer_id,
      e.event_date,
      u.first_name,
      u.last_name,
      COUNT(b.id) FILTER (WHERE b.status = 'confirmed')::int AS bookings_count,
      COALESCE(SUM(CASE WHEN ${revenueBookingSqlCondition("b")} THEN b.amount_paid ELSE 0 END), 0) AS revenue_euros
    FROM events e
    JOIN users u ON u.id = e.organizer_id
    LEFT JOIN bookings b ON b.event_id = e.id
    ${whereClause}
    GROUP BY e.id, u.id
    ORDER BY ${orderBy}
    LIMIT ${limit}
  `;

  return rows.map(formatEventLeaderboardRow);
};

const formatOrganizerLeaderboardRow = (row) => ({
  organizerId: row.organizer_id,
  name: [row.first_name, row.last_name].filter(Boolean).join(" "),
  email: row.email,
  eventsCount: Number(row.events_count || 0),
  bookingsCount: Number(row.bookings_count || 0),
  revenueCents: eurosToCents(row.revenue_euros),
  currency: ANALYTICS_CURRENCY,
});

const getTopOrganizers = async ({ sortBy, limit }) => {
  const orderBy = sortBy === "events"
    ? Prisma.sql`events_count DESC, revenue_euros DESC, bookings_count DESC`
    : sortBy === "bookings"
      ? Prisma.sql`bookings_count DESC, revenue_euros DESC, events_count DESC`
      : Prisma.sql`revenue_euros DESC, bookings_count DESC, events_count DESC`;

  const rows = await prisma.$queryRaw`
    SELECT
      u.id AS organizer_id,
      u.first_name,
      u.last_name,
      u.email,
      COUNT(DISTINCT e.id)::int AS events_count,
      COUNT(b.id) FILTER (WHERE b.status = 'confirmed')::int AS bookings_count,
      COALESCE(SUM(CASE WHEN ${revenueBookingSqlCondition("b")} THEN b.amount_paid ELSE 0 END), 0) AS revenue_euros
    FROM users u
    LEFT JOIN events e ON e.organizer_id = u.id
    LEFT JOIN bookings b ON b.event_id = e.id
    WHERE u.role IN ('organizer', 'admin')
    GROUP BY u.id
    ORDER BY ${orderBy}
    LIMIT ${limit}
  `;

  return rows.map(formatOrganizerLeaderboardRow);
};

export default {
  getSummary,
  getTimeseries,
  getTopEvents,
  getTopOrganizers,
};
