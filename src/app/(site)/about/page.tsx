import Link from "next/link";
import { clinic } from "@/lib/config";

export const metadata = { title: "About" };

const VALUES = [
  ["One record, one team", "Your consultation, investigations, surgery and follow-up sit in a single record, so nothing is repeated and nothing is missed."],
  ["Time you can plan around", "Slots are genuinely reserved. We publish theatre days so consulting hours stay predictable."],
  ["Costs stated upfront", "Consultation fees are on the website. Surgical estimates are given in writing before you decide."],
  ["Careful follow-up", "Post-operative reviews are booked before you leave, and our team calls to check on you."],
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14">
      <h1 className="text-3xl font-bold tracking-tight text-ink-900">About {clinic.name}</h1>
      <p className="mt-4 text-lg text-ink-600">{clinic.tagline}</p>

      <p className="mt-6 text-ink-700">
        We run an outpatient department and a fully equipped operation theatre under one roof. That
        means the consultant who assesses you is the one who plans your procedure, and the same team
        follows you through recovery.
      </p>

      <h2 className="mt-12 text-xl font-bold text-ink-900">How we work</h2>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        {VALUES.map(([title, body]) => (
          <div key={title} className="card p-5">
            <p className="font-semibold text-ink-900">{title}</p>
            <p className="mt-2 text-sm text-ink-600">{body}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-12 text-xl font-bold text-ink-900">Visit us</h2>
      <div className="card mt-4 p-5 text-sm text-ink-700">
        <p className="font-semibold text-ink-900">{clinic.name}</p>
        <p className="mt-1">{clinic.address}</p>
        <p className="mt-3">
          Phone:{" "}
          <a href={`tel:${clinic.phone.replace(/\s/g, "")}`} className="font-medium text-brand-700">
            {clinic.phone}
          </a>
        </p>
        <p>
          Email:{" "}
          <a href={`mailto:${clinic.email}`} className="font-medium text-brand-700">
            {clinic.email}
          </a>
        </p>
      </div>

      <div className="mt-10 flex gap-3">
        <Link href="/book" className="btn-primary px-5 py-3">
          Book an appointment
        </Link>
        <Link href="/contact" className="btn-secondary px-5 py-3">
          Send a message
        </Link>
      </div>
    </div>
  );
}
