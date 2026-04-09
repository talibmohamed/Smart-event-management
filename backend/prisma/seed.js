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
  event_date,
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
        event_date,
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
      event_date,
      capacity,
      price,
      organizer_id,
    },
  });
}

async function upsertBooking({ user_id, event_id, status = "confirmed" }) {
  return prisma.booking.upsert({
    where: {
      user_id_event_id: {
        user_id,
        event_id,
      },
    },
    update: {
      status,
      booking_date: new Date(),
    },
    create: {
      user_id,
      event_id,
      status,
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
    event_date: new Date("2026-05-14T09:30:00.000Z"),
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
    event_date: new Date("2026-05-22T18:00:00.000Z"),
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
    event_date: new Date("2026-06-02T13:00:00.000Z"),
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
    event_date: new Date("2026-06-15T15:00:00.000Z"),
    capacity: 300,
    price: 25,
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
