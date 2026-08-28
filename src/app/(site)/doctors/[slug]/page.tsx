import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function minutesToLabel(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const suffix = h < 12 ? "am" : "pm";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export default async function DoctorDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doctor = await prisma.doctor.findUnique({
    where: { slug },
    include: {
      services: { where: { active: true } },
      availability: { where: { active: true }, orderBy: [{ dayOfWeek: "asc" }, { startMinute: "asc" }] },
    },
  });

  if (!doctor || !doctor.active) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-14">
      <Link href="/doctors" className="text-sm font-medium text-brand-700 hover:underline">
        ← All doctors
      </Link>

      <div className="mt-6 flex flex-wrap items-start gap-5">
        <div className="grid h-20 w-20 place-items-center rounded-full bg-brand-100 text-2xl font-bold text-brand-700">
          {doctor.name.split(" ").slice(-1)[0]?.[0] ?? "D"}
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink-900">{doctor.name}</h1>
          <p className="mt-1 text-brand-700">{doctor.specialty}</p>
          <p className="text-sm text-ink-500">{doctor.qualifications}</p>
          <p className="mt-2 text-sm text-ink-500">
            {doctor.yearsExp} years&rsquo; experience
            {doctor.regNumber && ` · Reg. ${doctor.regNumber}`}
          </p>
        </div>
      </div>

      <p className="mt-8 whitespace-pre-wrap text-ink-700">{doctor.bio}</p>

      {doctor.availability.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-bold text-ink-900">Consulting hours</h2>
          <ul className="mt-4 divide-y divide-ink-100 rounded-xl border border-ink-200">
            {doctor.availability.map((window) => (
              <li key={window.id} className="flex justify-between px-4 py-2.5 text-sm">
                <span className="font-medium text-ink-800">{DAYS[window.dayOfWeek]}</span>
                <span className="text-ink-600">
                  {minutesToLabel(window.startMinute)} – {minutesToLabel(window.endMinute)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-ink-500">
            Live availability is shown on the booking page — theatre days and leave are already
            excluded.
          </p>
        </section>
      )}

      {doctor.services.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-bold text-ink-900">Services offered</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {doctor.services.map((service) => (
              <Link key={service.id} href={`/services/${service.slug}`} className="card p-4 hover:shadow-md">
                <p className="font-semibold text-ink-900">{service.name}</p>
                <p className="mt-1 text-sm text-ink-500">
                  {service.durationMin} min ·{" "}
                  {service.priceMinor > 0 ? formatMoney(service.priceMinor) : "On request"}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="mt-10">
        <Link href={`/book?doctor=${doctor.slug}`} className="btn-primary px-5 py-3">
          Book with {doctor.name} <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
