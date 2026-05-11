import { eurosToCents } from "../utils/adminAnalytics.js";
import prisma from "../config/prisma.js";

export const BOOKING_STATUSES = ["confirmed", "pending_payment", "cancelled"];
export const PAYMENT_STATUSES = ["unpaid", "paid", "failed", "cancelled", "expired"];

export const transactionListSelect = {
  id: true,
  booking_date: true,
  status: true,
  payment_status: true,
  amount_paid: true,
  currency: true,
  stripe_checkout_session_id: true,
  stripe_payment_intent_id: true,
  stripe_event_id: true,
  user: {
    select: {
      id: true,
      first_name: true,
      last_name: true,
      email: true,
    },
  },
  event: {
    select: {
      id: true,
      title: true,
      event_date: true,
    },
  },
  _count: {
    select: {
      tickets: true,
    },
  },
};

export const transactionDetailSelect = {
  ...transactionListSelect,
  event: {
    select: {
      id: true,
      title: true,
      event_date: true,
      organizer: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
        },
      },
    },
  },
  items: {
    select: {
      ticket_tier_id: true,
      quantity: true,
      unit_price: true,
      total_price: true,
      ticketTier: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      ticketTier: {
        sort_order: "asc",
      },
    },
  },
  tickets: {
    select: {
      ticket_code: true,
    },
    orderBy: {
      issued_at: "asc",
    },
    take: 50,
  },
};

const formatName = (record = {}) =>
  [record.first_name, record.last_name].filter(Boolean).join(" ");

const formatAmountCents = (amountPaid) => {
  if (amountPaid === null || amountPaid === undefined) {
    return null;
  }

  return eurosToCents(amountPaid);
};

export const formatTransactionListItem = (booking) => ({
  id: booking.id,
  bookingDate: booking.booking_date,
  status: booking.status,
  paymentStatus: booking.payment_status,
  amountPaidCents: formatAmountCents(booking.amount_paid),
  currency: booking.currency,
  user: {
    id: booking.user.id,
    email: booking.user.email,
    name: formatName(booking.user),
  },
  event: {
    id: booking.event.id,
    title: booking.event.title,
    eventDate: booking.event.event_date,
  },
  stripe: {
    checkoutSessionId: booking.stripe_checkout_session_id,
    paymentIntentId: booking.stripe_payment_intent_id,
    eventId: booking.stripe_event_id,
  },
  ticketsCount: booking._count?.tickets ?? 0,
});

export const formatTransactionDetail = (booking) => {
  const item = formatTransactionListItem(booking);
  const ticketCodes = (booking.tickets || []).map((ticket) => ticket.ticket_code);

  return {
    ...item,
    event: {
      ...item.event,
      organizer: {
        id: booking.event.organizer.id,
        name: formatName(booking.event.organizer),
        email: booking.event.organizer.email,
      },
    },
    items: (booking.items || []).map((bookingItem) => ({
      ticketTierId: bookingItem.ticket_tier_id,
      ticketTierName: bookingItem.ticketTier?.name || "Ticket tier",
      quantity: Number(bookingItem.quantity),
      unitPriceCents: eurosToCents(bookingItem.unit_price),
      totalPriceCents: eurosToCents(bookingItem.total_price),
    })),
    ticketCodes,
    ticketCodesReturned: ticketCodes.length,
    ticketCodesTruncated: (booking._count?.tickets ?? 0) > ticketCodes.length,
  };
};

export const buildTransactionWhere = ({
  q,
  status,
  paymentStatus,
  dateFrom,
  dateTo,
} = {}) => {
  const where = {};

  if (q) {
    const query = String(q).trim();

    if (query) {
      const nameParts = query.split(/\s+/).filter(Boolean);
      const fullNameMatches = [];

      if (nameParts.length >= 2) {
        const firstPart = nameParts[0];
        const lastPart = nameParts.slice(1).join(" ");

        fullNameMatches.push(
          {
            user: {
              AND: [
                { first_name: { contains: firstPart, mode: "insensitive" } },
                { last_name: { contains: lastPart, mode: "insensitive" } },
              ],
            },
          },
          {
            user: {
              AND: [
                { first_name: { contains: lastPart, mode: "insensitive" } },
                { last_name: { contains: firstPart, mode: "insensitive" } },
              ],
            },
          }
        );
      }

      where.OR = [
        { user: { email: { contains: query, mode: "insensitive" } } },
        { user: { first_name: { contains: query, mode: "insensitive" } } },
        { user: { last_name: { contains: query, mode: "insensitive" } } },
        ...fullNameMatches,
        { event: { title: { contains: query, mode: "insensitive" } } },
        { stripe_checkout_session_id: { contains: query, mode: "insensitive" } },
        { stripe_payment_intent_id: { contains: query, mode: "insensitive" } },
      ];
    }
  }

  if (status) {
    where.status = status;
  }

  if (paymentStatus) {
    where.payment_status = paymentStatus;
  }

  if (dateFrom || dateTo) {
    where.booking_date = {
      ...(dateFrom ? { gte: dateFrom } : {}),
      ...(dateTo ? { lte: dateTo } : {}),
    };
  }

  return where;
};

const listTransactions = async ({ where, skip, take, orderBy }) => {
  const [transactions, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      skip,
      take,
      orderBy,
      select: transactionListSelect,
    }),
    prisma.booking.count({ where }),
  ]);

  return {
    items: transactions.map(formatTransactionListItem),
    total,
  };
};

const getTransactionById = async (id) => {
  const transaction = await prisma.booking.findUnique({
    where: { id },
    select: transactionDetailSelect,
  });

  return transaction ? formatTransactionDetail(transaction) : null;
};

export default {
  BOOKING_STATUSES,
  PAYMENT_STATUSES,
  buildTransactionWhere,
  listTransactions,
  getTransactionById,
};
