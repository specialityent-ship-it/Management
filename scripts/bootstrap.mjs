// Runs on every boot, immediately after migrations and before the server
// starts. Creates the first administrator on a brand new deployment so someone
// can sign in without shell access to the container.
//
// It is a no-op the moment any user exists, so it cannot mint an extra admin
// later, and it never touches an existing account's password.
//
// Deliberately creates no demo doctors, services or patients: a real clinic
// should not have to delete fake content before it can start. The demo dataset
// stays in prisma/seed.ts for local development.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.user.count();
  if (existing > 0) {
    console.log(`[bootstrap] ${existing} user(s) already exist — nothing to do.`);
    return;
  }

  const email = (process.env.SEED_ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || "";

  if (!email || !password) {
    console.warn(
      "[bootstrap] No users yet, but SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD are not set. " +
        "Set them and redeploy to create the first administrator.",
    );
    return;
  }
  if (password.length < 12) {
    console.warn("[bootstrap] SEED_ADMIN_PASSWORD must be at least 12 characters. Skipping.");
    return;
  }

  await prisma.user.create({
    data: {
      email,
      name: process.env.SEED_ADMIN_NAME || "Clinic Administrator",
      passwordHash: await bcrypt.hash(password, 12),
      role: "ADMIN",
    },
  });

  for (const name of ["Theatre 1", "Theatre 2"]) {
    await prisma.theatre.upsert({ where: { name }, update: {}, create: { name } });
  }

  console.log(`[bootstrap] Created the first administrator: ${email}`);
}

main()
  .catch((error) => {
    // Never block the server from starting — a bootstrap problem should be
    // visible in the logs, not an outage.
    console.error("[bootstrap] failed:", error);
  })
  .finally(() => prisma.$disconnect());
