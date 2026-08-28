import { CheckCircle2, XCircle } from "lucide-react";
import { prisma } from "@/lib/db";
import { clinic, integrations } from "@/lib/config";
import { humanLabel } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings" };

const CHECKS = [
  {
    key: "razorpay" as const,
    name: "Razorpay payments",
    hint: "RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET",
  },
  { key: "anthropic" as const, name: "AI chatbot", hint: "ANTHROPIC_API_KEY" },
  {
    key: "instagram" as const,
    name: "Instagram publishing",
    hint: "INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_BUSINESS_ACCOUNT_ID",
  },
  {
    key: "youtube" as const,
    name: "YouTube publishing",
    hint: "YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN",
  },
];

export default async function SettingsPage() {
  const [staff, doctors, services, theatres] = await Promise.all([
    prisma.user.findMany({ orderBy: { name: "asc" } }),
    prisma.doctor.count({ where: { active: true } }),
    prisma.service.count({ where: { active: true } }),
    prisma.theatre.count({ where: { active: true } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">Settings</h1>
        <p className="mt-1 text-sm text-ink-600">Clinic details and integration status.</p>
      </div>

      <section className="card p-5">
        <h2 className="text-sm font-bold text-ink-900">Clinic</h2>
        <dl className="mt-4 space-y-3 text-sm">
          {[
            ["Name", clinic.name],
            ["Tagline", clinic.tagline],
            ["Phone", clinic.phone],
            ["Email", clinic.email],
            ["Address", clinic.address],
            ["Timezone", clinic.timezone],
          ].map(([term, value]) => (
            <div key={term} className="flex justify-between gap-4">
              <dt className="text-ink-500">{term}</dt>
              <dd className="text-right font-medium text-ink-900">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs text-ink-500">
          These come from environment variables (CLINIC_NAME, CLINIC_PHONE and so on) so they stay
          consistent across the website, receipts and the chatbot.
        </p>
      </section>

      <section className="card p-5">
        <h2 className="text-sm font-bold text-ink-900">Integrations</h2>
        <ul className="mt-4 space-y-3">
          {CHECKS.map((check) => (
            <li key={check.key} className="flex items-start gap-3">
              {integrations[check.key] ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-ink-300" />
              )}
              <div>
                <p className="text-sm font-medium text-ink-900">{check.name}</p>
                <p className="text-xs text-ink-500">
                  {integrations[check.key] ? "Configured" : `Needs ${check.hint}`}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Active doctors", doctors],
          ["Active services", services],
          ["Theatres", theatres],
        ].map(([label, value]) => (
          <div key={String(label)} className="card p-5">
            <p className="text-sm text-ink-600">{label}</p>
            <p className="mt-1 text-2xl font-bold text-ink-900">{value}</p>
          </div>
        ))}
      </div>

      <section className="card overflow-hidden">
        <div className="border-b border-ink-200 px-5 py-3.5">
          <h2 className="text-sm font-bold text-ink-900">Staff accounts</h2>
        </div>
        <ul className="divide-y divide-ink-100">
          {staff.map((member) => (
            <li key={member.id} className="flex items-center justify-between gap-4 px-5 py-3">
              <div>
                <p className="text-sm font-medium text-ink-900">{member.name}</p>
                <p className="text-xs text-ink-500">{member.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="badge bg-ink-100 text-ink-700 ring-ink-200">
                  {humanLabel(member.role)}
                </span>
                {!member.active && (
                  <span className="badge bg-red-50 text-red-700 ring-red-200">Disabled</span>
                )}
              </div>
            </li>
          ))}
        </ul>
        <p className="border-t border-ink-200 px-5 py-3 text-xs text-ink-500">
          Add staff accounts with <code>npm run db:seed</code> or directly in Prisma Studio.
        </p>
      </section>
    </div>
  );
}
