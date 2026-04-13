import prisma from "../config/prisma.js";
import { MAX_TICKETS_PER_BOOKING } from "../utils/ticketTiers.js";

const toNumber = (value) => Number(value || 0);

const formatBookingItem = (item) => ({
  id: item.id,
  booking_id: item.booking_id,
  ticket_tier_id: item.ticket_tier_id,
  quantity: Number(item.quantity),
  unit_price: toNumber(item.unit_price).toFixed(2),
  total_price: toNumber(item.total_price).toFixed(2),
  ticket_tier: item.tier_name
    ? {
        id: item.ticket_tier_id,
        name: item.tier_name,
        description: item.tier_description,
        price: toNumber(item.tier_price).toFixed(2),
      }
    : undefined,
});

const getBookingItems = async (booking_id, client = prisma) => {
  const items = await client.$queryRaw`
    SELECT
      bi.id,
      bi.booking_id,
      bi.ticket_tier_id,
      bi.quantity,
      bi.unit_price,
      bi.total_price,
      tt.name AS tier_name,
      tt.description AS tier_description,
      tt.price AS tier_price
    FROM booking_items bi
    JOIN ticket_tiers tt ON tt.id = bi.ticket_tier_id
    WHERE bi.booking_id = CAST(${booking_id} AS uuid)
    ORDER BY tt.sort_order ASC, tt.created_at ASC
  `;

  return items.map(formatBookingItem);
};

const addItemsToBooking = async (booking) => {
  if (!booking) {
    return null;
  }

  const items = await getBookingItems(booking.id);
  const total_price = items
    .reduce((sum, item) => sum + toNumber(item.total_price), 0)
    .toFixed(2);

  return {
    ...booking,
    amount_paid: booking.amount_paid === null || booking.amount_paid === undefined
      ? null
      : toNumber(booking.amount_paid).toFixed(2),
    items,
    total_quantity: items.reduce((sum, item) => sum + item.quantity, 0),
    total_price,
  };
};

const flattenBookingWithEvent = async (booking) => {
  if (!booking) {
    return null;
  }

  const { event, ...bookingData } = booking;
  const bookingWithItems = await addItemsToBooking(bookingData);

  return {
    ...bookingWithItems,
    title: event.title,
    description: event.description,
    category: event.category,
    address: event.address,
    city: event.city,
    latitude: event.latitude,
    longitude: event.longitude,
    image_url: event.image_url,
    event_date: event.event_date,
    capacity: event.capacity,
    price: toNumber(event.price).toFixed(2),
    organizer_id: event.organizer_id,
  };
};

const findBookingByUserAndEvent = async (user_id, event_id) => {
  return prisma.booking.findUnique({
    where: {
      user_id_event_id: {
        user_id,
        event_id,
      },
    },
  });
};

const countConfirmedTicketsForEvent = async (event_id, client = prisma) => {
  const rows = await client.$queryRaw`
    SELECT COALESCE(SUM(bi.quantity), 0)::int AS total
    FROM booking_items bi
    JOIN bookings b ON b.id = bi.booking_id
    WHERE b.event_id = CAST(${event_id} AS uuid)
      AND b.status = 'confirmed'
  `;

  return Number(rows[0]?.total || 0);
};

const getActiveTiersForEvent = async (event_id, client = prisma) => {
  return client.$queryRaw`
    SELECT
      tt.id,
      tt.event_id,
      tt.name,
      tt.description,
      tt.price,
      tt.capacity,
      tt.is_active,
      tt.sort_order,
      COALESCE(SUM(CASE WHEN b.status = 'confirmed' THEN bi.quantity ELSE 0 END), 0)::int AS sold_quantity
    FROM ticket_tiers tt
    LEFT JOIN booking_items bi ON bi.ticket_tier_id = tt.id
    LEFT JOIN bookings b ON b.id = bi.booking_id
    WHERE tt.event_id = CAST(${event_id} AS uuid)
      AND tt.is_active = TRUE
    GROUP BY tt.id
    ORDER BY tt.sort_order ASC, tt.created_at ASC
  `;
};

