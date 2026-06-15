//password for all seeded users: Password123!
import "dotenv/config";
import bcrypt from "bcryptjs";
import prismaPkg from "@prisma/client";

const { PrismaClient } = prismaPkg;

function getSeedDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set.");
  }

  const parsedUrl = new URL(databaseUrl);

  if (parsedUrl.hostname.includes("pooler.supabase.com")) {
    if (!parsedUrl.searchParams.has("pgbouncer")) {
      parsedUrl.searchParams.set("pgbouncer", "true");
    }

    if (!parsedUrl.searchParams.has("connection_limit")) {
      parsedUrl.searchParams.set("connection_limit", "1");
    }
  }

  return parsedUrl.toString();
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: getSeedDatabaseUrl(),
    },
  },
});

const DEFAULT_PASSWORD = "Password123!";

async function upsertUser({ first_name, last_name, email, role }) {
  const password_hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  return prisma.user.upsert({
    where: { email },
    update: {
      first_name,
      last_name,
      role,
      password_hash,
    },
    create: {
      first_name,
      last_name,
      email,
      role,
      password_hash,
    },
  });
}

async function upsertEvent({
  title,
  description,
  category,
  address,
  city,
  latitude,
  longitude,
  event_date,
  event_end_date = null,
  timezone = "Europe/Paris",
  capacity,
  price,
  organizer_id,
}) {
  const existingEvent = await prisma.event.findFirst({
    where: {
      title,
      organizer_id,
    },
  });

  if (existingEvent) {
    return prisma.event.update({
      where: { id: existingEvent.id },
      data: {
        description,
        category,
        address,
        city,
        latitude,
        longitude,
        event_date,
        event_end_date,
        timezone,
        capacity,
        price,
      },
    });
  }

  return prisma.event.create({
    data: {
      title,
      description,
      category,
      address,
      city,
      latitude,
      longitude,
      event_date,
      event_end_date,
      timezone,
      capacity,
      price,
      organizer_id,
    },
  });
}

async function replaceAgenda(event_id, agendaTracks) {
  await prisma.eventTrack.deleteMany({
    where: { event_id },
  });

  for (const [trackIndex, track] of agendaTracks.entries()) {
    const createdTrack = await prisma.eventTrack.create({
      data: {
        event_id,
        name: track.name,
        description: track.description || null,
        sort_order: trackIndex,
      },
    });

    for (const [sessionIndex, session] of track.sessions.entries()) {
      await prisma.eventSession.create({
        data: {
          event_id,
          track_id: createdTrack.id,
          title: session.title,
          description: session.description || null,
          speaker_name: session.speaker_name || null,
          location: session.location || null,
          starts_at: new Date(session.starts_at),
          ends_at: new Date(session.ends_at),
          sort_order: sessionIndex,
        },
      });
    }
  }
}

async function upsertBooking({ user_id, event_id, status = "confirmed" }) {
  const payment_status = status === "confirmed" ? "paid" : "cancelled";
  const amount_paid = status === "confirmed" ? 0 : null;

  return prisma.booking.upsert({
    where: {
      user_id_event_id: {
        user_id,
        event_id,
      },
    },
    update: {
      status,
      payment_status,
      amount_paid,
      booking_date: new Date(),
    },
    create: {
      user_id,
      event_id,
      status,
      payment_status,
      amount_paid,
    },
  });
}

async function upsertFeedback({ user_id, event_id, rating, comment }) {
  return prisma.feedback.upsert({
    where: {
      user_id_event_id: {
        user_id,
        event_id,
      },
    },
    update: {
      rating,
      comment,
    },
    create: {
      user_id,
      event_id,
      rating,
      comment,
    },
  });
}

function buildSeedTicketCode(prefix, index) {
  return `SEM-${prefix}-${String(index).padStart(3, "0")}`
    .replace(/[^A-Z0-9-]/gi, "")
    .toUpperCase();
}

async function clearSeededOperationalData({ eventIds, userIds }) {
  await prisma.notification.deleteMany({
    where: {
      user_id: {
        in: userIds,
      },
    },
  });

  await prisma.waitlist.deleteMany({
    where: {
      event_id: {
        in: eventIds,
      },
    },
  });

  await prisma.feedback.deleteMany({
    where: {
      event_id: {
        in: eventIds,
      },
    },
  });

  await prisma.conversation.deleteMany({
    where: {
      event_id: {
        in: eventIds,
      },
    },
  });

  await prisma.booking.deleteMany({
    where: {
      event_id: {
        in: eventIds,
      },
    },
  });

  await prisma.ticketTier.deleteMany({
    where: {
      event_id: {
        in: eventIds,
      },
    },
  });
}

