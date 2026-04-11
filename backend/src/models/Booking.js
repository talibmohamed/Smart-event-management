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
    },
  });
};

const reactivateBooking = async (id) => {
  return prisma.booking.update({
    where: { id },
    data: {
      status: "confirmed",
    },
  });
};

const cancelBooking = async (id) => {
  return prisma.booking.update({
    where: { id },
    data: {
      status: "cancelled",
    },
  });
};

const getBookingById = async (id) => {
  return prisma.booking.findUnique({
    where: { id },
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
  reactivateBooking,
  cancelBooking,
  getBookingById,
  countConfirmedBookingsForEvent,
  getMyBookings,
};
