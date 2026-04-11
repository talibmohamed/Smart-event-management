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

const flattenEvent = (event) => {
  if (!event) {
    return null;
  }

  const { organizer, ...eventData } = event;

  return {
    ...eventData,
    first_name: organizer.first_name,
    last_name: organizer.last_name,
    organizer_email: organizer.email,
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
  event_date,
  capacity,
  price,
  organizer_id,
}) => {
  return prisma.event.create({
    data: {
      title,
      description,
      category,
      address,
      city,
      latitude,
      longitude,
      event_date: new Date(event_date),
      capacity,
      price,
      organizer_id,
    },
  });
};

const getAllEvents = async () => {
  const events = await prisma.event.findMany({
    include: eventWithOrganizer,
    orderBy: {
      event_date: "asc",
    },
  });

  return events.map(flattenEvent);
};

const getEventById = async (id) => {
  const event = await prisma.event.findUnique({
    where: { id },
    include: eventWithOrganizer,
  });

  return flattenEvent(event);
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
    event_date,
    capacity,
    price,
  }
) => {
  return prisma.event.update({
    where: { id },
    data: {
      title,
      description,
      category,
      address,
      city,
      latitude,
      longitude,
      event_date: new Date(event_date),
      capacity,
      price,
    },
  });
};

const deleteEvent = async (id) => {
  return prisma.event.delete({
    where: { id },
  });
};

export default {
  createEvent,
  getAllEvents,
  getEventById,
  updateEvent,
  deleteEvent,
};
