import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, handleError, ApiError } from "@/lib/api";
import { createOrder } from "@/lib/razorpay";
import { receiptNumber } from "@/lib/ids";

const schema = z.object({ appointmentId: z.string().min(1) });

export async function POST(request: NextRequest) {
  try {
    const { appointmentId } = schema.parse(await request.json());

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { service: true, patient: true },
    });
    if (!appointment) throw new ApiError("Appointment not found", 404);
    if (appointment.status === "CANCELLED") throw new ApiError("This booking was cancelled.", 409);

    const amountMinor = appointment.service.requiresDeposit
      ? appointment.service.depositMinor
      : appointment.service.priceMinor;
    if (amountMinor <= 0) throw new ApiError("Nothing to pay for this booking.", 400);

    // Reuse an unpaid order so a patient who refreshes checkout does not
    // accumulate duplicate orders against the same appointment.
    const reusable = await prisma.payment.findFirst({
      where: {
        appointmentId: appointment.id,
        status: { in: ["CREATED", "ATTEMPTED"] },
        amountMinor,
        razorpayOrderId: { not: null },
      },
    });

    const payment =
      reusable ??
      (await (async () => {
        const receiptNo = receiptNumber();
        const order = await createOrder({
          amountMinor,
          receipt: receiptNo,
          notes: {
            appointmentRef: appointment.reference,
            patient: appointment.patient.name,
            service: appointment.service.name,
          },
        });
        return prisma.payment.create({
          data: {
            appointmentId: appointment.id,
            patientId: appointment.patientId,
            purpose: appointment.service.requiresDeposit ? "CONSULT_DEPOSIT" : "CONSULT_FEE",
            amountMinor,
            receiptNo,
            razorpayOrderId: order.id,
          },
        });
      })());

    return ok({
      orderId: payment.razorpayOrderId,
      amountMinor: payment.amountMinor,
      currency: payment.currency,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? process.env.RAZORPAY_KEY_ID,
      prefill: {
        name: appointment.patient.name,
        email: appointment.patient.email ?? "",
        contact: appointment.patient.phone,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
