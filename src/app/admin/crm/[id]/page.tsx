import Link from "next/link";
import { notFound } from "next/navigation";
import { LeadStage } from "@prisma/client";
import { prisma } from "@/lib/db";
import { formatDate, formatDateTime, formatMoney, humanLabel } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { moveLeadStage, addLeadActivity, assignLead } from "../actions";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [lead, staff] = await Promise.all([
    prisma.lead.findUnique({
      where: { id },
      include: {
        owner: true,
        patient: true,
        activities: { orderBy: { createdAt: "desc" }, include: { user: { select: { name: true } } } },
      },
    }),
    prisma.user.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  if (!lead) notFound();

  return (
    <div className="space-y-6">
      <Link href="/admin/crm" className="text-sm font-medium text-brand-700 hover:underline">
        ← Pipeline
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">{lead.name}</h1>
          <p className="mt-1 text-sm text-ink-600">
            {lead.phone}
            {lead.email && ` · ${lead.email}`}
            {lead.city && ` · ${lead.city}`}
          </p>
        </div>
        <StatusBadge status={lead.stage} />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {Object.values(LeadStage)
          .filter((stage) => stage !== lead.stage)
          .map((stage) => (
            <form key={stage} action={moveLeadStage}>
              <input type="hidden" name="id" value={lead.id} />
              <input type="hidden" name="stage" value={stage} />
              <button className="btn-secondary px-3 py-1.5 text-xs">
                → {humanLabel(stage)}
              </button>
            </form>
          ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <form action={addLeadActivity} className="card space-y-3 p-5">
            <input type="hidden" name="leadId" value={lead.id} />
            <h2 className="text-sm font-bold text-ink-900">Log an interaction</h2>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="type">
                  Type
                </label>
                <select id="type" name="type" className="input" defaultValue="CALL">
                  {["CALL", "WHATSAPP", "EMAIL", "MEETING", "NOTE"].map((type) => (
                    <option key={type} value={type}>
                      {humanLabel(type)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="nextFollowUp">
                  Next follow-up
                </label>
                <input id="nextFollowUp" name="nextFollowUp" type="date" className="input" />
              </div>
            </div>

            <div>
              <label className="label" htmlFor="body">
                What happened?
              </label>
              <textarea id="body" name="body" rows={3} required className="input" />
            </div>

            <button className="btn-primary">Save</button>
          </form>

          <section className="card overflow-hidden">
            <div className="border-b border-ink-200 px-5 py-3.5">
              <h2 className="text-sm font-bold text-ink-900">Timeline</h2>
            </div>
            {lead.activities.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-ink-500">Nothing logged yet.</p>
            ) : (
              <ul className="divide-y divide-ink-100">
                {lead.activities.map((activity) => (
                  <li key={activity.id} className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="badge bg-ink-100 text-ink-700 ring-ink-200">
                        {humanLabel(activity.type)}
                      </span>
                      <span className="text-xs text-ink-500">
                        {formatDateTime(activity.createdAt)}
                        {activity.user && ` · ${activity.user.name}`}
                      </span>
                    </div>
                    <p className="mt-1.5 whitespace-pre-wrap text-sm text-ink-800">{activity.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="text-sm font-bold text-ink-900">Details</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <Row term="Source" value={humanLabel(lead.source)} />
              <Row term="Interest" value={lead.interest ?? "—"} />
              <Row term="Expected value" value={formatMoney(lead.valueMinor)} />
              <Row term="Created" value={formatDate(lead.createdAt)} />
              <Row
                term="Next follow-up"
                value={lead.nextFollowUp ? formatDate(lead.nextFollowUp) : "Not set"}
              />
            </dl>

            {lead.message && (
              <>
                <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-ink-500">
                  Original enquiry
                </p>
                <p className="mt-1.5 whitespace-pre-wrap text-sm text-ink-700">{lead.message}</p>
              </>
            )}

            {lead.patient && (
              <Link
                href={`/admin/patients/${lead.patient.id}`}
                className="btn-secondary mt-5 w-full text-xs"
              >
                Open patient record
              </Link>
            )}
          </section>

          <form action={assignLead} className="card space-y-3 p-5">
            <input type="hidden" name="id" value={lead.id} />
            <h2 className="text-sm font-bold text-ink-900">Owner</h2>
            <select name="ownerId" className="input" defaultValue={lead.ownerId ?? ""}>
              <option value="">Unassigned</option>
              {staff.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
            <button className="btn-secondary w-full">Assign</button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Row({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-500">{term}</dt>
      <dd className="text-right font-medium text-ink-900">{value}</dd>
    </div>
  );
}
