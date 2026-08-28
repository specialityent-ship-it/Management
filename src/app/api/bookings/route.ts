import { NextRequest } from "next/server";
import { AppointmentStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ok, handleError, ApiError } from "@/lib/api";
import { bookingRequestSchema } from "@/lib/validation";
import { assertSlotFree } from "@/lib/scheduling";
import { appointmentReference, nextMrn } from "@/lib/ids";

export async function POST(request: NextRequest) {
  try {
    const input = bookingRequestSchema.parse(await request.json());

    const [service, doctor] = await Promise.all([
      prisma.service.findUnique({ where: { id: input.serviceId } }),
      prisma.doctor.findUnique({ where: { id: input.doctorId } }),
    ]);
    if (!service?.active) throw new ApiError("That service is not available.", 404);
    if (!doctor?.active) throw new ApiError("That doctor is not available.", 404);
    if (service.kind === "OT") {
      throw new ApiError(
        "Surgical procedures are scheduled after a consultation. Please book a consultation first.",
        422,
      );
    }

    const start = new Date(input.start);
    if (Number.isNaN(start.getTime())) throw new ApiError("Invalid appointment time.", 422);
    if (start.getTime() < Date.now()) throw new ApiError("Please choose a future time.", 422);
    const end = new Date(start.getTime() + service.durationMin * 60 * 1000);

    const phone = input.patient.phone.replace(/[\s-]/g, "");
    const needsDeposit = service.requiresDeposit && service.depositMinor > 0;

    const appointment = await prisma.$transaction(async (tx) => {
      await assertSlotFree({ doctorId: doctor.id, start, end, tx });

      // Returning patients are matched on phone number so their history stays
      // on one record instead of fragmenting across bookings.
      const existing = await tx.patient.findFirst({ where: { phone } });
      const patient = existing
        ? await tx.patient.update({
            where: { id: existing.id },
            data: {
              name: input.patient.name,
              email: input.patient.email || existing.email,
              city: input.patient.city || existing.city,
            },
          })
        : await tx.patient.create({
            data: {
              mrn: await nextMrn(),
              name: input.patient.name,
              phone,
              email: input.patient.email || null,
              gender: input.patient.gender,
              dob: input.patient.dob ? new Date(input.patient.dob) : null,
              city: input.patient.city || null,
            },
          });

      return tx.appointment.create({
        data: {
          reference: appointmentReference(),
          patientId: patient.id,
          doctorId: doctor.id,
          serviceId: service.id,
          start,
          end,
          reason: input.reason || null,
          source: "WEBSITE",
          status: needsDeposit ? AppointmentStatus.PENDING_PAYMENT : AppointmentStatus.REQUESTED,
        },
        include: { patient: true, doctor: true, service: true },
      });
    });

    // Every website booking also enters the CRM so marketing can attribute it
    // and reception can follow up on anything that stalls before payment.
    await prisma.lead.create({
      data: {
        name: appointment.patient.name,
        phone: appointment.patient.phone,
        email: appointment.patient.email,
        city: appointment.patient.city,
        stage: "CONSULT_BOOKED",
        source: "WEBSITE_FORM",
        interest: service.name,
        message: input.reason || null,
        valueMinor: service.priceMinor,
        patientId: appointment.patientId,
      },
    });

    return ok(
      {
        reference: appointment.reference,
        appointmentId: appointment.id,
        status: appointment.status,
        start: appointment.start.toISOString(),
        end: appointment.end.toISOString(),
        requiresPayment: needsDeposit,
        depositMinor: needsDeposit ? service.depositMinor : 0,
        doctor: appointment.doctor.name,
        service: appointment.service.name,
      },
      { status: 201 },
    );
  } catch (error) {
    return handleError(error);
  }
}
