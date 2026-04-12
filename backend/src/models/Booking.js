import prisma from "../config/prisma.js";

const flattenBookingWithEvent = (booking) => {
  if (!booking) {
    return null;
  }

  const { event, ...bookingData } = booking;

  return {
    ...bookingData,
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
    price: event.price,
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

const createBooking = async ({ user_id, event_id }) => {
  return prisma.booking.create({
    data: {
      user_id,
      event_id,
      status: "confirmed",
      payment_status: "paid",
      amount_paid: 0,
      currency: "eur",
    },
  });
};

const createBookingWithStatus = async ({
  user_id,
  event_id,
  status,
  payment_status,
  amount_paid = null,
  currency = "eur",
}) => {
  return prisma.booking.create({
    data: {
      user_id,
      event_id,
      status,
      payment_status,
      amount_paid,
      currency,
    },
  });
};

const reactivateBooking = async (
  id,
  { status, payment_status, amount_paid = null, currency = "eur" }
) => {
  return prisma.booking.update({
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
};

const cancelBooking = async (id) => {
  return prisma.booking.update({
    where: { id },
    data: {
      status: "cancelled",
      payment_status: "cancelled",
    },
  });
};

const getBookingById = async (id) => {
  return prisma.booking.findUnique({
    where: { id },
  });
};

const getBookingWithEventById = async (id) => {
  return prisma.booking.findUnique({
    where: { id },
    include: {
      event: true,
    },
  });
};

const getBookingSummaryById = async (id) => {
  const booking = await getBookingWithEventById(id);
  return flattenBookingWithEvent(booking);
};

const updateCheckoutSession = async (id, stripe_checkout_session_id) => {
  return prisma.booking.update({
    where: { id },
    data: {
      stripe_checkout_session_id,
    },
  });
};

const failPayment = async (
  id,
  { stripe_event_id, stripe_payment_intent_id, amount_paid, currency }
) => {
  return prisma.booking.update({
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
};

const expirePayment = async (id, stripe_event_id) => {
  return prisma.booking.update({
    where: { id },
    data: {
      status: "cancelled",
      payment_status: "expired",
      stripe_event_id,
    },
  });
};

const confirmPaidBooking = async (
  id,
  { stripe_event_id, stripe_payment_intent_id, amount_paid, currency }
) => {
  return prisma.booking.update({
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
};

const markStripeEventProcessed = async (id, stripe_event_id) => {
  return prisma.booking.update({
    where: { id },
    data: {
      stripe_event_id,
    },
  });
};

const countConfirmedBookingsForEvent = async (event_id) => {
  return prisma.booking.count({
    where: {
      event_id,
      status: "confirmed",
    },
  });
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

  return bookings.map(flattenBookingWithEvent);
};

export default {
  findBookingByUserAndEvent,
  createBooking,
  createBookingWithStatus,
  reactivateBooking,
  cancelBooking,
  getBookingById,
  getBookingWithEventById,
  getBookingSummaryById,
  updateCheckoutSession,
  failPayment,
  expirePayment,
  confirmPaidBooking,
  markStripeEventProcessed,
  countConfirmedBookingsForEvent,
  getMyBookings,
};
