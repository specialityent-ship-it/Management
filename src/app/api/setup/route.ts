import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, fail, handleError } from "@/lib/api";
import { hashPassword } from "@/lib/auth";

/// One-time bootstrap for a fresh deployment: creates the first administrator
/// and the theatre list, so someone can actually sign in to a brand new
/// instance.
///
/// Refuses to run once any user exists, so it cannot be used to mint an extra
/// admin later, and it is protected by CRON_SECRET on top of that. Deliberately
/// creates no demo doctors, services or patients — a live clinic should not
/// have to delete fake content before it can start.
export async function POST(request: NextRequest) {
  try {
    const secret = process.env.CRON_SECRET;
    if (!secret) return fail("CRON_SECRET is not set.", 503);

    const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (provided !== secret) return fail("Unauthorized", 401);

    const existing = await prisma.user.count();
    if (existing > 0) {
      return fail("Already set up. Sign in, or reset the database first.", 409);
    }

    const email = (process.env.SEED_ADMIN_EMAIL || "").trim().toLowerCase();
    const password = process.env.SEED_ADMIN_PASSWORD || "";
    if (!email || password.length < 12) {
      return fail(
        "Set SEED_ADMIN_EMAIL and a SEED_ADMIN_PASSWORD of at least 12 characters, then retry.",
        422,
      );
    }

    const user = await prisma.user.create({
      data: {
        email,
        name: process.env.SEED_ADMIN_NAME || "Clinic Administrator",
        passwordHash: await hashPassword(password),
        role: "ADMIN",
      },
    });

    for (const name of ["Theatre 1", "Theatre 2"]) {
      await prisma.theatre.upsert({ where: { name }, update: {}, create: { name } });
    }

    return ok({ created: true, email: user.email, signInAt: "/login" }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
