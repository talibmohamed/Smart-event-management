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

  await upsertBooking({
    user_id: attendeeOne.id,
    event_id: aiWorkshop.id,
    status: "confirmed",
  });

  await upsertBooking({
    user_id: attendeeTwo.id,
    event_id: aiWorkshop.id,
    status: "confirmed",
  });

  await upsertBooking({
    user_id: attendeeThree.id,
    event_id: startupNight.id,
    status: "confirmed",
  });

  await upsertBooking({
    user_id: organizerOne.id,
    event_id: designSprint.id,
    status: "confirmed",
  });

  await upsertBooking({
    user_id: attendeeOne.id,
    event_id: musicFestival.id,
    status: "cancelled",
  });

  await upsertFeedback({
    user_id: attendeeOne.id,
    event_id: aiWorkshop.id,
    rating: 5,
    comment: "Very practical session with clear explanations and useful demos.",
  });

  await upsertFeedback({
    user_id: attendeeThree.id,
    event_id: startupNight.id,
    rating: 4,
    comment: "Great networking energy and useful conversations with early-stage founders.",
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
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
