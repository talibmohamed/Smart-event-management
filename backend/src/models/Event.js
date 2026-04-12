import prisma from "../config/prisma.js";

const eventWithOrganizer = {
  organizer: {
    select: {
      first_name: true,
      last_name: true,
      email: true,
    },
  },
};

const hideInternalEventFields = (event) => {
  if (!event) {
    return null;
  }

  const { image_path, ...publicEvent } = event;
  return publicEvent;
};

const flattenEvent = (event) => {
  if (!event) {
    return null;
  }

  const { organizer, ...eventData } = hideInternalEventFields(event);

  return {
    ...eventData,
    first_name: organizer.first_name,
    last_name: organizer.last_name,
    organizer_email: organizer.email,
  };
};

const addBookingStats = async (event) => {
  if (!event) {
    return null;
  }

  const confirmed_bookings = await prisma.booking.count({
    where: {
      event_id: event.id,
      status: "confirmed",
    },
  });
  const remaining_seats = Math.max(event.capacity - confirmed_bookings, 0);

  return {
    ...event,
    confirmed_bookings,
    remaining_seats,
    is_full: remaining_seats === 0,
  };
};

const createEvent = async ({
  title,
  description,
  category,
  address,
  city,
  latitude,
  longitude,
  image_url,
  image_path,
  event_date,
  capacity,
  price,
  organizer_id,
}) => {
  const event = await prisma.event.create({
    data: {
      title,
      description,
      category,
      address,
      city,
      latitude,
      longitude,
      image_url,
      image_path,
      event_date: new Date(event_date),
      capacity,
      price,
      organizer_id,
    },
  });

  return hideInternalEventFields(event);
};

const getAllEvents = async () => {
  const events = await prisma.event.findMany({
    include: eventWithOrganizer,
    orderBy: {
      event_date: "asc",
    },
  });

  return Promise.all(events.map((event) => addBookingStats(flattenEvent(event))));
};

const getEventById = async (id) => {
  const event = await prisma.event.findUnique({
    where: { id },
    include: eventWithOrganizer,
  });

  return addBookingStats(flattenEvent(event));
};

const getEventRecordById = async (id) => {
  return prisma.event.findUnique({
    where: { id },
  });
};

const updateEvent = async (
  id,
  {
    title,
    description,
    category,
    address,
    city,
    latitude,
    longitude,
    image_url,
    image_path,
    event_date,
    capacity,
    price,
  }
) => {
  const event = await prisma.event.update({
    where: { id },
    data: {
      title,
      description,
      category,
      address,
      city,
      latitude,
      longitude,
      image_url,
      image_path,
      event_date: new Date(event_date),
      capacity,
      price,
    },
  });

  return hideInternalEventFields(event);
};

const deleteEvent = async (id) => {
  const event = await prisma.event.delete({
    where: { id },
  });

  return hideInternalEventFields(event);
};

export default {
  createEvent,
  getAllEvents,
  getEventById,
  getEventRecordById,
  updateEvent,
  deleteEvent,
};
