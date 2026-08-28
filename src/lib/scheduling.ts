import { prisma } from "./db";
import { ApiError } from "./api";
import { AppointmentStatus, Prisma } from "@prisma/client";

/// Statuses that still occupy the doctor's calendar. Cancelled and no-show
/// slots are released back to the pool.
export const BLOCKING_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.REQUESTED,
  AppointmentStatus.PENDING_PAYMENT,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.CHECKED_IN,
];

export type Slot = { start: Date; end: Date };

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function overlaps(a: Slot, b: { start: Date; end: Date }) {
  return a.start < b.end && b.start < a.end;
}

/// Expands a doctor's weekly availability for one day into concrete slots of
/// `durationMin`, then removes anything taken by an existing appointment, a
/// scheduled OT case, or a time-off block.
export async function availableSlots(params: {
  doctorId: string;
  date: Date;
  durationMin: number;
  now?: Date;
}): Promise<Slot[]> {
  const { doctorId, durationMin } = params;
  const now = params.now ?? new Date();
  const day = startOfUtcDay(params.date);
  const dayEnd = new Date(day.getTime() + 24 * 60 * 60 * 1000);

  const [windows, booked, otCases, timeOff] = await Promise.all([
    prisma.availability.findMany({
      where: { doctorId, dayOfWeek: day.getUTCDay(), active: true },
      orderBy: { startMinute: "asc" },
    }),
    prisma.appointment.findMany({
      where: {
        doctorId,
        status: { in: BLOCKING_STATUSES },
        start: { lt: dayEnd },
        end: { gt: day },
      },
      select: { start: true, end: true },
    }),
    prisma.otCase.findMany({
      where: {
        surgeonId: doctorId,
        status: { notIn: ["CANCELLED", "POSTPONED"] },
        scheduledStart: { lt: dayEnd },
        scheduledEnd: { gt: day },
      },
      select: { scheduledStart: true, scheduledEnd: true },
    }),
    prisma.timeOff.findMany({
      where: { doctorId, start: { lt: dayEnd }, end: { gt: day } },
      select: { start: true, end: true },
    }),
  ]);

  const busy = [
    ...booked,
    ...otCases.map((c) => ({ start: c.scheduledStart, end: c.scheduledEnd })),
    ...timeOff,
  ];

  const slots: Slot[] = [];
  for (const window of windows) {
    const step = Math.max(window.slotMin, 5);
    for (let m = window.startMinute; m + durationMin <= window.endMinute; m += step) {
      const start = new Date(day.getTime() + m * 60 * 1000);
      const end = new Date(start.getTime() + durationMin * 60 * 1000);
      if (start <= now) continue;
      if (busy.some((b) => overlaps({ start, end }, b))) continue;
      slots.push({ start, end });
    }
  }
  return slots;
}

/// Re-checks the exact requested window at write time. `availableSlots` is
/// advisory (the patient may have had the page open for minutes); this is the
/// check that actually prevents a double booking.
export async function assertSlotFree(params: {
  doctorId: string;
  start: Date;
  end: Date;
  ignoreAppointmentId?: string;
  tx?: Prisma.TransactionClient;
}) {
  const client = params.tx ?? prisma;
  const clash = await client.appointment.findFirst({
    where: {
      doctorId: params.doctorId,
      status: { in: BLOCKING_STATUSES },
      start: { lt: params.end },
      end: { gt: params.start },
      ...(params.ignoreAppointmentId ? { id: { not: params.ignoreAppointmentId } } : {}),
    },
    select: { id: true },
  });
  if (clash) throw new ApiError("That slot has just been taken. Please pick another time.", 409);

  const otClash = await client.otCase.findFirst({
    where: {
      surgeonId: params.doctorId,
      status: { notIn: ["CANCELLED", "POSTPONED"] },
      scheduledStart: { lt: params.end },
      scheduledEnd: { gt: params.start },
    },
    select: { id: true },
  });
  if (otClash) throw new ApiError("The doctor is in theatre at that time.", 409);
}

/// Theatres are a scarce shared resource — two cases must never overlap in one.
export async function assertTheatreFree(params: {
  theatreId: string;
  start: Date;
  end: Date;
  ignoreCaseId?: string;
  tx?: Prisma.TransactionClient;
}) {
  const client = params.tx ?? prisma;
  const clash = await client.otCase.findFirst({
    where: {
      theatreId: params.theatreId,
      status: { notIn: ["CANCELLED", "POSTPONED"] },
      scheduledStart: { lt: params.end },
      scheduledEnd: { gt: params.start },
      ...(params.ignoreCaseId ? { id: { not: params.ignoreCaseId } } : {}),
    },
    select: { id: true, reference: true },
  });
  if (clash) throw new ApiError(`Theatre is already booked (case ${clash.reference}).`, 409);
}
