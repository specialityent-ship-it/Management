"use server";

import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireSession, hashPassword } from "@/lib/auth";
import { staffSchema } from "@/lib/validation";
import { ApiError } from "@/lib/api";

export async function createStaff(formData: FormData) {
  await requireSession(["ADMIN"]);

  const input = staffSchema.parse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role") || "RECEPTION",
  });

  const email = input.email.toLowerCase();
  if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) {
    throw new ApiError("Someone already has that email address.", 409);
  }

  await prisma.user.create({
    data: {
      name: input.name,
      email,
      passwordHash: await hashPassword(input.password),
      role: input.role,
    },
  });

  revalidatePath("/admin/staff");
}

export async function updateStaffRole(formData: FormData) {
  const session = await requireSession(["ADMIN"]);
  const id = String(formData.get("id"));
  const role = String(formData.get("role")) as Role;

  if (!Object.values(Role).includes(role)) throw new Error("Unknown role");
  if (id === session.userId && role !== Role.ADMIN) {
    throw new ApiError("You cannot remove your own admin access.", 422);
  }

  await prisma.user.update({ where: { id }, data: { role } });
  revalidatePath("/admin/staff");
}

export async function setStaffActive(formData: FormData) {
  const session = await requireSession(["ADMIN"]);
  const id = String(formData.get("id"));
  const active = formData.get("active") === "true";

  if (id === session.userId && !active) {
    throw new ApiError("You cannot disable your own account.", 422);
  }

  // Losing the last administrator would lock everyone out of the console.
  if (!active) {
    const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
    if (target?.role === Role.ADMIN) {
      const admins = await prisma.user.count({ where: { role: Role.ADMIN, active: true } });
      if (admins <= 1) throw new ApiError("This is the last active administrator.", 422);
    }
  }

  await prisma.user.update({ where: { id }, data: { active } });
  revalidatePath("/admin/staff");
}

export async function resetStaffPassword(formData: FormData) {
  await requireSession(["ADMIN"]);
  const id = String(formData.get("id"));
  const password = String(formData.get("password") ?? "");

  if (password.length < 12) throw new ApiError("Use at least 12 characters.", 422);

  await prisma.user.update({ where: { id }, data: { passwordHash: await hashPassword(password) } });
  revalidatePath("/admin/staff");
}
