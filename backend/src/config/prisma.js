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
      url: getDatabaseUrl()
    }
  }
});

export default prisma;
