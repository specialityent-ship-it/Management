import "server-only";
import { NotificationChannel, NotificationStatus } from "@prisma/client";
import { prisma } from "../db";
import { render, type TemplateContext, type TemplateName } from "./templates";
import { emailConfigured, sendEmail } from "./email";
import { whatsappConfigured, sendWhatsApp } from "./whatsapp";

export { emailConfigured, whatsappConfigured };
export type { TemplateName };

export type NotifyTarget = {
  email?: string | null;
  phone?: string | null;
};

export type NotifyResult = {
  channel: NotificationChannel;
  status: NotificationStatus;
  error?: string;
};

/// Sends one template across every configured channel the patient has an
/// address for.
///
/// Delivery is deliberately best-effort and never throws: a clinic must not
/// lose a booking because an SMTP host was briefly down. Every attempt —
/// including skips — is written to NotificationLog so staff can see what
/// actually reached the patient.
export async function notify(params: {
  template: TemplateName;
  to: NotifyTarget;
  context: TemplateContext;
  entity?: string;
  entityId?: string;
  /// When set, the message is suppressed if an identical one already went out
  /// for this entity. Used by the reminder cron.
  once?: boolean;
}): Promise<NotifyResult[]> {
  if (params.once && params.entityId) {
    // SENT and SKIPPED both count as settled: a delivered message must not
    // repeat, and a patient with no address on file will still have none on
    // the next cron tick — re-logging that every run would bury the log.
    // FAILED is deliberately excluded so a transient SMTP outage retries.
    const already = await prisma.notificationLog.findFirst({
      where: {
        entity: params.entity,
        entityId: params.entityId,
        template: params.template,
        status: { in: [NotificationStatus.SENT, NotificationStatus.SKIPPED] },
      },
      select: { id: true },
    });
    if (already) return [];
  }

  const message = render(params.template, params.context);
  const results: NotifyResult[] = [];

  const attempts: { channel: NotificationChannel; recipient: string | null | undefined; configured: boolean }[] = [
    { channel: NotificationChannel.EMAIL, recipient: params.to.email, configured: emailConfigured() },
    { channel: NotificationChannel.WHATSAPP, recipient: params.to.phone, configured: whatsappConfigured() },
  ];

  for (const attempt of attempts) {
    if (!attempt.configured || !attempt.recipient) {
      const reason = !attempt.configured ? "Channel not configured" : "No address on file";

      // An unconfigured channel is a global setting, not news about this
      // patient, so it stays out of the log. A missing address is actionable —
      // staff can see who they could not reach and phone them instead.
      if (attempt.configured) {
        await log({
          channel: attempt.channel,
          template: params.template,
          recipient: "—",
          subject: message.subject,
          body: message.text,
          status: NotificationStatus.SKIPPED,
          error: reason,
          entity: params.entity,
          entityId: params.entityId,
        });
      }

      results.push({ channel: attempt.channel, status: NotificationStatus.SKIPPED, error: reason });
      continue;
    }

    try {
      if (attempt.channel === NotificationChannel.EMAIL) {
        await sendEmail({
          to: attempt.recipient,
          subject: message.subject,
          text: message.text,
        });
      } else {
        await sendWhatsApp({
          to: attempt.recipient,
          template: params.template,
          params: message.whatsappParams,
        });
      }

      await log({
        channel: attempt.channel,
        template: params.template,
        recipient: attempt.recipient,
        subject: message.subject,
        body: message.text,
        status: NotificationStatus.SENT,
        entity: params.entity,
        entityId: params.entityId,
      });
      results.push({ channel: attempt.channel, status: NotificationStatus.SENT });
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unknown error";
      console.error(`[notify] ${attempt.channel} ${params.template} failed:`, detail);

      await log({
        channel: attempt.channel,
        template: params.template,
        recipient: attempt.recipient,
        subject: message.subject,
        body: message.text,
        status: NotificationStatus.FAILED,
        error: detail,
        entity: params.entity,
        entityId: params.entityId,
      });
      results.push({ channel: attempt.channel, status: NotificationStatus.FAILED, error: detail });
    }
  }

  return results;
}

async function log(data: {
  channel: NotificationChannel;
  template: string;
  recipient: string;
  subject: string;
  body: string;
  status: NotificationStatus;
  error?: string;
  entity?: string;
  entityId?: string;
}) {
  try {
    await prisma.notificationLog.create({ data });
  } catch (error) {
    // Logging must never be the thing that breaks the caller.
    console.error("[notify] could not write NotificationLog:", error);
  }
}

/// Convenience wrapper for the common case: notifying about an appointment.
export async function notifyAppointment(params: {
  template: TemplateName;
  appointmentId: string;
  once?: boolean;
  extra?: Partial<TemplateContext>;
  /// Override what the message is de-duplicated against. A receipt is keyed
  /// to its Payment, so the browser callback and the webhook racing each
  /// other send one message, while a later second payment still sends its own.
  entity?: string;
  entityId?: string;
}) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: params.appointmentId },
    include: { patient: true, doctor: true, service: true },
  });
  if (!appointment) return [];

  return notify({
    template: params.template,
    to: { email: appointment.patient.email, phone: appointment.patient.phone },
    entity: params.entity ?? "Appointment",
    entityId: params.entityId ?? appointment.id,
    once: params.once,
    context: {
      patientName: appointment.patient.name,
      reference: appointment.reference,
      serviceName: appointment.service.name,
      doctorName: appointment.doctor.name,
      start: appointment.start,
      cancelledReason: appointment.cancelledReason,
      ...params.extra,
    },
  });
}
