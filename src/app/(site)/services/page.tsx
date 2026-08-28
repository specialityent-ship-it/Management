import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Services" };

export default async function ServicesPage() {
  const services = await prisma.service.findMany({
    where: { active: true },
    orderBy: [{ kind: "asc" }, { displayOrder: "asc" }],
    include: { doctors: { where: { active: true }, select: { name: true } } },
  });

  const groups = services.reduce<Record<string, typeof services>>((acc, service) => {
    (acc[service.kind] ||= []).push(service);
    return acc;
  }, {});

  const LABELS: Record<string, string> = {
    OPD: "Outpatient consultations",
    OT: "Surgical procedures",
    DIAGNOSTIC: "Diagnostics",
    TELECONSULT: "Teleconsultation",
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-14">
      <h1 className="text-3xl font-bold tracking-tight text-ink-900">Services</h1>
      <p className="mt-2 max-w-2xl text-ink-600">
        Every service below can be booked online. Fees shown are the standard consultation or
        starting procedure charge; your final estimate is confirmed at consultation.
      </p>

      {services.length === 0 && (
        <p className="mt-10 rounded-lg border border-dashed border-ink-300 p-8 text-center text-ink-500">
          Services will be listed here shortly.
        </p>
      )}

      {Object.entries(groups).map(([kind, items]) => (
        <section key={kind} className="mt-12">
          <h2 className="text-lg font-bold text-ink-900">{LABELS[kind] ?? kind}</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((service) => (
              <Link
                key={service.id}
                href={`/services/${service.slug}`}
                className="card flex flex-col p-5 transition-shadow hover:shadow-md"
              >
                <p className="font-semibold text-ink-900">{service.name}</p>
                <p className="mt-2 flex-1 text-sm text-ink-600">{service.description}</p>
                <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-3">
                  <span className="text-sm font-semibold text-ink-900">
                    {service.priceMinor > 0 ? formatMoney(service.priceMinor) : "On request"}
                  </span>
                  <span className="text-sm text-ink-500">{service.durationMin} min</span>
                </div>
                {service.doctors.length > 0 && (
                  <p className="mt-2 text-xs text-ink-500">
                    {service.doctors.map((d) => d.name).join(", ")}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
