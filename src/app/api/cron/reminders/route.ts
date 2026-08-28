import { NextRequest } from "next/server";
import { AppointmentStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ok, fail, handleError } from "@/lib/api";
import { notifyAppointment } from "@/lib/notifications";

export const maxDuration = 300;

const HOURS_AHEAD = Number(process.env.REMINDER_HOURS_AHEAD || 24);

/// Sends a reminder for every appointment starting within the next
/// REMINDER_HOURS_AHEAD hours. Safe to run as often as you like: each
/// reminder is de-duplicated against NotificationLog, so re-running the job
/// (or overlapping schedules) never messages a patient twice.
export async function GET(request: NextRequest) {
  try {
    const secret = process.env.CRON_SECRET;
    if (!secret) return fail("CRON_SECRET is not set.", 503);

    const provided =
      request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
      request.nextUrl.searchParams.get("secret");
    if (provided !== secret) return fail("Unauthorized", 401);

    const now = new Date();
    const horizon = new Date(now.getTime() + HOURS_AHEAD * 60 * 60 * 1000);

    const due = await prisma.appointment.findMany({
      where: {
        start: { gte: now, lte: horizon },
        status: { in: [AppointmentStatus.CONFIRMED, AppointmentStatus.REQUESTED] },
      },
      select: { id: true, reference: true },
      take: 200,
    });

    let sent = 0;
    let skipped = 0;

    for (const appointment of due) {
      const results = await notifyAppointment({
        template: "appointment_reminder",
        appointmentId: appointment.id,
        once: true,
      });

      if (results.length === 0) skipped++;
      else if (results.some((r) => r.status === "SENT")) sent++;
    }

    return ok({ considered: due.length, sent, alreadyReminded: skipped });
  } catch (error) {
    return handleError(error);
  }
}
