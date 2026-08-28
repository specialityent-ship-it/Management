import { clinic } from "../config";
import { formatDateTime, formatMoney } from "../format";

export type TemplateName =
  | "booking_received"
  | "booking_confirmed"
  | "booking_cancelled"
  | "payment_receipt"
  | "appointment_reminder"
  | "ot_scheduled";

export type TemplateContext = {
  patientName: string;
  reference: string;
  serviceName: string;
  doctorName: string;
  start: Date;
  amountMinor?: number;
  receiptNo?: string;
  cancelledReason?: string | null;
  theatreName?: string | null;
};

export type RenderedMessage = {
  subject: string;
  /// Plain text — used verbatim for WhatsApp and as the email's text part.
  text: string;
  /// WhatsApp template parameters, in the order the approved template expects.
  whatsappParams: string[];
};

const signOff = `\n\n${clinic.name}\n${clinic.phone}\n${clinic.address}`;

/// Kept deliberately plain: these are transactional messages, and anything a
/// patient needs to act on (reference, date, amount) leads the message.
export function render(template: TemplateName, ctx: TemplateContext): RenderedMessage {
  const when = formatDateTime(ctx.start);
  const firstName = ctx.patientName.split(" ")[0] || ctx.patientName;

  switch (template) {
    case "booking_received":
      return {
        subject: `We have your appointment request (${ctx.reference})`,
        text: `Hello ${firstName},\n\nWe have received your request for ${ctx.serviceName} with ${ctx.doctorName} on ${when}.\n\nYour reference is ${ctx.reference}. Our team will confirm the slot shortly. If you need to change anything, call us with that reference.${signOff}`,
        whatsappParams: [firstName, ctx.serviceName, ctx.doctorName, when, ctx.reference],
      };

    case "booking_confirmed":
      return {
        subject: `Appointment confirmed — ${when} (${ctx.reference})`,
        text: `Hello ${firstName},\n\nYour appointment is confirmed.\n\n${ctx.serviceName}\n${ctx.doctorName}\n${when}\nReference: ${ctx.reference}\n\nPlease arrive ten minutes early and bring any previous reports or scans. To reschedule, call us with your reference.${signOff}`,
        whatsappParams: [firstName, ctx.serviceName, ctx.doctorName, when, ctx.reference],
      };

    case "booking_cancelled":
      return {
        subject: `Appointment cancelled (${ctx.reference})`,
        text: `Hello ${firstName},\n\nYour appointment for ${ctx.serviceName} on ${when} has been cancelled.${
          ctx.cancelledReason ? `\n\nReason: ${ctx.cancelledReason}` : ""
        }\n\nIf this was not expected, or you would like another time, please call us.${signOff}`,
        whatsappParams: [firstName, ctx.serviceName, when],
      };

    case "payment_receipt":
      return {
        subject: `Payment received — ${formatMoney(ctx.amountMinor ?? 0)} (${ctx.receiptNo ?? ""})`,
        text: `Hello ${firstName},\n\nWe have received your payment of ${formatMoney(
          ctx.amountMinor ?? 0,
        )}.\n\nReceipt: ${ctx.receiptNo}\nFor: ${ctx.serviceName} on ${when}\nReference: ${ctx.reference}\n\nThis amount is adjusted against your final bill. Please keep this message for your records.${signOff}`,
        whatsappParams: [
          firstName,
          formatMoney(ctx.amountMinor ?? 0),
          ctx.receiptNo ?? "",
          ctx.reference,
        ],
      };

    case "appointment_reminder":
      return {
        subject: `Reminder: your appointment is tomorrow (${ctx.reference})`,
        text: `Hello ${firstName},\n\nThis is a reminder of your appointment tomorrow.\n\n${ctx.serviceName}\n${ctx.doctorName}\n${when}\nReference: ${ctx.reference}\n\nPlease arrive ten minutes early with any previous reports. If you cannot attend, call us so we can offer the slot to someone else.${signOff}`,
        whatsappParams: [firstName, ctx.serviceName, ctx.doctorName, when, ctx.reference],
      };

    case "ot_scheduled":
      return {
        subject: `Your procedure is scheduled — ${when} (${ctx.reference})`,
        text: `Hello ${firstName},\n\nYour procedure has been scheduled.\n\n${ctx.serviceName}\nSurgeon: ${ctx.doctorName}\n${when}${
          ctx.theatreName ? `\nTheatre: ${ctx.theatreName}` : ""
        }\nReference: ${ctx.reference}\n\nOur team will call you with fasting and pre-operative instructions. Please do not stop or start any medication before speaking to us.${signOff}`,
        whatsappParams: [firstName, ctx.serviceName, ctx.doctorName, when, ctx.reference],
      };
  }
}
