import { prisma } from "@/lib/db";
import { formatMoney, humanLabel } from "@/lib/format";
import { ServiceCard, NewServiceForm } from "@/components/ServiceForms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Services" };

export default async function AdminServicesPage() {
  const [services, doctors] = await Promise.all([
    prisma.service.findMany({
      orderBy: [{ active: "desc" }, { displayOrder: "asc" }, { name: "asc" }],
      include: { doctors: { select: { id: true } } },
    }),
    prisma.doctor.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">Services</h1>
        <p className="mt-1 text-sm text-ink-600">
          What you offer, what it costs, and who provides it. Surgical services are scheduled by
          staff rather than booked online.
        </p>
      </div>

      {doctors.length === 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Add a doctor first — a service with nobody assigned cannot be booked.
        </div>
      )}

      <NewServiceForm doctors={doctors} />

      {services.length === 0 ? (
        <div className="card px-5 py-14 text-center">
          <p className="text-sm text-ink-600">No services yet.</p>
          <p className="mt-1 text-sm text-ink-500">
            Add your first one above — patients cannot book until at least one exists.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {services.map((service) => (
            <ServiceCard
              key={service.id}
              service={{
                id: service.id,
                name: service.name,
                slug: service.slug,
                kind: service.kind,
                description: service.description,
                durationMin: service.durationMin,
                priceMinor: service.priceMinor,
                depositMinor: service.depositMinor,
                requiresDeposit: service.requiresDeposit,
                displayOrder: service.displayOrder,
                active: service.active,
                doctorIds: service.doctors.map((d) => d.id),
              }}
              doctors={doctors}
              summary={`${humanLabel(service.kind)} · ${service.durationMin} min · ${
                service.priceMinor > 0 ? formatMoney(service.priceMinor) : "Price on request"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
