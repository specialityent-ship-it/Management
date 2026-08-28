import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, handleError } from "@/lib/api";
import { leadSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    const input = leadSchema.parse(await request.json());
    const phone = input.phone.replace(/[\s-]/g, "");

    const lead = await prisma.lead.create({
      data: {
        name: input.name,
        phone,
        email: input.email || null,
        city: input.city || null,
        interest: input.interest || null,
        message: input.message || null,
        source: input.source,
        patientId: (await prisma.patient.findFirst({ where: { phone }, select: { id: true } }))?.id,
      },
    });

    await prisma.leadActivity.create({
      data: { leadId: lead.id, type: "SYSTEM", body: `Enquiry received via ${input.source}.` },
    });

    return ok({ id: lead.id }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
