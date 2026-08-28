import "server-only";
import crypto from "node:crypto";
import Razorpay from "razorpay";
import { ApiError } from "./api";

let client: Razorpay | null = null;

export function razorpay() {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) {
    throw new ApiError(
      "Payments are not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
      503,
    );
  }
  if (!client) client = new Razorpay({ key_id, key_secret });
  return client;
}

export async function createOrder(params: {
  amountMinor: number;
  receipt: string;
  notes?: Record<string, string>;
}) {
  return razorpay().orders.create({
    amount: params.amountMinor,
    currency: "INR",
    receipt: params.receipt,
    notes: params.notes,
  });
}

/// Verifies the handshake the Razorpay Checkout widget hands back to the
/// browser. Never trust the browser's "payment succeeded" without this.
export function verifyCheckoutSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) throw new ApiError("Payments are not configured.", 503);
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${params.orderId}|${params.paymentId}`)
    .digest("hex");
  return timingSafeEqual(expected, params.signature);
}

/// Verifies the raw body of an inbound Razorpay webhook.
export function verifyWebhookSignature(rawBody: string, signature: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) throw new ApiError("RAZORPAY_WEBHOOK_SECRET is not set.", 503);
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return timingSafeEqual(expected, signature);
}

function timingSafeEqual(a: string, b: string) {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