const prepareBookingItems = async ({ event, items }) => {
  const activeTiers = await getActiveTiersForEvent(event.id);

  if (!activeTiers.length) {
    const error = new Error("No active ticket tiers are available for this event");
    error.statusCode = 400;
    throw error;
  }

  const requestedItems = items || [
    {
      ticket_tier_id: activeTiers[0].id,
      quantity: 1,
    },
  ];
  const quantitiesByTier = new Map();

  for (const item of requestedItems) {
    quantitiesByTier.set(
      item.ticket_tier_id,
      (quantitiesByTier.get(item.ticket_tier_id) || 0) + Number(item.quantity)
    );
  }

  const totalQuantity = [...quantitiesByTier.values()].reduce(
    (sum, quantity) => sum + quantity,
    0
  );

  if (totalQuantity > MAX_TICKETS_PER_BOOKING) {
    const error = new Error("You can book a maximum of 5 tickets per booking");
    error.statusCode = 400;
    throw error;
  }

  const confirmedTickets = await countConfirmedTicketsForEvent(event.id);

  if (confirmedTickets + totalQuantity > Number(event.capacity)) {
    const error = new Error("This event is fully booked");
    error.statusCode = 400;
    throw error;
  }

  const tiersById = new Map(activeTiers.map((tier) => [tier.id, tier]));
  const bookingItems = [];

  for (const [ticketTierId, quantity] of quantitiesByTier.entries()) {
    const tier = tiersById.get(ticketTierId);

    if (!tier) {
      const error = new Error("Booking items must reference active ticket tiers for this event");
      error.statusCode = 400;
      throw error;
    }

    const remainingQuantity = Number(tier.capacity) - Number(tier.sold_quantity || 0);

    if (quantity > remainingQuantity) {
      const error = new Error("Requested ticket quantity exceeds tier availability");
      error.statusCode = 400;
      throw error;
    }

    const unitPrice = toNumber(tier.price);
    const totalPrice = unitPrice * quantity;

    bookingItems.push({
      ticket_tier_id: ticketTierId,
      quantity,
      unit_price: unitPrice,
      total_price: totalPrice,
      ticket_tier: {
        id: tier.id,
        name: tier.name,
        description: tier.description,
        price: tier.price,
      },
    });
  }

  return {
    items: bookingItems,
    totalQuantity,
    totalAmount: bookingItems.reduce((sum, item) => sum + item.total_price, 0),
  };
};

const createBookingItems = async (client, booking_id, items) => {
  for (const item of items) {
    await client.$executeRaw`
      INSERT INTO booking_items (
        booking_id,
        ticket_tier_id,
        quantity,
        unit_price,
        total_price
      )
      VALUES (
        CAST(${booking_id} AS uuid),
        CAST(${item.ticket_tier_id} AS uuid),
        ${item.quantity},
        ${item.unit_price},
        ${item.total_price}
      )
    `;
  }
};

const createBookingWithStatus = async ({
  user_id,
  event_id,
  status,
  payment_status,
  amount_paid = null,
  currency = "eur",
  items,
}) => {
  const booking = await prisma.$transaction(async (tx) => {
    const createdBooking = await tx.booking.create({
      data: {
        user_id,
        event_id,
        status,
        payment_status,
        amount_paid,
        currency,
      },
    });

    await createBookingItems(tx, createdBooking.id, items);

    return createdBooking;
  });

  return addItemsToBooking(booking);
};

