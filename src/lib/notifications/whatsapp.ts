import "server-only";
import type { TemplateName } from "./templates";

export function whatsappConfigured() {
  return Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

/// Meta requires business-initiated messages to use a template approved in
/// WhatsApp Manager. The approved names rarely match ours, so each is
/// overridable; the default is the template name itself.
function templateFor(template: TemplateName) {
  const overrides: Record<TemplateName, string | undefined> = {
    booking_received: process.env.WHATSAPP_TEMPLATE_BOOKING_RECEIVED,
    booking_confirmed: process.env.WHATSAPP_TEMPLATE_BOOKING_CONFIRMED,
    booking_cancelled: process.env.WHATSAPP_TEMPLATE_BOOKING_CANCELLED,
    payment_receipt: process.env.WHATSAPP_TEMPLATE_PAYMENT_RECEIPT,
    appointment_reminder: process.env.WHATSAPP_TEMPLATE_APPOINTMENT_REMINDER,
    ot_scheduled: process.env.WHATSAPP_TEMPLATE_OT_SCHEDULED,
  };
  return overrides[template] || template;
}

/// Meta expects E.164 without the leading "+". Indian mobile numbers are
/// stored locally as ten digits, so assume the configured country code when
/// no other one is present.
export function toE164(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const countryCode = (process.env.WHATSAPP_DEFAULT_COUNTRY_CODE || "91").replace(/\D/g, "");
  if (digits.length === 10) return `${countryCode}${digits}`;
  return digits.replace(/^0+/, "");
}

export async function sendWhatsApp(params: {
  to: string;
  template: TemplateName;
  params: string[];
}) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const version = process.env.META_GRAPH_VERSION || "v21.0";
  const language = process.env.WHATSAPP_TEMPLATE_LANGUAGE || "en";

  if (!token || !phoneNumberId) throw new Error("WhatsApp is not configured");

  const res = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: toE164(params.to),
      type: "template",
      template: {
        name: templateFor(params.template),
        language: { code: language },
        components: params.params.length
          ? [
              {
                type: "body",
                parameters: params.params.map((text) => ({ type: "text", text })),
              },
            ]
          : [],
      },
    }),
  });

  const json = (await res.json()) as {
    messages?: { id: string }[];
    error?: { message?: string; error_data?: { details?: string } };
  };

  if (!res.ok || json.error) {
    const detail = json.error?.error_data?.details;
    throw new Error(
      `WhatsApp API error (${res.status}): ${json.error?.message ?? "unknown"}${
        detail ? ` — ${detail}` : ""
      }`,
    );
  }

  return json.messages?.[0]?.id;
}