async function replaceTicketTiers(event_id, tiers) {
  await prisma.ticketTier.deleteMany({
    where: { event_id },
  });

  const createdTiers = [];

  for (const [index, tier] of tiers.entries()) {
    const createdTier = await prisma.ticketTier.create({
      data: {
        event_id,
        name: tier.name,
        description: tier.description || null,
        price: tier.price,
        capacity: tier.capacity,
        is_active: tier.is_active ?? true,
        sort_order: tier.sort_order ?? index,
      },
    });

    createdTiers.push(createdTier);
  }

  return createdTiers;
}

async function createBookingWithItems({
  user_id,
  event_id,
  status = "confirmed",
  payment_status,
  currency = "eur",
  booking_date = new Date(),
  items,
  ticketCodePrefix = null,
  usedTicketIndexes = [],
}) {
  const totalAmount = items.reduce(
    (sum, item) => sum + Number(item.unit_price) * Number(item.quantity),
    0
  );

  const resolvedPaymentStatus =
    payment_status || (status === "confirmed" ? "paid" : status === "pending_payment" ? "unpaid" : "cancelled");

  const booking = await prisma.booking.create({
    data: {
      user_id,
      event_id,
      booking_date,
      status,
      payment_status: resolvedPaymentStatus,
      amount_paid: status === "confirmed" ? totalAmount : null,
      currency,
    },
  });

  const createdItems = [];

  for (const item of items) {
    const createdItem = await prisma.bookingItem.create({
      data: {
        booking_id: booking.id,
        ticket_tier_id: item.ticket_tier_id,
        quantity: Number(item.quantity),
        unit_price: item.unit_price,
        total_price: Number(item.unit_price) * Number(item.quantity),
      },
    });

    createdItems.push(createdItem);
  }

  const createdTickets = [];

  if (status === "confirmed") {
    let ticketIndex = 1;

    for (const bookingItem of createdItems) {
      for (let itemCount = 0; itemCount < Number(bookingItem.quantity); itemCount += 1) {
        const ticket = await prisma.ticket.create({
          data: {
            booking_id: booking.id,
            booking_item_id: bookingItem.id,
            event_id,
            user_id,
            ticket_tier_id: bookingItem.ticket_tier_id,
            ticket_code: ticketCodePrefix
              ? buildSeedTicketCode(ticketCodePrefix, ticketIndex)
              : buildSeedTicketCode(`SEED-${booking.id.slice(0, 8)}`, ticketIndex),
          },
        });

        createdTickets.push(ticket);
        ticketIndex += 1;
      }
    }

    for (const usedTicketIndex of usedTicketIndexes) {
      const ticket = createdTickets[usedTicketIndex - 1];

      if (!ticket) {
        continue;
      }

      await prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          status: "used",
          checked_in_at: new Date("2026-06-10T09:45:00.000Z"),
        },
      });
    }
  }

  return {
    booking,
    items: createdItems,
    tickets: createdTickets,
  };
}

async function createConversationWithMessages({
  booking_id,
  event_id,
  attendee_id,
  organizer_id,
  messages,
}) {
  const lastMessageAt = messages[messages.length - 1]?.created_at || new Date();
  const conversation = await prisma.conversation.create({
    data: {
      booking_id,
      event_id,
      attendee_id,
      organizer_id,
      last_message_at: lastMessageAt,
    },
  });

  for (const message of messages) {
    await prisma.conversationMessage.create({
      data: {
        conversation_id: conversation.id,
        sender_id: message.sender_id,
        body: message.body,
        created_at: message.created_at,
        read_at: message.read_at || null,
      },
    });
  }

  return conversation;
}

async function createNotification({
  user_id,
  type,
  title,
  message,
  data,
  dedupe_key,
  read_at = null,
  created_at = new Date(),
}) {
  return prisma.notification.create({
    data: {
      user_id,
      type,
      title,
      message,
      data,
      dedupe_key,
      read_at,
      created_at,
    },
  });
}

