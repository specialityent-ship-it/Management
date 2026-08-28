import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, handleError, ApiError } from "@/lib/api";
import { availableSlots } from "@/lib/scheduling";

const querySchema = z.object({
  doctorId: z.string().min(1),
  serviceId: z.string().min(1),
  date: z.iso.date(),
});

export async function GET(request: NextRequest) {
  try {
    const params = querySchema.parse({
      doctorId: request.nextUrl.searchParams.get("doctorId"),
      serviceId: request.nextUrl.searchParams.get("serviceId"),
      date: request.nextUrl.searchParams.get("date"),
    });

    const service = await prisma.service.findUnique({ where: { id: params.serviceId } });
    if (!service || !service.active) throw new ApiError("Service not found", 404);

    const slots = await availableSlots({
      doctorId: params.doctorId,
      date: new Date(`${params.date}T00:00:00.000Z`),
      durationMin: service.durationMin,
    });

    return ok({
      date: params.date,
      durationMin: service.durationMin,
      slots: slots.map((slot) => ({ start: slot.start.toISOString(), end: slot.end.toISOString() })),
    });
  } catch (error) {
    return handleError(error);
  }
}
