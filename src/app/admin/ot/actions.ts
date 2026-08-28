"use server";

import { revalidatePath } from "next/cache";
import { OtStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { otCaseSchema } from "@/lib/validation";
import { assertSlotFree, assertTheatreFree } from "@/lib/scheduling";
import { otReference } from "@/lib/ids";
import { notify } from "@/lib/notifications";

/// WHO surgical safety checklist, trimmed to the items a day-case theatre
/// actually signs off. Seeded on every new case so nothing is forgotten.
const DEFAULT_CHECKLIST: { label: string; phase: string }[] = [
  { label: "Consent signed and filed", phase: "PRE_OP" },
  { label: "Anaesthetic fitness cleared", phase: "PRE_OP" },
  { label: "Fasting instructions given", phase: "PRE_OP" },
  { label: "Investigations available", phase: "PRE_OP" },
  { label: "Patient identity and site confirmed", phase: "SIGN_IN" },
  { label: "Allergies checked", phase: "SIGN_IN" },
  { label: "Team introductions done", phase: "TIME_OUT" },
  { label: "Antibiotic prophylaxis given", phase: "TIME_OUT" },
  { label: "Instrument and swab count correct", phase: "SIGN_OUT" },
  { label: "Specimen labelled", phase: "SIGN_OUT" },
  { label: "Recovery instructions handed over", phase: "SIGN_OUT" },
];

export async function createOtCase(formData: FormData) {
  const session = await requireSession();

  const input = otCaseSchema.parse({
    patientId: formData.get("patientId"),
    surgeonId: formData.get("surgeonId"),
    serviceId: formData.get("serviceId"),
    theatreId: formData.get("theatreId") || "",
    scheduledStart: new Date(String(formData.get("scheduledStart"))).toISOString(),
    durationMin: formData.get("durationMin"),
    anaesthesia: formData.get("anaesthesia") || "LOCAL",
    anaesthetist: formData.get("anaesthetist") || "",
    assistants: formData.get("assistants") || "",
    procedureNote: formData.get("procedureNote") || "",
  });

  const scheduledStart = new Date(input.scheduledStart);
  const scheduledEnd = new Date(scheduledStart.getTime() + input.durationMin * 60 * 1000);

  const created = await prisma.$transaction(async (tx) => {
    await assertSlotFree({
      doctorId: input.surgeonId,
      start: scheduledStart,
      end: scheduledEnd,
      tx,
    });
    if (input.theatreId) {
      await assertTheatreFree({
        theatreId: input.theatreId,
        start: scheduledStart,
        end: scheduledEnd,
        tx,
      });
    }

    const otCase = await tx.otCase.create({
      data: {
        reference: otReference(),
        patientId: input.patientId,
        surgeonId: input.surgeonId,
        serviceId: input.serviceId,
        theatreId: input.theatreId || null,
        scheduledStart,
        scheduledEnd,
        anaesthesia: input.anaesthesia,
        anaesthetist: input.anaesthetist || null,
        assistants: input.assistants || null,
        procedureNote: input.procedureNote || null,
      },
    });

    await tx.otChecklistItem.createMany({
      data: DEFAULT_CHECKLIST.map((item) => ({ ...item, caseId: otCase.id })),
    });

    await tx.auditLog.create({
      data: {
        userId: session.userId,
        action: "otcase.create",
        entity: "OtCase",
        entityId: otCase.id,
      },
    });

    return otCase;
  });

  // Sent after the transaction commits — a slow mail server should never hold
  // a database transaction open, and a bounce must not undo the booking.
  const detail = await prisma.otCase.findUnique({
    where: { id: created.id },
    include: { patient: true, surgeon: true, service: true, theatre: true },
  });

  if (detail) {
    await notify({
      template: "ot_scheduled",
      to: { email: detail.patient.email, phone: detail.patient.phone },
      entity: "OtCase",
      entityId: detail.id,
      context: {
        patientName: detail.patient.name,
        reference: detail.reference,
        serviceName: detail.service.name,
        doctorName: detail.surgeon.name,
        start: detail.scheduledStart,
        theatreName: detail.theatre?.name ?? null,
      },
    });
  }

  revalidatePath("/admin/ot");
}

export async function updateOtStatus(formData: FormData) {
  const session = await requireSession();
  const id = String(formData.get("id"));
  const status = String(formData.get("status")) as OtStatus;

  if (!Object.values(OtStatus).includes(status)) throw new Error("Unknown theatre status");

  await prisma.otCase.update({ where: { id }, data: { status } });
  await prisma.auditLog.create({
    data: {
      userId: session.userId,
      action: `otcase.${status.toLowerCase()}`,
      entity: "OtCase",
      entityId: id,
    },
  });

  revalidatePath("/admin/ot");
  revalidatePath(`/admin/ot/${id}`);
}

export async function toggleChecklistItem(formData: FormData) {
  const session = await requireSession();
  const itemId = String(formData.get("itemId"));
  const caseId = String(formData.get("caseId"));

  const item = await prisma.otChecklistItem.findUnique({ where: { id: itemId } });
  if (!item) throw new Error("Checklist item not found");

  await prisma.otChecklistItem.update({
    where: { id: itemId },
    data: {
      done: !item.done,
      doneAt: item.done ? null : new Date(),
      doneBy: item.done ? null : session.name,
    },
  });

  revalidatePath(`/admin/ot/${caseId}`);
}

export async function updateOtFlags(formData: FormData) {
  await requireSession();
  const id = String(formData.get("id"));

  await prisma.otCase.update({
    where: { id },
    data: {
      consentSigned: formData.get("consentSigned") === "on",
      fitnessCleared: formData.get("fitnessCleared") === "on",
      anaesthetist: String(formData.get("anaesthetist") ?? "").trim() || null,
      assistants: String(formData.get("assistants") ?? "").trim() || null,
      procedureNote: String(formData.get("procedureNote") ?? "").trim() || null,
    },
  });

  revalidatePath(`/admin/ot/${id}`);
}
