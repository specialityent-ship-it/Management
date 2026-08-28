"use server";

import { revalidatePath } from "next/cache";
import { AppointmentStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { notifyAppointment } from "@/lib/notifications";

export async function updateAppointmentStatus(formData: FormData) {
  const session = await requireSession();
  const id = String(formData.get("id"));
  const status = String(formData.get("status")) as AppointmentStatus;
  const reason = String(formData.get("reason") ?? "").trim();

  if (!Object.values(AppointmentStatus).includes(status)) {
    throw new Error("Unknown appointment status");
  }

  await prisma.appointment.update({
    where: { id },
    data: {
      status,
      ...(status === AppointmentStatus.CANCELLED && reason ? { cancelledReason: reason } : {}),
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.userId,
      action: `appointment.${status.toLowerCase()}`,
      entity: "Appointment",
      entityId: id,
      meta: reason || null,
    },
  });

  // Only the two transitions the patient needs to hear about. Check-in and
  // completion are internal state, and messaging them would be noise.
  if (status === AppointmentStatus.CONFIRMED) {
    await notifyAppointment({ template: "booking_confirmed", appointmentId: id });
  } else if (status === AppointmentStatus.CANCELLED) {
    await notifyAppointment({ template: "booking_cancelled", appointmentId: id });
  }

  revalidatePath("/admin/appointments");
  revalidatePath("/admin");
}

export async function saveStaffNote(formData: FormData) {
  await requireSession();
  const id = String(formData.get("id"));
  const staffNote = String(formData.get("staffNote") ?? "").trim();

  await prisma.appointment.update({
    where: { id },
    data: { staffNote: staffNote || null },
  });

  revalidatePath("/admin/appointments");
}
