import Link from "next/link";
import { CalendarCheck, ShieldCheck, Stethoscope, Clock, ArrowRight } from "lucide-react";
import { prisma } from "@/lib/db";
import { clinic } from "@/lib/config";
import { formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

const HIGHLIGHTS = [
  {
    icon: CalendarCheck,
    title: "Book online in a minute",
    body: "Pick a doctor, choose a free slot and confirm. You get a reference code immediately.",
  },
  {
    icon: Stethoscope,
    title: "OPD and surgical care",
    body: "From first consultation through to theatre and follow-up, managed by one team.",
  },
  {
    icon: ShieldCheck,
    title: "Clear, upfront pricing",
    body: "Consultation fees are listed before you book. No surprises at the counter.",
  },
  {
    icon: Clock,
    title: "Short waiting times",
    body: "Slots are held for you, so appointments start close to the time you booked.",
  },
];

export default async function HomePage() {
  const [services, doctors, testimonials] = await Promise.all([
    prisma.service.findMany({ where: { active: true }, orderBy: { displayOrder: "asc" }, take: 6 }),
    prisma.doctor.findMany({ where: { active: true }, orderBy: { name: "asc" }, take: 3 }),
    prisma.testimonial.findMany({ where: { published: true }, orderBy: { createdAt: "desc" }, take: 3 }),
  ]);

  return (
    <>
      <section className="border-b border-ink-200 bg-gradient-to-b from-brand-50 to-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <span className="badge bg-white text-brand-700 ring-brand-200">
              Now accepting online bookings
            </span>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl">
              {clinic.tagline}
            </h1>
            <p className="mt-4 max-w-xl text-lg text-ink-600">
              {clinic.name} runs a full outpatient department and a modern operation theatre. Book a
              consultation online, pay securely, and have your whole care pathway tracked in one
              place.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/book" className="btn-primary px-5 py-3">
                Book an appointment <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/services" className="btn-secondary px-5 py-3">
                Browse services
              </Link>
            </div>
            <p className="mt-6 text-sm text-ink-500">
              Prefer to talk? Call{" "}
              <a href={`tel:${clinic.phone.replace(/\s/g, "")}`} className="font-semibold text-brand-700">
                {clinic.phone}
              </a>
            </p>
          </div>

          <div className="card p-6 lg:p-8">
            <p className="text-sm font-semibold text-ink-900">What happens after you book</p>
            <ol className="mt-5 space-y-5">
              {[
                ["You pick a slot", "Choose a doctor, a service and a time that suits you."],
                ["We confirm it", "Pay the deposit if one applies and the slot is locked in."],
                ["You get a reference", "Track or cancel your appointment with the code any time."],
                ["We see you", "Arrive ten minutes early with any previous reports."],
              ].map(([title, body], index) => (
                <li key={title} className="flex gap-4">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-ink-900">{title}</p>
                    <p className="mt-0.5 text-sm text-ink-600">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {HIGHLIGHTS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="card p-5">
              <Icon className="h-6 w-6 text-brand-600" />
              <p className="mt-3 text-sm font-semibold text-ink-900">{title}</p>
              <p className="mt-1.5 text-sm text-ink-600">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {services.length > 0 && (
        <section className="border-y border-ink-200 bg-ink-50">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-ink-900">Our services</h2>
                <p className="mt-1.5 text-ink-600">Consultations, procedures and surgical care.</p>
              </div>
              <Link href="/services" className="btn-secondary shrink-0">
                See all
              </Link>
            </div>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => (
                <Link key={service.id} href={`/services/${service.slug}`} className="card p-5 transition-shadow hover:shadow-md">
                  <span className="badge bg-brand-50 text-brand-700 ring-brand-200">
                    {service.kind}
                  </span>
                  <p className="mt-3 font-semibold text-ink-900">{service.name}</p>
                  <p className="mt-1.5 line-clamp-2 text-sm text-ink-600">{service.description}</p>
                  <p className="mt-4 text-sm font-semibold text-ink-900">
                    {service.priceMinor > 0 ? `From ${formatMoney(service.priceMinor)}` : "Price on request"}
                    <span className="ml-2 font-normal text-ink-500">· {service.durationMin} min</span>
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {doctors.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-ink-900">Meet the team</h2>
              <p className="mt-1.5 text-ink-600">Consultants you can book directly.</p>
            </div>
            <Link href="/doctors" className="btn-secondary shrink-0">
              All doctors
            </Link>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {doctors.map((doctor) => (
              <Link key={doctor.id} href={`/doctors/${doctor.slug}`} className="card p-5 transition-shadow hover:shadow-md">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-brand-100 text-base font-bold text-brand-700">
                  {doctor.name.split(" ").slice(-1)[0]?.[0] ?? "D"}
                </div>
                <p className="mt-3 font-semibold text-ink-900">{doctor.name}</p>
                <p className="text-sm text-brand-700">{doctor.specialty}</p>
                <p className="mt-1 text-sm text-ink-500">{doctor.qualifications}</p>
                <p className="mt-3 line-clamp-2 text-sm text-ink-600">{doctor.bio}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {testimonials.length > 0 && (
        <section className="border-t border-ink-200 bg-ink-50">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <h2 className="text-2xl font-bold tracking-tight text-ink-900">What patients say</h2>
            <div className="mt-8 grid gap-5 sm:grid-cols-3">
              {testimonials.map((testimonial) => (
                <figure key={testimonial.id} className="card p-5">
                  <p className="text-sm text-amber-500">{"★".repeat(testimonial.rating)}</p>
                  <blockquote className="mt-2 text-sm text-ink-700">“{testimonial.body}”</blockquote>
                  <figcaption className="mt-3 text-sm font-semibold text-ink-900">
                    {testimonial.author}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="bg-brand-700">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-14 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-bold text-white">Ready to see a specialist?</h2>
            <p className="mt-1.5 text-brand-100">Choose a time that works for you — it takes a minute.</p>
          </div>
          <Link href="/book" className="btn bg-white px-5 py-3 text-brand-700 hover:bg-brand-50">
            Book an appointment <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  );
}
