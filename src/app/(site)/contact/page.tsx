import { clinic } from "@/lib/config";
import { prisma } from "@/lib/db";
import { ContactForm } from "@/components/ContactForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Contact" };

export default async function ContactPage() {
  const services = await prisma.service.findMany({
    where: { active: true },
    select: { name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-14">
      <h1 className="text-3xl font-bold tracking-tight text-ink-900">Contact us</h1>
      <p className="mt-2 text-ink-600">
        Send us a message and a member of the team will call you back. For anything urgent, please
        phone us.
      </p>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_20rem]">
        <ContactForm services={services.map((s) => s.name)} />

        <aside className="space-y-4">
          <div className="card p-5">
            <p className="text-sm font-semibold text-ink-900">Reach us directly</p>
            <p className="mt-3 text-sm text-ink-600">{clinic.address}</p>
            <p className="mt-3 text-sm">
              <a href={`tel:${clinic.phone.replace(/\s/g, "")}`} className="font-medium text-brand-700">
                {clinic.phone}
              </a>
            </p>
            <p className="text-sm">
              <a href={`mailto:${clinic.email}`} className="font-medium text-brand-700">
                {clinic.email}
              </a>
            </p>
          </div>

          <div className="rounded-xl border border-red-200 bg-red-50 p-5">
            <p className="text-sm font-semibold text-red-900">In an emergency</p>
            <p className="mt-2 text-sm text-red-800">
              Do not use this form. Call your local emergency number or go to the nearest emergency
              department.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
