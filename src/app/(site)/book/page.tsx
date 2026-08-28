import { prisma } from "@/lib/db";
import { BookingFlow } from "@/components/BookingFlow";
import { integrations } from "@/lib/config";

export const dynamic = "force-dynamic";
export const metadata = { title: "Book an appointment" };

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string; doctor?: string }>;
}) {
  const query = await searchParams;

  // Surgical procedures are deliberately not self-bookable: a theatre case is
  // scheduled by staff after a consultation, so the public flow offers
  // consultations, teleconsults and diagnostics only.
  const services = await prisma.service.findMany({
    where: { active: true, kind: { not: "OT" } },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    include: {
      doctors: {
        where: { active: true },
        select: { id: true, name: true, slug: true, specialty: true },
        orderBy: { name: "asc" },
      },
    },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-14">
      <h1 className="text-3xl font-bold tracking-tight text-ink-900">Book an appointment</h1>
      <p className="mt-2 text-ink-600">
        Choose a service and a time. You will get a reference code as soon as the request is in.
      </p>

      {services.length === 0 ? (
        <p className="mt-10 rounded-lg border border-dashed border-ink-300 p-8 text-center text-ink-500">
          Online booking is not open yet. Please call us to arrange an appointment.
        </p>
      ) : (
        <BookingFlow
          services={services.map((service) => ({
            id: service.id,
            slug: service.slug,
            name: service.name,
            kind: service.kind,
            durationMin: service.durationMin,
            priceMinor: service.priceMinor,
            depositMinor: service.requiresDeposit ? service.depositMinor : 0,
            requiresDeposit: service.requiresDeposit,
            doctors: service.doctors,
          }))}
          preselect={{ service: query.service, doctor: query.doctor }}
          paymentsEnabled={integrations.razorpay}
        />
      )}
    </div>
  );
}
