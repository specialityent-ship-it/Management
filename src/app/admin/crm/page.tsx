import Link from "next/link";
import { LeadStage } from "@prisma/client";
import { prisma } from "@/lib/db";
import { formatDate, formatMoney, humanLabel } from "@/lib/format";
import { NewLeadForm } from "@/components/NewLeadForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "CRM" };

const PIPELINE: LeadStage[] = [
  LeadStage.NEW,
  LeadStage.CONTACTED,
  LeadStage.QUALIFIED,
  LeadStage.CONSULT_BOOKED,
  LeadStage.SURGERY_ADVISED,
  LeadStage.WON,
];

const COLUMN_TINT: Record<string, string> = {
  NEW: "border-t-blue-400",
  CONTACTED: "border-t-cyan-400",
  QUALIFIED: "border-t-indigo-400",
  CONSULT_BOOKED: "border-t-brand-400",
  SURGERY_ADVISED: "border-t-violet-400",
  WON: "border-t-emerald-400",
};

export default async function CrmPage() {
  const [leads, lostCount, wonValue] = await Promise.all([
    prisma.lead.findMany({
      where: { stage: { in: PIPELINE } },
      orderBy: [{ nextFollowUp: "asc" }, { createdAt: "desc" }],
      take: 300,
      include: { owner: { select: { name: true } } },
    }),
    prisma.lead.count({ where: { stage: LeadStage.LOST } }),
    prisma.lead.aggregate({ where: { stage: LeadStage.WON }, _sum: { valueMinor: true } }),
  ]);

  const overdue = leads.filter((l) => l.nextFollowUp && l.nextFollowUp < new Date());

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">CRM</h1>
          <p className="mt-1 text-sm text-ink-600">
            {leads.length} open · {lostCount} lost · {formatMoney(wonValue._sum.valueMinor ?? 0)} won
          </p>
        </div>
        <NewLeadForm />
      </div>

      {overdue.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">
            {overdue.length} follow-up{overdue.length === 1 ? "" : "s"} overdue
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {overdue.slice(0, 8).map((lead) => (
              <li key={lead.id}>
                <Link
                  href={`/admin/crm/${lead.id}`}
                  className="badge bg-white text-amber-900 ring-amber-300 hover:bg-amber-100"
                >
                  {lead.name} · {formatDate(lead.nextFollowUp!)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-4 overflow-x-auto md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {PIPELINE.map((stage) => {
          const items = leads.filter((lead) => lead.stage === stage);
          return (
            <section
              key={stage}
              className={`card border-t-4 ${COLUMN_TINT[stage]} flex min-w-[15rem] flex-col p-3`}
            >
              <div className="flex items-center justify-between px-1 pb-2">
                <p className="text-sm font-semibold text-ink-900">{humanLabel(stage)}</p>
                <span className="text-xs font-medium text-ink-500">{items.length}</span>
              </div>

              <ul className="space-y-2">
                {items.length === 0 && (
                  <li className="rounded-lg border border-dashed border-ink-200 px-3 py-6 text-center text-xs text-ink-400">
                    Empty
                  </li>
                )}
                {items.map((lead) => (
                  <li key={lead.id}>
                    <Link
                      href={`/admin/crm/${lead.id}`}
                      className="block rounded-lg border border-ink-200 bg-white p-3 transition-shadow hover:shadow-md"
                    >
                      <p className="text-sm font-medium text-ink-900">{lead.name}</p>
                      <p className="mt-0.5 text-xs text-ink-500">{lead.phone}</p>
                      {lead.interest && (
                        <p className="mt-1.5 line-clamp-1 text-xs text-brand-700">{lead.interest}</p>
                      )}
                      <div className="mt-2 flex items-center justify-between text-[11px] text-ink-400">
                        <span>{humanLabel(lead.source)}</span>
                        {lead.nextFollowUp && (
                          <span
                            className={lead.nextFollowUp < new Date() ? "font-semibold text-amber-600" : ""}
                          >
                            {formatDate(lead.nextFollowUp)}
                          </span>
                        )}
                      </div>
                      {lead.owner && (
                        <p className="mt-1 text-[11px] text-ink-400">{lead.owner.name}</p>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
