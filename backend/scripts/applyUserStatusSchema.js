import "dotenv/config";
import prismaPkg from "@prisma/client";

const { PrismaClient } = prismaPkg;

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set.");
  }

  const parsedUrl = new URL(databaseUrl);

  if (parsedUrl.hostname.includes("pooler.supabase.com")) {
    parsedUrl.searchParams.set("pgbouncer", "true");
    parsedUrl.searchParams.set("connection_limit", "1");
  }

  return parsedUrl.toString();
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: getDatabaseUrl(),
    },
  },
});

const statements = [
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active'",
  "ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check",
  "ALTER TABLE users ADD CONSTRAINT users_status_check CHECK (status IN ('active', 'suspended'))",
];

try {
  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement);
  }

  console.log("User status schema applied successfully.");
} catch (error) {
  console.error("User status schema failed:", error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
