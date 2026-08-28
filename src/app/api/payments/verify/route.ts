import { NextRequest } from "next/server";
import { z } from "zod";
import { AppointmentStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ok, handleError, ApiError } from "@/lib/api";
import { verifyCheckoutSignature } from "@/lib/razorpay";

const schema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = schema.parse(await request.json());

    const valid = verifyCheckoutSignature({
      orderId: body.razorpay_order_id,
      paymentId: body.razorpay_payment_id,
      signature: body.razorpay_signature,
    });
    if (!valid) throw new ApiError("Payment could not be verified.", 400);

    const payment = await prisma.payment.findUnique({
      where: { razorpayOrderId: body.razorpay_order_id },
      include: { appointment: true },
    });
    if (!payment) throw new ApiError("Payment record not found.", 404);

    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "PAID",
        razorpayPaymentId: body.razorpay_payment_id,
        razorpaySignature: body.razorpay_signature,
      },
    });

    // A paid deposit is what turns a request into a held slot.
    if (payment.appointmentId && payment.appointment?.status === AppointmentStatus.PENDING_PAYMENT) {
      await prisma.appointment.update({
        where: { id: payment.appointmentId },
        data: { status: AppointmentStatus.CONFIRMED },
      });
    }

    return ok({
      receiptNo: updated.receiptNo,
      reference: payment.appointment?.reference ?? null,
      status: "PAID",
    });
  } catch (error) {
    return handleError(error);
  }
}
