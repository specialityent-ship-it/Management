"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { serviceSchema } from "@/lib/validation";
import { uniqueSlug } from "@/lib/slug";
import { ApiError } from "@/lib/api";

function readService(formData: FormData) {
  return serviceSchema.parse({
    name: formData.get("name"),
    slug: formData.get("slug") || "",
    kind: formData.get("kind") || "OPD",
    description: formData.get("description"),
    durationMin: formData.get("durationMin"),
    priceMinor: formData.get("priceMinor") || 0,
    depositMinor: formData.get("depositMinor") || 0,
    requiresDeposit: formData.get("requiresDeposit") === "on",
    displayOrder: formData.get("displayOrder") || 100,
    active: formData.get("active") === "on",
    doctorIds: formData.getAll("doctorIds").map(String),
  });
}

/// Asking for a deposit of zero would leave a booking stuck at
/// PENDING_PAYMENT with nothing to pay, so reject it at the door.
function assertDepositIsUsable(input: ReturnType<typeof readService>) {
  if (input.requiresDeposit && input.depositMinor <= 0) {
    throw new ApiError("Set a deposit amount, or turn the deposit requirement off.", 422);
  }
}

export async function createService(formData: FormData) {
  await requireSession(["ADMIN"]);
  const input = readService(formData);
  assertDepositIsUsable(input);

  await prisma.service.create({
    data: {
      name: input.name,
      slug: await uniqueSlug(input.slug || input.name, "service"),
      kind: input.kind,
      description: input.description,
      durationMin: input.durationMin,
      priceMinor: input.priceMinor,
      depositMinor: input.depositMinor,
      requiresDeposit: input.requiresDeposit,
      displayOrder: input.displayOrder,
      active: input.active,
      doctors: { connect: input.doctorIds.map((id) => ({ id })) },
    },
  });

  revalidatePath("/admin/services");
  revalidatePath("/services");
  revalidatePath("/book");
}

export async function updateService(formData: FormData) {
  await requireSession(["ADMIN"]);
  const id = String(formData.get("id"));
  const input = readService(formData);
  assertDepositIsUsable(input);

  await prisma.service.update({
    where: { id },
    data: {
      name: input.name,
      slug: await uniqueSlug(input.slug || input.name, "service", id),
      kind: input.kind,
      description: input.description,
      durationMin: input.durationMin,
      priceMinor: input.priceMinor,
      depositMinor: input.depositMinor,
      requiresDeposit: input.requiresDeposit,
      displayOrder: input.displayOrder,
      active: input.active,
      // `set` rather than `connect` so unticking a doctor actually detaches them.
      doctors: { set: input.doctorIds.map((doctorId) => ({ id: doctorId })) },
    },
  });

  revalidatePath("/admin/services");
  revalidatePath("/services");
  revalidatePath("/book");
}

/// Like doctors, services are deactivated rather than deleted — past
/// appointments and theatre cases still point at them.
export async function setServiceActive(formData: FormData) {
  await requireSession(["ADMIN"]);
  const id = String(formData.get("id"));
  const active = formData.get("active") === "true";

  await prisma.service.update({ where: { id }, data: { active } });

  revalidatePath("/admin/services");
  revalidatePath("/services");
  revalidatePath("/book");
}
