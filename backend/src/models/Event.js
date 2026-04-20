import prisma from "../config/prisma.js";
import { formatAgendaTrack } from "../utils/agenda.js";

const eventWithOrganizer = {
  organizer: {
    select: {
      first_name: true,
      last_name: true,
      email: true,
    },
  },
};

const toNumber = (value) => Number(value || 0);

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

const formatEventBaseFields = (event) => ({
  ...event,
  timezone: event.timezone || "Europe/Paris",
});

const getAgendaForEvent = async (event_id, client = prisma) => {
  const tracks = await client.eventTrack.findMany({
    where: { event_id },
    include: {
      sessions: {
        orderBy: [
          { starts_at: "asc" },
          { sort_order: "asc" },
        ],
      },
    },
    orderBy: [
      { sort_order: "asc" },
      { created_at: "asc" },
    ],
  });

  return tracks.map(formatAgendaTrack);
};

const countAgendaSessionsForEvent = async (event_id, client = prisma) => {
  return client.eventSession.count({
    where: { event_id },
  });
};

const formatTicketTier = (tier) => {
  const soldQuantity = Number(tier.sold_quantity || 0);
  const capacity = Number(tier.capacity);

  return {
    id: tier.id,
    event_id: tier.event_id,
    name: tier.name,
    description: tier.description,
    price: toNumber(tier.price).toFixed(2),
    capacity,
    sold_quantity: soldQuantity,
    remaining_quantity: Math.max(capacity - soldQuantity, 0),
    is_active: Boolean(tier.is_active),
    sort_order: Number(tier.sort_order || 0),
    created_at: tier.created_at,
  };
};

const getTicketTiersForEvent = async (event_id, client = prisma) => {
  const tiers = await client.$queryRaw`
    SELECT
      tt.id,
      tt.event_id,
      tt.name,
      tt.description,
      tt.price,
      tt.capacity,
      tt.is_active,
      tt.sort_order,
      tt.created_at,
      COALESCE(SUM(CASE WHEN b.status = 'confirmed' THEN bi.quantity ELSE 0 END), 0)::int AS sold_quantity
    FROM ticket_tiers tt
    LEFT JOIN booking_items bi ON bi.ticket_tier_id = tt.id
    LEFT JOIN bookings b ON b.id = bi.booking_id
    WHERE tt.event_id = CAST(${event_id} AS uuid)
    GROUP BY tt.id
    ORDER BY tt.sort_order ASC, tt.created_at ASC
  `;

  return tiers.map(formatTicketTier);
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

const addTicketDataAndStats = async (event) => {
  if (!event) {
    return null;
  }

  const ticket_tiers = await getTicketTiersForEvent(event.id);
  const confirmed_bookings = await countConfirmedTicketsForEvent(event.id);
  const remaining_seats = Math.max(Number(event.capacity) - confirmed_bookings, 0);
  const activePrices = ticket_tiers
    .filter((tier) => tier.is_active)
    .map((tier) => toNumber(tier.price));
  const min_price = activePrices.length ? Math.min(...activePrices).toFixed(2) : event.price;
  const max_price = activePrices.length ? Math.max(...activePrices).toFixed(2) : event.price;

  return {
    ...formatEventBaseFields(event),
    price: min_price,
    min_price,
    max_price,
    confirmed_bookings,
    remaining_seats,
    is_full: remaining_seats === 0,
    ticket_tiers,
  };
};

const getMinimumActiveTierPrice = (ticket_tiers, fallbackPrice = 0) => {
  const activePrices = ticket_tiers
    .filter((tier) => tier.is_active)
    .map((tier) => Number(tier.price));

  if (!activePrices.length) {
    return Number(fallbackPrice);
  }

  return Math.min(...activePrices);
};

const createTicketTiers = async (client, event_id, ticket_tiers) => {
  for (const tier of ticket_tiers) {
    await client.$executeRaw`
      INSERT INTO ticket_tiers (
        event_id,
        name,
        description,
        price,
        capacity,
        is_active,
        sort_order
      )
      VALUES (
        CAST(${event_id} AS uuid),
        ${tier.name},
        ${tier.description},
        ${tier.price},
        ${tier.capacity},
        ${tier.is_active},
        ${tier.sort_order}
      )
    `;
  }
};

const createAgendaTracks = async (client, event_id, agenda_tracks = []) => {
  for (const track of agenda_tracks) {
    const createdTrack = await client.eventTrack.create({
      data: {
        event_id,
        name: track.name,
        description: track.description,
        sort_order: track.sort_order,
      },
    });

    for (const session of track.sessions) {
      await client.eventSession.create({
        data: {
          event_id,
          track_id: createdTrack.id,
          title: session.title,
          description: session.description,
          speaker_name: session.speaker_name,
          location: session.location,
          starts_at: session.starts_at,
          ends_at: session.ends_at,
          sort_order: session.sort_order,
        },
      });
    }
  }
};

const replaceAgendaTracks = async (client, event_id, agenda_tracks = []) => {
  await client.eventTrack.deleteMany({
    where: { event_id },
  });

  await createAgendaTracks(client, event_id, agenda_tracks);
};

const getTierSoldMap = async (event_id, client = prisma) => {
  const rows = await client.$queryRaw`
    SELECT
      tt.id,
      COALESCE(SUM(CASE WHEN b.status = 'confirmed' THEN bi.quantity ELSE 0 END), 0)::int AS sold_quantity
    FROM ticket_tiers tt
    LEFT JOIN booking_items bi ON bi.ticket_tier_id = tt.id
    LEFT JOIN bookings b ON b.id = bi.booking_id
    WHERE tt.event_id = CAST(${event_id} AS uuid)
    GROUP BY tt.id
  `;

  return new Map(rows.map((row) => [row.id, Number(row.sold_quantity || 0)]));
};

const syncTicketTiers = async (client, event_id, ticket_tiers) => {
  const existingTiers = await getTicketTiersForEvent(event_id, client);
  const existingById = new Map(existingTiers.map((tier) => [tier.id, tier]));
  const soldById = await getTierSoldMap(event_id, client);
  const submittedIds = new Set(ticket_tiers.filter((tier) => tier.id).map((tier) => tier.id));

  for (const existingTier of existingTiers) {
    if (submittedIds.has(existingTier.id)) {
      continue;
    }

    const soldQuantity = soldById.get(existingTier.id) || 0;

    if (soldQuantity > 0) {
      const error = new Error("Sold ticket tiers cannot be deleted");
      error.statusCode = 400;
      throw error;
    }

    await client.$executeRaw`
      UPDATE ticket_tiers
      SET is_active = FALSE
      WHERE id = CAST(${existingTier.id} AS uuid)
    `;
  }

  for (const tier of ticket_tiers) {
    if (tier.id) {
      const existingTier = existingById.get(tier.id);

      if (!existingTier) {
        const error = new Error("Ticket tier not found for this event");
        error.statusCode = 400;
        throw error;
      }

      const soldQuantity = soldById.get(tier.id) || 0;

      if (tier.capacity < soldQuantity) {
        const error = new Error("Ticket tier capacity cannot be lower than sold quantity");
        error.statusCode = 400;
        throw error;
      }

      await client.$executeRaw`
        UPDATE ticket_tiers
        SET name = ${tier.name},
            description = ${tier.description},
            price = ${tier.price},
            capacity = ${tier.capacity},
            is_active = ${tier.is_active},
            sort_order = ${tier.sort_order}
        WHERE id = CAST(${tier.id} AS uuid)
      `;
    } else {
      await createTicketTiers(client, event_id, [tier]);
    }
  }
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
  event_end_date,
  timezone,
  capacity,
  price,
  organizer_id,
  ticket_tiers,
  agenda_tracks,
}) => {
  const minPrice = getMinimumActiveTierPrice(ticket_tiers, price);

  const event = await prisma.$transaction(async (tx) => {
    const createdEvent = await tx.event.create({
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
        event_end_date: event_end_date ? new Date(event_end_date) : null,
        timezone,
        capacity,
        price: minPrice,
        organizer_id,
      },
    });

    await createTicketTiers(tx, createdEvent.id, ticket_tiers);
    await createAgendaTracks(tx, createdEvent.id, agenda_tracks || []);

    return createdEvent;
  });

  const eventWithTicketData = await addTicketDataAndStats(hideInternalEventFields(event));

  return {
    ...eventWithTicketData,
    agenda_tracks: await getAgendaForEvent(event.id),
  };
};

