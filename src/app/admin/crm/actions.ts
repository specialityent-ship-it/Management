"use server";

import { revalidatePath } from "next/cache";
import { LeadStage, ActivityType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { leadSchema } from "@/lib/validation";

export async function createLead(formData: FormData) {
  await requireSession();

  const input = leadSchema.parse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email") || "",
    city: formData.get("city") || "",
    interest: formData.get("interest") || "",
    message: formData.get("message") || "",
    source: formData.get("source") || "PHONE",
  });

  const lead = await prisma.lead.create({
    data: {
      name: input.name,
      phone: input.phone.replace(/[\s-]/g, ""),
      email: input.email || null,
      city: input.city || null,
      interest: input.interest || null,
      message: input.message || null,
      source: input.source,
    },
  });

  revalidatePath("/admin/crm");
  return lead.id;
}

export async function moveLeadStage(formData: FormData) {
  const session = await requireSession();
  const id = String(formData.get("id"));
  const stage = String(formData.get("stage")) as LeadStage;
  const lostReason = String(formData.get("lostReason") ?? "").trim();

  if (!Object.values(LeadStage).includes(stage)) throw new Error("Unknown lead stage");

  const lead = await prisma.lead.update({
    where: { id },
    data: { stage, ...(stage === LeadStage.LOST && lostReason ? { lostReason } : {}) },
  });

  await prisma.leadActivity.create({
    data: {
      leadId: lead.id,
      userId: session.userId,
      type: ActivityType.STAGE_CHANGE,
      body: `Moved to ${stage.replace(/_/g, " ").toLowerCase()}${lostReason ? ` — ${lostReason}` : ""}.`,
    },
  });

  revalidatePath("/admin/crm");
  revalidatePath(`/admin/crm/${id}`);
}

export async function addLeadActivity(formData: FormData) {
  const session = await requireSession();
  const leadId = String(formData.get("leadId"));
  const body = String(formData.get("body") ?? "").trim();
  const type = String(formData.get("type") ?? "NOTE") as ActivityType;
  const nextFollowUp = String(formData.get("nextFollowUp") ?? "").trim();

  if (!body) return;

  await prisma.leadActivity.create({
    data: {
      leadId,
      userId: session.userId,
      type: Object.values(ActivityType).includes(type) ? type : ActivityType.NOTE,
      body,
    },
  });

  if (nextFollowUp) {
    await prisma.lead.update({
      where: { id: leadId },
      data: { nextFollowUp: new Date(nextFollowUp) },
    });
  }

  revalidatePath(`/admin/crm/${leadId}`);
  revalidatePath("/admin/crm");
}

export async function assignLead(formData: FormData) {
  await requireSession();
  const id = String(formData.get("id"));
  const ownerId = String(formData.get("ownerId") ?? "");

  await prisma.lead.update({ where: { id }, data: { ownerId: ownerId || null } });
  revalidatePath(`/admin/crm/${id}`);
  revalidatePath("/admin/crm");
}
