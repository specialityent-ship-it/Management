import { NextRequest, NextResponse } from "next/server";
import { AppointmentStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { notifyAppointment } from "@/lib/notifications";

/// Razorpay's server-to-server notification. This is the authoritative record
/// of a payment — the browser callback can be lost if the patient closes the
/// tab, so confirmation must not depend on it alone.
export async function POST(request: NextRequest) {
  const raw = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  if (!signature || !verifyWebhookSignature(raw, signature)) {
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(raw) as {
    event: string;
    payload: {
      payment?: { entity: { id: string; order_id: string; method?: string; error_description?: string } };
      refund?: { entity: { amount: number; payment_id: string } };
    };
  };

  try {
    switch (event.event) {
      case "payment.captured": {
        const entity = event.payload.payment?.entity;
        if (!entity) break;
        const payment = await prisma.payment.findUnique({
          where: { razorpayOrderId: entity.order_id },
        });
        if (!payment || payment.status === "PAID") break;

        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: "PAID", razorpayPaymentId: entity.id, method: entity.method ?? null },
        });
        if (payment.appointmentId) {
          const confirmed = await prisma.appointment.updateMany({
            where: { id: payment.appointmentId, status: AppointmentStatus.PENDING_PAYMENT },
            data: { status: AppointmentStatus.CONFIRMED },
          });

          // `once` keeps this from double-messaging when the browser callback
          // already handled the same payment.
          if (confirmed.count > 0) {
            await notifyAppointment({
              template: "booking_confirmed",
              appointmentId: payment.appointmentId,
              once: true,
            });
          }
          await notifyAppointment({
            template: "payment_receipt",
            appointmentId: payment.appointmentId,
            entity: "Payment",
            entityId: payment.id,
            once: true,
            extra: { amountMinor: payment.amountMinor, receiptNo: payment.receiptNo },
          });
        }
        break;
      }

      case "payment.failed": {
        const entity = event.payload.payment?.entity;
        if (!entity) break;
        await prisma.payment.updateMany({
          where: { razorpayOrderId: entity.order_id, status: { notIn: ["PAID", "REFUNDED"] } },
          data: { status: "FAILED", failureReason: entity.error_description ?? "Payment failed" },
        });
        break;
      }

      case "refund.processed": {
        const entity = event.payload.refund?.entity;
        if (!entity) break;
        const payment = await prisma.payment.findUnique({
          where: { razorpayPaymentId: entity.payment_id },
        });
        if (!payment) break;
        const refundedMinor = payment.refundedMinor + entity.amount;
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            refundedMinor,
            status: refundedMinor >= payment.amountMinor ? "REFUNDED" : payment.status,
          },
        });
        break;
      }
    }
  } catch (error) {
    console.error("Razorpay webhook handling failed", error);
    // Returning 500 asks Razorpay to retry the delivery.
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