const getAllEvents = async () => {
  const events = await prisma.event.findMany({
    include: eventWithOrganizer,
    orderBy: {
      event_date: "asc",
    },
  });

  return Promise.all(events.map(async (event) => {
    const eventWithTicketData = await addTicketDataAndStats(flattenEvent(event));

    return {
      ...eventWithTicketData,
      agenda_session_count: await countAgendaSessionsForEvent(event.id),
    };
  }));
};

const getEventById = async (id) => {
  const event = await prisma.event.findUnique({
    where: { id },
    include: eventWithOrganizer,
  });

  const eventWithTicketData = await addTicketDataAndStats(flattenEvent(event));

  if (!eventWithTicketData) {
    return null;
  }

  return {
    ...eventWithTicketData,
    agenda_tracks: await getAgendaForEvent(id),
  };
};

const getEventRecordById = async (id) => {
  return prisma.event.findUnique({
    where: { id },
  });
};

const getConfirmedAttendeesForEvent = async (event_id) => {
  return prisma.booking.findMany({
    where: {
      event_id,
      status: "confirmed",
    },
    include: {
      user: {
        select: {
          first_name: true,
          last_name: true,
          email: true,
        },
      },
    },
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
    event_end_date,
    timezone,
    capacity,
    price,
    ticket_tiers,
    agenda_tracks,
  }
) => {
  const minPrice = getMinimumActiveTierPrice(ticket_tiers, price);

  const event = await prisma.$transaction(async (tx) => {
    const confirmedTickets = await countConfirmedTicketsForEvent(id, tx);

    if (capacity < confirmedTickets) {
      const error = new Error("Event capacity cannot be lower than sold ticket quantity");
      error.statusCode = 400;
      throw error;
    }

    const updatedEvent = await tx.event.update({
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
        event_end_date: event_end_date ? new Date(event_end_date) : null,
        timezone,
        capacity,
        price: minPrice,
      },
    });

    await syncTicketTiers(tx, id, ticket_tiers);

    if (agenda_tracks !== undefined) {
      await replaceAgendaTracks(tx, id, agenda_tracks);
    }

    return updatedEvent;
  });

  const eventWithTicketData = await addTicketDataAndStats(hideInternalEventFields(event));

  return {
    ...eventWithTicketData,
    agenda_tracks: await getAgendaForEvent(id),
  };
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
  getTicketTiersForEvent,
  getAgendaForEvent,
  countAgendaSessionsForEvent,
  getConfirmedAttendeesForEvent,
  countConfirmedTicketsForEvent,
  updateEvent,
  deleteEvent,
};
