"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { doctorSchema, availabilitySchema, timeOffSchema } from "@/lib/validation";
import { uniqueSlug, timeToMinutes } from "@/lib/slug";
import { ApiError } from "@/lib/api";

function readDoctor(formData: FormData) {
  return doctorSchema.parse({
    name: formData.get("name"),
    slug: formData.get("slug") || "",
    qualifications: formData.get("qualifications"),
    specialty: formData.get("specialty"),
    bio: formData.get("bio") || "",
    photoUrl: formData.get("photoUrl") || "",
    regNumber: formData.get("regNumber") || "",
    yearsExp: formData.get("yearsExp") || 0,
    consultFee: formData.get("consultFee") || 0,
    active: formData.get("active") === "on",
  });
}

export async function createDoctor(formData: FormData) {
  await requireSession(["ADMIN"]);
  const input = readDoctor(formData);

  const doctor = await prisma.doctor.create({
    data: {
      name: input.name,
      slug: await uniqueSlug(input.slug || input.name, "doctor"),
      qualifications: input.qualifications,
      specialty: input.specialty,
      bio: input.bio || "",
      photoUrl: input.photoUrl || null,
      regNumber: input.regNumber || null,
      yearsExp: input.yearsExp,
      consultFee: input.consultFee,
      active: input.active,
    },
  });

  revalidatePath("/admin/doctors");
  revalidatePath("/doctors");
  redirect(`/admin/doctors/${doctor.id}`);
}

export async function updateDoctor(formData: FormData) {
  await requireSession(["ADMIN"]);
  const id = String(formData.get("id"));
  const input = readDoctor(formData);

  await prisma.doctor.update({
    where: { id },
    data: {
      name: input.name,
      slug: await uniqueSlug(input.slug || input.name, "doctor", id),
      qualifications: input.qualifications,
      specialty: input.specialty,
      bio: input.bio || "",
      photoUrl: input.photoUrl || null,
      regNumber: input.regNumber || null,
      yearsExp: input.yearsExp,
      consultFee: input.consultFee,
      active: input.active,
    },
  });

  revalidatePath("/admin/doctors");
  revalidatePath(`/admin/doctors/${id}`);
  revalidatePath("/doctors");
}

/// Doctors are never hard-deleted — appointments and theatre cases reference
/// them, and a clinic still needs last year's records. Deactivating removes
/// them from the website and from new bookings.
export async function setDoctorActive(formData: FormData) {
  await requireSession(["ADMIN"]);
  const id = String(formData.get("id"));
  const active = formData.get("active") === "true";

  await prisma.doctor.update({ where: { id }, data: { active } });

  revalidatePath("/admin/doctors");
  revalidatePath(`/admin/doctors/${id}`);
  revalidatePath("/doctors");
}

export async function addAvailability(formData: FormData) {
  await requireSession(["ADMIN"]);

  const input = availabilitySchema.parse({
    doctorId: formData.get("doctorId"),
    dayOfWeek: formData.get("dayOfWeek"),
    startMinute: timeToMinutes(String(formData.get("start") ?? "")),
    endMinute: timeToMinutes(String(formData.get("end") ?? "")),
    slotMin: formData.get("slotMin") || 15,
  });

  // Overlapping windows on the same day would generate duplicate slots.
  const clash = await prisma.availability.findFirst({
    where: {
      doctorId: input.doctorId,
      dayOfWeek: input.dayOfWeek,
      active: true,
      startMinute: { lt: input.endMinute },
      endMinute: { gt: input.startMinute },
    },
  });
  if (clash) throw new ApiError("That overlaps an existing window on the same day.", 409);

  await prisma.availability.create({ data: input });
  revalidatePath(`/admin/doctors/${input.doctorId}`);
  revalidatePath("/doctors");
}

export async function removeAvailability(formData: FormData) {
  await requireSession(["ADMIN"]);
  const id = String(formData.get("id"));
  const doctorId = String(formData.get("doctorId"));

  await prisma.availability.delete({ where: { id } });
  revalidatePath(`/admin/doctors/${doctorId}`);
  revalidatePath("/doctors");
}

export async function addTimeOff(formData: FormData) {
  await requireSession(["ADMIN"]);

  const input = timeOffSchema.parse({
    doctorId: formData.get("doctorId"),
    start: new Date(String(formData.get("start"))).toISOString(),
    end: new Date(String(formData.get("end"))).toISOString(),
    reason: formData.get("reason") || "",
  });

  await prisma.timeOff.create({
    data: {
      doctorId: input.doctorId,
      start: new Date(input.start),
      end: new Date(input.end),
      reason: input.reason || null,
    },
  });

  revalidatePath(`/admin/doctors/${input.doctorId}`);
}

export async function removeTimeOff(formData: FormData) {
  await requireSession(["ADMIN"]);
  const id = String(formData.get("id"));
  const doctorId = String(formData.get("doctorId"));

  await prisma.timeOff.delete({ where: { id } });
  revalidatePath(`/admin/doctors/${doctorId}`);
}