async function main() {
  const admin = await upsertUser({
    first_name: "Amina",
    last_name: "Bennett",
    email: "admin@smartevent.test",
    role: "admin",
  });

  const organizerOne = await upsertUser({
    first_name: "Lina",
    last_name: "Martin",
    email: "organizer1@smartevent.test",
    role: "organizer",
  });

  const organizerTwo = await upsertUser({
    first_name: "Youssef",
    last_name: "Rahimi",
    email: "organizer2@smartevent.test",
    role: "organizer",
  });

  const attendeeOne = await upsertUser({
    first_name: "Emma",
    last_name: "Dubois",
    email: "attendee1@smartevent.test",
    role: "attendee",
  });

  const attendeeTwo = await upsertUser({
    first_name: "Noah",
    last_name: "Garcia",
    email: "attendee2@smartevent.test",
    role: "attendee",
  });

  const attendeeThree = await upsertUser({
    first_name: "Sara",
    last_name: "El Idrissi",
    email: "attendee3@smartevent.test",
    role: "attendee",
  });

  const attendeeFour = await upsertUser({
    first_name: "Leo",
    last_name: "Moreau",
    email: "attendee4@smartevent.test",
    role: "attendee",
  });

  const attendeeFive = await upsertUser({
    first_name: "Ines",
    last_name: "Haddad",
    email: "attendee5@smartevent.test",
    role: "attendee",
  });

  const attendeeSix = await upsertUser({
    first_name: "Tom",
    last_name: "Belaid",
    email: "attendee6@smartevent.test",
    role: "attendee",
  });

  const aiWorkshop = await upsertEvent({
    title: "AI Product Workshop",
    description:
      "A hands-on session on shipping AI-powered product features with practical demos and collaboration exercises.",
    category: "Technology",
    address: "28 Rue Notre Dame des Champs",
    city: "Paris",
    latitude: 48.841966,
    longitude: 2.329536,
    event_date: new Date("2026-05-14T09:30:00.000Z"),
    event_end_date: new Date("2026-05-14T16:30:00.000Z"),
    capacity: 80,
    price: 15,
    organizer_id: organizerOne.id,
  });

  const startupNight = await upsertEvent({
    title: "Startup Networking Night",
    description:
      "An evening for founders, students, and mentors to connect around startup ideas, recruiting, and funding stories.",
    category: "Business",
    address: "15 Boulevard Voltaire",
    city: "Paris",
    latitude: 48.864662,
    longitude: 2.367464,
    event_date: new Date("2026-05-22T18:00:00.000Z"),
    event_end_date: new Date("2026-05-22T21:30:00.000Z"),
    capacity: 120,
    price: 0,
    organizer_id: organizerOne.id,
  });

  const designSprint = await upsertEvent({
    title: "Design Sprint for Campus Projects",
    description:
      "A guided sprint on framing problems, prototyping quickly, and presenting solutions for university initiatives.",
    category: "Design",
    address: "5 Avenue du General Leclerc",
    city: "Issy-les-Moulineaux",
    latitude: 48.824129,
    longitude: 2.273625,
    event_date: new Date("2026-06-02T13:00:00.000Z"),
    event_end_date: new Date("2026-06-02T18:00:00.000Z"),
    capacity: 45,
    price: 10,
    organizer_id: organizerTwo.id,
  });

  const musicFestival = await upsertEvent({
    title: "Open Air Student Music Festival",
    description:
      "A full-day campus festival with student bands, community partners, and outdoor food stalls.",
    category: "Music",
    address: "1 Place de la Pelouse",
    city: "Paris",
    latitude: 48.837256,
    longitude: 2.435517,
    event_date: new Date("2026-06-15T15:00:00.000Z"),
    event_end_date: new Date("2026-06-15T22:00:00.000Z"),
    capacity: 300,
    price: 25,
    organizer_id: organizerTwo.id,
  });

  const quickseatDemoSummit = await upsertEvent({
    title: "Quickseat Demo Summit",
    description:
      "A compact defense-ready event showcasing multi-tier booking, attendee messaging, QR tickets, and organizer operations.",
    category: "Technology",
    address: "12 Rue du Faubourg Saint-Honore",
    city: "Paris",
    latitude: 48.870552,
    longitude: 2.316706,
    event_date: new Date("2026-06-20T09:00:00.000Z"),
    event_end_date: new Date("2026-06-20T17:30:00.000Z"),
    capacity: 6,
    price: 20,
    organizer_id: organizerOne.id,
  });

  const quickseatCommunityMeetup = await upsertEvent({
    title: "Quickseat Community Meetup",
    description:
      "A free community event used to demonstrate instant confirmation, ticket generation, and attendee-side flows.",
    category: "Community",
    address: "8 Rue des Ecoles",
    city: "Paris",
    latitude: 48.850962,
    longitude: 2.34556,
    event_date: new Date("2026-06-24T18:30:00.000Z"),
    event_end_date: new Date("2026-06-24T20:30:00.000Z"),
    capacity: 30,
    price: 0,
    organizer_id: organizerTwo.id,
  });

  await replaceAgenda(aiWorkshop.id, [
    {
      name: "Main Workshop",
      description: "Hands-on product sessions focused on practical AI feature delivery.",
      sessions: [
        {
          title: "Welcome and AI Product Framing",
          description: "Define the product problem, success metrics, and safe AI use cases.",
          speaker_name: "Lina Martin",
          location: "Room A",
          starts_at: "2026-05-14T09:30:00.000Z",
          ends_at: "2026-05-14T10:15:00.000Z",
        },
        {
          title: "Prototype Lab",
          description: "Build a small AI-assisted workflow and test it with realistic user scenarios.",
          speaker_name: "Amina Bennett",
          location: "Room A",
          starts_at: "2026-05-14T10:30:00.000Z",
          ends_at: "2026-05-14T12:00:00.000Z",
        },
        {
          title: "Demo Reviews",
          description: "Teams present prototypes and receive structured product feedback.",
          speaker_name: "Lina Martin",
          location: "Room A",
          starts_at: "2026-05-14T14:00:00.000Z",
          ends_at: "2026-05-14T16:00:00.000Z",
        },
      ],
    },
  ]);

  await replaceAgenda(startupNight.id, [
    {
      name: "Networking Floor",
      description: "Short founder talks followed by structured networking rounds.",
      sessions: [
        {
          title: "Founder Lightning Talks",
          description: "Five early-stage founders share lessons from their first year.",
          speaker_name: "Guest founders",
          location: "Main Hall",
          starts_at: "2026-05-22T18:00:00.000Z",
          ends_at: "2026-05-22T18:45:00.000Z",
        },
        {
          title: "Mentor Matchmaking",
          description: "Meet mentors by topic: funding, product, hiring, and legal basics.",
          speaker_name: "Startup mentors",
          location: "Main Hall",
          starts_at: "2026-05-22T19:00:00.000Z",
          ends_at: "2026-05-22T20:15:00.000Z",
        },
      ],
    },
  ]);

  await replaceAgenda(designSprint.id, [
    {
      name: "Sprint Room",
      description: "A guided sprint from problem framing to final pitch.",
      sessions: [
        {
          title: "Problem Framing",
          description: "Turn vague campus problems into clear design challenges.",
          speaker_name: "Youssef Rahimi",
          location: "Studio 2",
          starts_at: "2026-06-02T13:00:00.000Z",
          ends_at: "2026-06-02T14:00:00.000Z",
        },
        {
          title: "Prototype and Test",
          description: "Sketch, prototype, and run quick validation with peers.",
          speaker_name: "Design mentors",
          location: "Studio 2",
          starts_at: "2026-06-02T14:15:00.000Z",
          ends_at: "2026-06-02T16:30:00.000Z",
        },
        {
          title: "Final Pitches",
          description: "Each team presents its prototype and next-step plan.",
          speaker_name: "Student teams",
          location: "Auditorium",
          starts_at: "2026-06-02T17:00:00.000Z",
          ends_at: "2026-06-02T18:00:00.000Z",
        },
      ],
    },
  ]);

  await replaceAgenda(musicFestival.id, [
    {
      name: "Main Stage",
      description: "Live student bands and headline performances.",
      sessions: [
        {
          title: "Opening DJ Set",
          description: "Warm-up set and festival opening.",
          speaker_name: "Campus DJ Collective",
          location: "Main Stage",
          starts_at: "2026-06-15T15:00:00.000Z",
          ends_at: "2026-06-15T16:00:00.000Z",
        },
        {
          title: "Student Bands Showcase",
          description: "Three student bands perform original sets.",
          speaker_name: "Student bands",
          location: "Main Stage",
          starts_at: "2026-06-15T17:00:00.000Z",
          ends_at: "2026-06-15T19:00:00.000Z",
        },
      ],
    },
    {
      name: "Community Zone",
      description: "Food stalls, partner stands, and relaxed activities.",
      sessions: [
        {
          title: "Food Market Opening",
          description: "Campus partners open food and drink stands.",
          speaker_name: "Community partners",
          location: "Food Court",
          starts_at: "2026-06-15T16:00:00.000Z",
          ends_at: "2026-06-15T18:30:00.000Z",
        },
      ],
    },
  ]);

  await replaceAgenda(quickseatDemoSummit.id, [
    {
      name: "Main Stage",
      description: "Core product presentations and live demo sessions.",
      sessions: [
        {
          title: "Platform Walkthrough",
          description: "A guided overview of discovery, booking, and attendee experience.",
          speaker_name: "Lina Martin",
          location: "Main Auditorium",
          starts_at: "2026-06-20T09:00:00.000Z",
          ends_at: "2026-06-20T10:00:00.000Z",
        },
        {
          title: "Organizer Operations Live Demo",
          description: "Attendee management, check-in, and event messaging in one workflow.",
          speaker_name: "Amina Bennett",
          location: "Main Auditorium",
          starts_at: "2026-06-20T11:00:00.000Z",
          ends_at: "2026-06-20T12:00:00.000Z",
        },
      ],
    },
    {
      name: "Workshop Room",
      description: "Hands-on product operations and support flows.",
      sessions: [
        {
          title: "Messaging and Notification Lab",
          description: "Booking-linked conversations and realtime updates.",
          speaker_name: "Support team",
          location: "Room B",
          starts_at: "2026-06-20T13:30:00.000Z",
          ends_at: "2026-06-20T14:30:00.000Z",
        },
      ],
    },
  ]);

  await replaceAgenda(quickseatCommunityMeetup.id, [
    {
      name: "Meetup Flow",
      description: "A short free-event agenda useful for ticket demo flows.",
      sessions: [
        {
          title: "Welcome and Introductions",
          description: "Short intro to the event and participant networking.",
          speaker_name: "Youssef Rahimi",
          location: "Community Hall",
          starts_at: "2026-06-24T18:30:00.000Z",
          ends_at: "2026-06-24T19:00:00.000Z",
        },
        {
          title: "Open Discussion",
          description: "Interactive discussion with attendees around student event tools.",
          speaker_name: "Community team",
          location: "Community Hall",
          starts_at: "2026-06-24T19:10:00.000Z",
          ends_at: "2026-06-24T20:10:00.000Z",
        },
      ],
    },
  ]);

  await upsertEvent({
    title: "Cybersecurity Capture The Flag",
    description:
      "A team-based cybersecurity challenge covering web exploits, cryptography, forensics, and secure coding basics.",
    category: "Technology",
    address: "20 Avenue Albert Einstein",
    city: "Lyon",
    latitude: 45.783105,
    longitude: 4.872049,
    event_date: new Date("2026-06-21T10:00:00.000Z"),
    capacity: 90,
    price: 12,
    organizer_id: organizerOne.id,
  });

  await upsertEvent({
    title: "Sustainable Engineering Forum",
    description:
      "A student forum about low-carbon design, renewable systems, and practical engineering choices for climate impact.",
    category: "Engineering",
    address: "58 Boulevard Charles Livon",
    city: "Marseille",
    latitude: 43.292667,
    longitude: 5.361067,
    event_date: new Date("2026-06-28T08:30:00.000Z"),
    capacity: 140,
    price: 8,
    organizer_id: organizerTwo.id,
  });

  await upsertEvent({
    title: "Data Visualization Bootcamp",
    description:
      "A practical bootcamp on turning raw datasets into clear dashboards, charts, and presentation-ready insights.",
    category: "Data",
    address: "35 Place Pey Berland",
    city: "Bordeaux",
    latitude: 44.837789,
    longitude: -0.57918,
    event_date: new Date("2026-07-04T09:00:00.000Z"),
    capacity: 60,
    price: 18,
    organizer_id: organizerOne.id,
  });

  await upsertEvent({
    title: "Robotics Demo Day",
    description:
      "A showcase of student robotics projects, autonomous prototypes, and short technical demos from engineering teams.",
    category: "Robotics",
    address: "1 Place du Theatre",
    city: "Lille",
    latitude: 50.637183,
    longitude: 3.063017,
    event_date: new Date("2026-07-11T14:00:00.000Z"),
    capacity: 110,
    price: 5,
    organizer_id: organizerTwo.id,
  });

  await upsertEvent({
    title: "Product Design Critique Night",
    description:
      "A peer review evening where students present app concepts, get structured feedback, and improve product decisions.",
    category: "Design",
    address: "4 Rue de Valmy",
    city: "Nantes",
    latitude: 47.213064,
    longitude: -1.542808,
    event_date: new Date("2026-07-18T17:30:00.000Z"),
    capacity: 70,
    price: 0,
    organizer_id: organizerOne.id,
  });

  await upsertEvent({
    title: "Aerospace Innovation Meetup",
    description:
      "A meetup for students interested in aerospace systems, embedded software, propulsion, and industry careers.",
    category: "Aerospace",
    address: "1 Avenue Camille Flammarion",
    city: "Toulouse",
    latitude: 43.612228,
    longitude: 1.462378,
    event_date: new Date("2026-07-25T16:00:00.000Z"),
    capacity: 100,
    price: 7,
    organizer_id: organizerTwo.id,
  });

  const seededUsers = [
    admin,
    organizerOne,
    organizerTwo,
    attendeeOne,
    attendeeTwo,
    attendeeThree,
    attendeeFour,
    attendeeFive,
    attendeeSix,
  ];

  const demoEvents = [
    aiWorkshop,
    startupNight,
    designSprint,
    musicFestival,
    quickseatDemoSummit,
    quickseatCommunityMeetup,
  ];

  await clearSeededOperationalData({
    eventIds: demoEvents.map((event) => event.id),
    userIds: seededUsers.map((user) => user.id),
  });

  const aiWorkshopTiers = await replaceTicketTiers(aiWorkshop.id, [
    {
      name: "Standard",
      description: "Main workshop access",
      price: 15,
      capacity: 70,
    },
    {
      name: "VIP",
      description: "Priority seating and mentor Q&A",
      price: 30,
      capacity: 10,
    },
  ]);

  const startupNightTiers = await replaceTicketTiers(startupNight.id, [
    {
      name: "General Admission",
      description: "Open networking access",
      price: 0,
      capacity: 120,
    },
  ]);

  const designSprintTiers = await replaceTicketTiers(designSprint.id, [
    {
      name: "Participant",
      description: "Full sprint participation",
      price: 10,
      capacity: 45,
    },
  ]);

  const musicFestivalTiers = await replaceTicketTiers(musicFestival.id, [
    {
      name: "Standard",
      description: "Festival access",
      price: 25,
      capacity: 260,
    },
    {
      name: "VIP",
      description: "Priority standing area",
      price: 45,
      capacity: 40,
    },
  ]);

  const quickseatDemoSummitTiers = await replaceTicketTiers(quickseatDemoSummit.id, [
    {
      name: "Early Bird",
      description: "Limited discounted access",
      price: 20,
      capacity: 2,
    },
    {
      name: "Standard",
      description: "General summit access",
      price: 35,
      capacity: 3,
    },
    {
      name: "VIP",
      description: "Front-row seating and networking lounge",
      price: 60,
      capacity: 1,
    },
  ]);

  const quickseatCommunityMeetupTiers = await replaceTicketTiers(
    quickseatCommunityMeetup.id,
    [
      {
        name: "Free Pass",
        description: "Standard free registration",
        price: 0,
        capacity: 30,
      },
    ]
  );

  const aiWorkshopStandardTier = aiWorkshopTiers.find((tier) => tier.name === "Standard");
  const aiWorkshopVipTier = aiWorkshopTiers.find((tier) => tier.name === "VIP");
  const startupNightGeneralTier = startupNightTiers[0];
  const designSprintParticipantTier = designSprintTiers[0];
  const musicFestivalStandardTier = musicFestivalTiers.find((tier) => tier.name === "Standard");
  const summitEarlyBirdTier = quickseatDemoSummitTiers.find((tier) => tier.name === "Early Bird");
  const summitStandardTier = quickseatDemoSummitTiers.find((tier) => tier.name === "Standard");
  const summitVipTier = quickseatDemoSummitTiers.find((tier) => tier.name === "VIP");
  const communityMeetupFreeTier = quickseatCommunityMeetupTiers[0];

  const aiWorkshopBookingOne = await createBookingWithItems({
    user_id: attendeeOne.id,
    event_id: aiWorkshop.id,
    booking_date: new Date("2026-05-08T10:00:00.000Z"),
    items: [
      {
        ticket_tier_id: aiWorkshopVipTier.id,
        quantity: 1,
        unit_price: 30,
      },
    ],
    ticketCodePrefix: "AI-EMMA",
    usedTicketIndexes: [1],
  });

  await createBookingWithItems({
    user_id: attendeeTwo.id,
    event_id: aiWorkshop.id,
    booking_date: new Date("2026-05-09T13:00:00.000Z"),
    items: [
      {
        ticket_tier_id: aiWorkshopStandardTier.id,
        quantity: 1,
        unit_price: 15,
      },
    ],
    ticketCodePrefix: "AI-NOAH",
    usedTicketIndexes: [1],
  });

  await createBookingWithItems({
    user_id: attendeeThree.id,
    event_id: startupNight.id,
    booking_date: new Date("2026-05-15T18:20:00.000Z"),
    items: [
      {
        ticket_tier_id: startupNightGeneralTier.id,
        quantity: 1,
        unit_price: 0,
      },
    ],
    ticketCodePrefix: "STARTUP-SARA",
    usedTicketIndexes: [1],
  });

  await createBookingWithItems({
    user_id: attendeeTwo.id,
    event_id: designSprint.id,
    booking_date: new Date("2026-05-25T11:00:00.000Z"),
    items: [
      {
        ticket_tier_id: designSprintParticipantTier.id,
        quantity: 2,
        unit_price: 10,
      },
    ],
    ticketCodePrefix: "SPRINT-NOAH",
    usedTicketIndexes: [1, 2],
  });

  await createBookingWithItems({
    user_id: attendeeOne.id,
    event_id: musicFestival.id,
    status: "cancelled",
    payment_status: "cancelled",
    booking_date: new Date("2026-06-01T15:00:00.000Z"),
    items: [
      {
        ticket_tier_id: musicFestivalStandardTier.id,
        quantity: 1,
        unit_price: 25,
      },
    ],
  });

  const summitBookingEmma = await createBookingWithItems({
    user_id: attendeeOne.id,
    event_id: quickseatDemoSummit.id,
    booking_date: new Date("2026-06-12T08:30:00.000Z"),
    items: [
      {
        ticket_tier_id: summitVipTier.id,
        quantity: 1,
        unit_price: 60,
      },
      {
        ticket_tier_id: summitStandardTier.id,
        quantity: 1,
        unit_price: 35,
      },
    ],
    ticketCodePrefix: "DEMO-EMMA",
  });

  const summitBookingNoah = await createBookingWithItems({
    user_id: attendeeTwo.id,
    event_id: quickseatDemoSummit.id,
    booking_date: new Date("2026-06-12T09:00:00.000Z"),
    items: [
      {
        ticket_tier_id: summitStandardTier.id,
        quantity: 2,
        unit_price: 35,
      },
    ],
    ticketCodePrefix: "DEMO-NOAH",
  });

  const summitBookingSara = await createBookingWithItems({
    user_id: attendeeThree.id,
    event_id: quickseatDemoSummit.id,
    booking_date: new Date("2026-06-12T09:30:00.000Z"),
    items: [
      {
        ticket_tier_id: summitEarlyBirdTier.id,
        quantity: 2,
        unit_price: 20,
      },
    ],
    ticketCodePrefix: "DEMO-SARA",
  });

  await createBookingWithItems({
    user_id: attendeeFive.id,
    event_id: quickseatCommunityMeetup.id,
    booking_date: new Date("2026-06-13T16:00:00.000Z"),
    items: [
      {
        ticket_tier_id: communityMeetupFreeTier.id,
        quantity: 1,
        unit_price: 0,
      },
    ],
    ticketCodePrefix: "COMM-INES",
  });

  await prisma.waitlist.createMany({
    data: [
      {
        event_id: quickseatDemoSummit.id,
        user_id: attendeeFive.id,
        created_at: new Date("2026-06-13T12:00:00.000Z"),
      },
      {
        event_id: quickseatDemoSummit.id,
        user_id: attendeeSix.id,
        created_at: new Date("2026-06-13T12:05:00.000Z"),
      },
    ],
  });

  await createConversationWithMessages({
    booking_id: summitBookingEmma.booking.id,
    event_id: quickseatDemoSummit.id,
    attendee_id: attendeeOne.id,
    organizer_id: organizerOne.id,
    messages: [
      {
        sender_id: attendeeOne.id,
        body: "Hi, does the VIP ticket include the networking lounge?",
        created_at: new Date("2026-06-13T10:00:00.000Z"),
        read_at: new Date("2026-06-13T10:05:00.000Z"),
      },
      {
        sender_id: organizerOne.id,
        body: "Yes. VIP includes front-row seating and access to the organizer lounge after the keynote.",
        created_at: new Date("2026-06-13T10:08:00.000Z"),
        read_at: new Date("2026-06-13T10:10:00.000Z"),
      },
      {
        sender_id: attendeeOne.id,
        body: "Perfect, thank you. I will arrive early for check-in.",
        created_at: new Date("2026-06-13T10:12:00.000Z"),
      },
    ],
  });

  await upsertFeedback({
    user_id: attendeeOne.id,
    event_id: aiWorkshop.id,
    rating: 5,
    comment: "Very practical session with clear explanations and useful demos.",
  });

  await upsertFeedback({
    user_id: attendeeTwo.id,
    event_id: aiWorkshop.id,
    rating: 4,
    comment: "Strong workshop structure and useful hands-on exercises.",
  });

  await upsertFeedback({
    user_id: attendeeThree.id,
    event_id: startupNight.id,
    rating: 4,
    comment: "Great networking energy and useful conversations with early-stage founders.",
  });

  await upsertFeedback({
    user_id: attendeeTwo.id,
    event_id: designSprint.id,
    rating: 5,
    comment: "Excellent facilitation and a clear sprint rhythm from start to finish.",
  });

  await createNotification({
    user_id: attendeeOne.id,
    type: "booking_confirmed",
    title: "Booking confirmed",
    message: "Your booking for Quickseat Demo Summit is confirmed.",
    data: {
      event_id: quickseatDemoSummit.id,
      booking_id: summitBookingEmma.booking.id,
    },
    dedupe_key: "seed:booking:demo:emma",
    created_at: new Date("2026-06-12T08:31:00.000Z"),
  });

  await createNotification({
    user_id: attendeeOne.id,
    type: "event_reminder_24h",
    title: "Event reminder",
    message: "Quickseat Demo Summit starts in 24 hours.",
    data: {
      event_id: quickseatDemoSummit.id,
      booking_id: summitBookingEmma.booking.id,
    },
    dedupe_key: "seed:reminder24:demo:emma",
    created_at: new Date("2026-06-19T09:00:00.000Z"),
  });

  await createNotification({
    user_id: organizerOne.id,
    type: "conversation_message",
    title: "New attendee message",
    message: "Emma Dubois sent a new message about Quickseat Demo Summit.",
    data: {
      event_id: quickseatDemoSummit.id,
      booking_id: summitBookingEmma.booking.id,
      sender_id: attendeeOne.id,
    },
    dedupe_key: "seed:conversation:organizer1",
    created_at: new Date("2026-06-13T10:12:30.000Z"),
  });

  await createNotification({
    user_id: admin.id,
    type: "booking_confirmed",
    title: "Booking confirmed",
    message: "Quickseat Demo Summit reached full capacity through confirmed bookings.",
    data: {
      event_id: quickseatDemoSummit.id,
      booking_id: summitBookingNoah.booking.id,
    },
    dedupe_key: "seed:admin:demo-full",
    created_at: new Date("2026-06-12T09:31:00.000Z"),
  });

  console.log("Database seeded successfully.");
  console.log("Seed login password for all sample users:", DEFAULT_PASSWORD);
  console.log("Sample users:");
  console.log(`- admin@smartevent.test (${admin.role})`);
  console.log(`- organizer1@smartevent.test (${organizerOne.role})`);
  console.log(`- organizer2@smartevent.test (${organizerTwo.role})`);
  console.log(`- attendee1@smartevent.test (${attendeeOne.role})`);
  console.log(`- attendee2@smartevent.test (${attendeeTwo.role})`);
  console.log(`- attendee3@smartevent.test (${attendeeThree.role})`);
  console.log(`- attendee4@smartevent.test (${attendeeFour.role})`);
  console.log(`- attendee5@smartevent.test (${attendeeFive.role})`);
  console.log(`- attendee6@smartevent.test (${attendeeSix.role})`);
  console.log("Demo notes:");
  console.log(`- Valid demo ticket code for organizer check-in: ${buildSeedTicketCode("DEMO-EMMA", 1)}`);
  console.log(`- Full event with waitlist: ${quickseatDemoSummit.title}`);
  console.log(`- Free live-booking event: ${quickseatCommunityMeetup.title}`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
