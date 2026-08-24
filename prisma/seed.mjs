import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { staffUsers } from "./seed-data.mjs";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const databaseUrl = new URL(connectionString);
const prisma = new PrismaClient({
  adapter: new PrismaMariaDb({
    host: databaseUrl.hostname,
    port: databaseUrl.port ? Number(databaseUrl.port) : 3306,
    user: decodeURIComponent(databaseUrl.username),
    password: decodeURIComponent(databaseUrl.password),
    database: databaseUrl.pathname.replace(/^\//, ""),
    allowPublicKeyRetrieval: true,
  }),
});

async function seedStaffUsers() {
  for (const staffUser of staffUsers) {
    const { password, ...data } = staffUser;
    const passwordHash = await hash(password, 12);

    await prisma.staffUser.upsert({
      where: { email: data.email },
      update: {
        ...data,
        passwordHash,
      },
      create: {
        ...data,
        passwordHash,
      },
    });
  }
}

async function main() {
  await seedStaffUsers();

  console.log("Seed completed");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
