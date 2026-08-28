import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Clock, IndianRupee } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = await prisma.service.findUnique({
    where: { slug },
    include: { doctors: { where: { active: true } } },
  });

  if (!service || !service.active) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-14">
      <Link href="/services" className="text-sm font-medium text-brand-700 hover:underline">
        ← All services
      </Link>

      <span className="badge mt-6 block w-fit bg-brand-50 text-brand-700 ring-brand-200">
        {service.kind}
      </span>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink-900">{service.name}</h1>

      <div className="mt-4 flex flex-wrap gap-6 text-sm text-ink-600">
        <span className="flex items-center gap-1.5">
          <Clock className="h-4 w-4" /> {service.durationMin} minutes
        </span>
        <span className="flex items-center gap-1.5">
          <IndianRupee className="h-4 w-4" />
          {service.priceMinor > 0 ? formatMoney(service.priceMinor) : "Price on request"}
        </span>
      </div>

      <p className="mt-6 whitespace-pre-wrap text-ink-700">{service.description}</p>

      {service.requiresDeposit && service.depositMinor > 0 && (
        <p className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          A deposit of {formatMoney(service.depositMinor)} is collected online to confirm this
          booking. It is adjusted against your final bill.
        </p>
      )}

      {service.doctors.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-bold text-ink-900">Who you will see</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {service.doctors.map((doctor) => (
              <Link key={doctor.id} href={`/doctors/${doctor.slug}`} className="card p-4 hover:shadow-md">
                <p className="font-semibold text-ink-900">{doctor.name}</p>
                <p className="text-sm text-brand-700">{doctor.specialty}</p>
                <p className="mt-1 text-sm text-ink-500">{doctor.qualifications}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="mt-10">
        {service.kind === "OT" ? (
          <>
            <p className="mb-4 text-sm text-ink-600">
              Surgery is scheduled after a consultation, once your surgeon has assessed you and
              confirmed the plan and the estimate.
            </p>
            <Link href="/book" className="btn-primary px-5 py-3">
              Book a consultation <ArrowRight className="h-4 w-4" />
            </Link>
          </>
        ) : (
          <Link href={`/book?service=${service.slug}`} className="btn-primary px-5 py-3">
            Book this service <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </div>
  );
}
