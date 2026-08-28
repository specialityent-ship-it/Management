import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { DAY_NAMES, minutesToLabel } from "@/lib/slug";
import { DoctorFields } from "@/components/DoctorFields";
import { AvailabilityRow, TimeOffRow, AddAvailabilityForm, AddTimeOffForm } from "@/components/DoctorSchedule";
import { updateDoctor, setDoctorActive } from "../actions";

export const dynamic = "force-dynamic";

export default async function EditDoctorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const doctor = await prisma.doctor.findUnique({
    where: { id },
    include: {
      availability: { orderBy: [{ dayOfWeek: "asc" }, { startMinute: "asc" }] },
      services: { orderBy: { name: "asc" }, select: { id: true, name: true, slug: true, active: true } },
    },
  });
  if (!doctor) notFound();

  const timeOff = await prisma.timeOff.findMany({
    where: { doctorId: id, end: { gte: new Date() } },
    orderBy: { start: "asc" },
  });

  const byDay = DAY_NAMES.map((name, day) => ({
    name,
    day,
    windows: doctor.availability.filter((w) => w.dayOfWeek === day),
  }));

  return (
    <div className="space-y-6">
      <Link href="/admin/doctors" className="text-sm font-medium text-brand-700 hover:underline">
        ← All doctors
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">{doctor.name}</h1>
          <p className="mt-1 text-sm text-ink-600">
            {doctor.specialty} · <Link href={`/doctors/${doctor.slug}`} className="hover:text-brand-700">
              /doctors/{doctor.slug}
            </Link>
          </p>
        </div>
        <form action={setDoctorActive}>
          <input type="hidden" name="id" value={doctor.id} />
          <input type="hidden" name="active" value={doctor.active ? "false" : "true"} />
          <button className={doctor.active ? "btn-secondary" : "btn-primary"}>
            {doctor.active ? "Hide from website" : "Show on website"}
          </button>
        </form>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
        <form action={updateDoctor} className="card space-y-4 p-5">
          <input type="hidden" name="id" value={doctor.id} />
          <h2 className="text-sm font-bold text-ink-900">Profile</h2>
          <DoctorFields doctor={doctor} />
          <button className="btn-primary">Save changes</button>
        </form>

        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="text-sm font-bold text-ink-900">Consulting hours</h2>
            <p className="mt-1 text-xs text-ink-500">
              Patients can only book inside these windows. Theatre cases and leave are subtracted
              automatically.
            </p>

            {doctor.availability.length === 0 && (
              <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                No hours set, so this doctor cannot be booked online yet.
              </p>
            )}

            <div className="mt-4 space-y-3">
              {byDay
                .filter((d) => d.windows.length > 0)
                .map((day) => (
                  <div key={day.day}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                      {day.name}
                    </p>
                    <ul className="mt-1 space-y-1">
                      {day.windows.map((window) => (
                        <AvailabilityRow
                          key={window.id}
                          id={window.id}
                          doctorId={doctor.id}
                          label={`${minutesToLabel(window.startMinute)} – ${minutesToLabel(window.endMinute)}`}
                          detail={`${window.slotMin} min slots`}
                        />
                      ))}
                    </ul>
                  </div>
                ))}
            </div>

            <AddAvailabilityForm doctorId={doctor.id} />
          </section>

          <section className="card p-5">
            <h2 className="text-sm font-bold text-ink-900">Leave & blocked time</h2>
            <p className="mt-1 text-xs text-ink-500">
              Removes slots without changing the weekly pattern.
            </p>

            <ul className="mt-4 space-y-1">
              {timeOff.length === 0 && <li className="text-xs text-ink-400">Nothing upcoming.</li>}
              {timeOff.map((block) => (
                <TimeOffRow
                  key={block.id}
                  id={block.id}
                  doctorId={doctor.id}
                  label={`${formatDateTime(block.start)} → ${formatDateTime(block.end)}`}
                  detail={block.reason ?? undefined}
                />
              ))}
            </ul>

            <AddTimeOffForm doctorId={doctor.id} />
          </section>

          <section className="card p-5">
            <h2 className="text-sm font-bold text-ink-900">Services offered</h2>
            {doctor.services.length === 0 ? (
              <p className="mt-3 text-xs text-ink-500">
                None yet. Assign this doctor to services from{" "}
                <Link href="/admin/services" className="font-medium text-brand-700 hover:underline">
                  Services
                </Link>
                .
              </p>
            ) : (
              <ul className="mt-3 space-y-1.5">
                {doctor.services.map((service) => (
                  <li key={service.id} className="flex items-center justify-between text-sm">
                    <span className={service.active ? "text-ink-800" : "text-ink-400"}>
                      {service.name}
                    </span>
                    {!service.active && (
                      <span className="badge bg-ink-100 text-ink-600 ring-ink-200">Hidden</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