const reactivateBooking = async (
  id,
  { status, payment_status, amount_paid = null, currency = "eur", items }
) => {
  const booking = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      DELETE FROM booking_items
      WHERE booking_id = CAST(${id} AS uuid)
    `;

    const updatedBooking = await tx.booking.update({
      where: { id },
      data: {
        status,
        payment_status,
        stripe_checkout_session_id: null,
        stripe_payment_intent_id: null,
        stripe_event_id: null,
        amount_paid,
        currency,
      },
    });

    await createBookingItems(tx, updatedBooking.id, items);

    return updatedBooking;
  });

  return addItemsToBooking(booking);
};

const cancelBooking = async (id) => {
  const booking = await prisma.booking.update({
    where: { id },
    data: {
      status: "cancelled",
      payment_status: "cancelled",
    },
  });

  return addItemsToBooking(booking);
};

const getBookingById = async (id) => {
  return prisma.booking.findUnique({
    where: { id },
  });
};

const getBookingWithEventById = async (id) => {
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      event: true,
    },
  });

  if (!booking) {
    return null;
  }

  const items = await getBookingItems(booking.id);

  return {
    ...booking,
    items,
    total_quantity: items.reduce((sum, item) => sum + item.quantity, 0),
    total_price: items.reduce((sum, item) => sum + toNumber(item.total_price), 0).toFixed(2),
  };
};

const getBookingEmailContextById = async (id) => {
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          first_name: true,
          last_name: true,
          email: true,
        },
      },
      event: {
        include: {
          organizer: {
            select: {
              first_name: true,
              last_name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  if (!booking) {
    return null;
  }

  const items = await getBookingItems(booking.id);

  return {
    ...booking,
    items,
    total_quantity: items.reduce((sum, item) => sum + item.quantity, 0),
    total_price: items.reduce((sum, item) => sum + toNumber(item.total_price), 0).toFixed(2),
  };
};

const getBookingSummaryById = async (id) => {
  const booking = await getBookingWithEventById(id);
  return flattenBookingWithEvent(booking);
};

const updateCheckoutSession = async (id, stripe_checkout_session_id) => {
  const booking = await prisma.booking.update({
    where: { id },
    data: {
      stripe_checkout_session_id,
    },
  });

  return addItemsToBooking(booking);
};

const failPayment = async (
  id,
  { stripe_event_id, stripe_payment_intent_id, amount_paid, currency }
) => {
  const booking = await prisma.booking.update({
    where: { id },
    data: {
      status: "cancelled",
      payment_status: "failed",
      stripe_event_id,
      stripe_payment_intent_id,
      amount_paid,
      currency,
    },
  });

  return addItemsToBooking(booking);
};

const expirePayment = async (id, stripe_event_id) => {
  const booking = await prisma.booking.update({
    where: { id },
    data: {
      status: "cancelled",
      payment_status: "expired",
      stripe_event_id,
    },
  });

  return addItemsToBooking(booking);
};

const confirmPaidBooking = async (
  id,
  { stripe_event_id, stripe_payment_intent_id, amount_paid, currency }
) => {
  const booking = await prisma.booking.update({
    where: { id },
    data: {
      status: "confirmed",
      payment_status: "paid",
      stripe_event_id,
      stripe_payment_intent_id,
      amount_paid,
      currency,
    },
  });

  return addItemsToBooking(booking);
};

const markStripeEventProcessed = async (id, stripe_event_id) => {
  return prisma.booking.update({
    where: { id },
    data: {
      stripe_event_id,
    },
  });
};

const canConfirmPendingBookingCapacity = async (booking) => {
  const requestedQuantity = booking.items.reduce((sum, item) => sum + item.quantity, 0);
  const confirmedTickets = await countConfirmedTicketsForEvent(booking.event_id);

  if (confirmedTickets + requestedQuantity > Number(booking.event.capacity)) {
    return false;
  }

  const activeTiers = await getActiveTiersForEvent(booking.event_id);
  const tiersById = new Map(activeTiers.map((tier) => [tier.id, tier]));

  return booking.items.every((item) => {
    const tier = tiersById.get(item.ticket_tier_id);

    if (!tier) {
      return false;
    }

    const remainingQuantity = Number(tier.capacity) - Number(tier.sold_quantity || 0);
    return item.quantity <= remainingQuantity;
  });
};

const getBookingTotalAmount = (booking) => {
  return booking.items.reduce((sum, item) => sum + toNumber(item.total_price), 0);
};

const getMyBookings = async (user_id) => {
  const bookings = await prisma.booking.findMany({
    where: { user_id },
    include: {
      event: true,
    },
    orderBy: {
      booking_date: "desc",
    },
  });

  return Promise.all(bookings.map(flattenBookingWithEvent));
};

const formatAttendeeRow = (row) => ({
  booking_id: row.booking_id,
  booking_date: row.booking_date,
  status: row.status,
  payment_status: row.payment_status,
  attendee: {
    id: row.attendee_id,
    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email,
  },
  item: row.booking_item_id
    ? {
        ticket_tier_id: row.ticket_tier_id,
        ticket_tier_name: row.ticket_tier_name,
        quantity: Number(row.quantity),
        unit_price: toNumber(row.unit_price).toFixed(2),
        total_price: toNumber(row.total_price).toFixed(2),
      }
    : null,
});

const groupAttendeeRows = (rows) => {
  const attendeesByBookingId = new Map();

  rows.map(formatAttendeeRow).forEach((row) => {
    if (!attendeesByBookingId.has(row.booking_id)) {
      attendeesByBookingId.set(row.booking_id, {
        booking_id: row.booking_id,
        booking_date: row.booking_date,
        status: row.status,
        payment_status: row.payment_status,
        total_quantity: 0,
        total_price: "0.00",
        attendee: row.attendee,
        items: [],
      });
    }

    const attendee = attendeesByBookingId.get(row.booking_id);

    if (row.item) {
      attendee.items.push(row.item);
      attendee.total_quantity += row.item.quantity;
      attendee.total_price = (
        toNumber(attendee.total_price) + toNumber(row.item.total_price)
      ).toFixed(2);
    }
  });

  return [...attendeesByBookingId.values()];
};

const getEventAttendees = async ({ event_id, status }) => {
  const rows = status === "all"
    ? await prisma.$queryRaw`
        SELECT
          b.id AS booking_id,
          b.booking_date,
          b.status,
          b.payment_status,
          u.id AS attendee_id,
          u.first_name,
          u.last_name,
          u.email,
          bi.id AS booking_item_id,
          bi.ticket_tier_id,
          bi.quantity,
          bi.unit_price,
          bi.total_price,
          tt.name AS ticket_tier_name
        FROM bookings b
        JOIN users u ON u.id = b.user_id
        LEFT JOIN booking_items bi ON bi.booking_id = b.id
        LEFT JOIN ticket_tiers tt ON tt.id = bi.ticket_tier_id
        WHERE b.event_id = CAST(${event_id} AS uuid)
        ORDER BY b.booking_date DESC, tt.sort_order ASC, tt.created_at ASC
      `
    : await prisma.$queryRaw`
        SELECT
          b.id AS booking_id,
          b.booking_date,
          b.status,
          b.payment_status,
          u.id AS attendee_id,
          u.first_name,
          u.last_name,
          u.email,
          bi.id AS booking_item_id,
          bi.ticket_tier_id,
          bi.quantity,
          bi.unit_price,
          bi.total_price,
          tt.name AS ticket_tier_name
        FROM bookings b
        JOIN users u ON u.id = b.user_id
        LEFT JOIN booking_items bi ON bi.booking_id = b.id
        LEFT JOIN ticket_tiers tt ON tt.id = bi.ticket_tier_id
        WHERE b.event_id = CAST(${event_id} AS uuid)
          AND b.status = ${status}
        ORDER BY b.booking_date DESC, tt.sort_order ASC, tt.created_at ASC
      `;

  return groupAttendeeRows(rows);
};

export default {
  findBookingByUserAndEvent,
  createBookingWithStatus,
  reactivateBooking,
  cancelBooking,
  getBookingById,
  getBookingWithEventById,
  getBookingEmailContextById,
  getBookingSummaryById,
  updateCheckoutSession,
  failPayment,
  expirePayment,
  confirmPaidBooking,
  markStripeEventProcessed,
  countConfirmedBookingsForEvent: countConfirmedTicketsForEvent,
  countConfirmedTicketsForEvent,
  canConfirmPendingBookingCapacity,
  getBookingTotalAmount,
  prepareBookingItems,
  getMyBookings,
  getEventAttendees,
};
