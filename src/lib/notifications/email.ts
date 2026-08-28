import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { clinic } from "../config";

let transporter: Transporter | null = null;

export function emailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT);
}

/// SMTP rather than a specific vendor SDK, so the clinic can point this at
/// Google Workspace, Amazon SES, Zoho, Postmark or anything else without a
/// code change.
function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  if (!host) throw new Error("SMTP_HOST is not set");

  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  transporter = nodemailer.createTransport({
    host,
    port,
    // Port 465 is implicit TLS; everything else upgrades via STARTTLS.
    secure: port === 465,
    ...(user && pass ? { auth: { user, pass } } : {}),
  });

  return transporter;
}

export async function sendEmail(params: { to: string; subject: string; text: string }) {
  const from = process.env.SMTP_FROM || `${clinic.name} <${clinic.email}>`;

  await getTransporter().sendMail({
    from,
    to: params.to,
    subject: params.subject,
    text: params.text,
    html: toHtml(params.text),
  });
}

/// The templates are authored as plain text; this wraps them in minimal,
/// client-safe HTML rather than pulling in a templating layer.
function toHtml(text: string) {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");

  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#1f242e;max-width:600px">${escaped}</div>`;
}
