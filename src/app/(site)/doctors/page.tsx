import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Doctors" };

export default async function DoctorsPage() {
  const doctors = await prisma.doctor.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    include: { services: { where: { active: true }, select: { name: true, slug: true } } },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-14">
      <h1 className="text-3xl font-bold tracking-tight text-ink-900">Our doctors</h1>
      <p className="mt-2 max-w-2xl text-ink-600">
        Book directly with the consultant of your choice.
      </p>

      {doctors.length === 0 && (
        <p className="mt-10 rounded-lg border border-dashed border-ink-300 p-8 text-center text-ink-500">
          Doctor profiles will appear here shortly.
        </p>
      )}

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {doctors.map((doctor) => (
          <Link key={doctor.id} href={`/doctors/${doctor.slug}`} className="card flex flex-col p-5 hover:shadow-md">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-brand-100 text-lg font-bold text-brand-700">
              {doctor.name.split(" ").slice(-1)[0]?.[0] ?? "D"}
            </div>
            <p className="mt-4 font-semibold text-ink-900">{doctor.name}</p>
            <p className="text-sm text-brand-700">{doctor.specialty}</p>
            <p className="mt-1 text-sm text-ink-500">{doctor.qualifications}</p>
            <p className="mt-3 flex-1 line-clamp-3 text-sm text-ink-600">{doctor.bio}</p>
            <p className="mt-4 border-t border-ink-100 pt-3 text-xs text-ink-500">
              {doctor.yearsExp} years&rsquo; experience
              {doctor.services.length > 0 && ` · ${doctor.services.length} services`}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
