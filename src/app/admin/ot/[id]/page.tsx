import Link from "next/link";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatDateTime, humanLabel } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { toggleChecklistItem, updateOtStatus, updateOtFlags } from "../actions";

export const dynamic = "force-dynamic";

const PHASES = [
  ["PRE_OP", "Before the day"],
  ["SIGN_IN", "Sign in — before anaesthesia"],
  ["TIME_OUT", "Time out — before incision"],
  ["SIGN_OUT", "Sign out — before leaving theatre"],
] as const;

const NEXT_STATUS: Record<string, { status: string; label: string }[]> = {
  PLANNED: [
    { status: "PRE_OP", label: "Start pre-op" },
    { status: "CANCELLED", label: "Cancel" },
  ],
  PRE_OP: [
    { status: "SCHEDULED", label: "Mark ready" },
    { status: "POSTPONED", label: "Postpone" },
  ],
  SCHEDULED: [
    { status: "IN_THEATRE", label: "Patient in theatre" },
    { status: "POSTPONED", label: "Postpone" },
  ],
  IN_THEATRE: [{ status: "RECOVERY", label: "Move to recovery" }],
  RECOVERY: [{ status: "COMPLETED", label: "Complete case" }],
};

export default async function OtCasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const otCase = await prisma.otCase.findUnique({
    where: { id },
    include: {
      patient: true,
      surgeon: true,
      service: true,
      theatre: true,
      checklist: { orderBy: { id: "asc" } },
      payments: true,
    },
  });

  if (!otCase) notFound();

  return (
    <div className="space-y-6">
      <Link href="/admin/ot" className="text-sm font-medium text-brand-700 hover:underline">
        ← All theatre cases
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">
            {otCase.service.name}
          </h1>
          <p className="mt-1 text-sm text-ink-600">
            <Link href={`/admin/patients/${otCase.patientId}`} className="font-medium hover:text-brand-700">
              {otCase.patient.name}
            </Link>{" "}
            · {otCase.patient.mrn} · {otCase.reference}
          </p>
        </div>
        <StatusBadge status={otCase.status} />
      </div>

      <div className="flex flex-wrap gap-2">
        {(NEXT_STATUS[otCase.status] ?? []).map((action) => (
          <form key={action.status} action={updateOtStatus}>
            <input type="hidden" name="id" value={otCase.id} />
            <input type="hidden" name="status" value={action.status} />
            <button className="btn-secondary">{action.label}</button>
          </form>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <section className="card overflow-hidden">
          <div className="border-b border-ink-200 px-5 py-3.5">
            <h2 className="text-sm font-bold text-ink-900">Surgical safety checklist</h2>
            <p className="mt-0.5 text-xs text-ink-500">
              {otCase.checklist.filter((i) => i.done).length} of {otCase.checklist.length} complete
            </p>
          </div>

          {PHASES.map(([phase, label]) => {
            const items = otCase.checklist.filter((i) => i.phase === phase);
            if (items.length === 0) return null;
            return (
              <div key={phase} className="border-b border-ink-100 last:border-0">
                <p className="bg-ink-50 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
                  {label}
                </p>
                <ul className="divide-y divide-ink-100">
                  {items.map((item) => (
                    <li key={item.id} className="flex items-center gap-3 px-5 py-2.5">
                      <form action={toggleChecklistItem}>
                        <input type="hidden" name="itemId" value={item.id} />
                        <input type="hidden" name="caseId" value={otCase.id} />
                        <button
                          className={`grid h-5 w-5 place-items-center rounded border transition-colors ${
                            item.done
                              ? "border-emerald-600 bg-emerald-600 text-white"
                              : "border-ink-300 bg-white hover:border-brand-500"
                          }`}
                          aria-label={item.done ? "Mark incomplete" : "Mark complete"}
                        >
                          {item.done && <Check className="h-3.5 w-3.5" />}
                        </button>
                      </form>
                      <span className={`flex-1 text-sm ${item.done ? "text-ink-400 line-through" : "text-ink-800"}`}>
                        {item.label}
                      </span>
                      {item.done && item.doneBy && (
                        <span className="text-xs text-ink-400">{item.doneBy}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </section>

        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="text-sm font-bold text-ink-900">Case details</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <Detail term="Scheduled" value={formatDateTime(otCase.scheduledStart)} />
              <Detail term="Ends" value={formatDateTime(otCase.scheduledEnd)} />
              <Detail term="Surgeon" value={otCase.surgeon.name} />
              <Detail term="Theatre" value={otCase.theatre?.name ?? "Unassigned"} />
              <Detail term="Anaesthesia" value={humanLabel(otCase.anaesthesia)} />
              <Detail term="Patient phone" value={otCase.patient.phone} />
            </dl>
          </section>

          <form action={updateOtFlags} className="card space-y-4 p-5">
            <input type="hidden" name="id" value={otCase.id} />
            <h2 className="text-sm font-bold text-ink-900">Pre-op record</h2>

            <label className="flex items-center gap-2.5 text-sm text-ink-800">
              <input
                type="checkbox"
                name="consentSigned"
                defaultChecked={otCase.consentSigned}
                className="h-4 w-4 rounded border-ink-300 text-brand-600"
              />
              Consent signed
            </label>
            <label className="flex items-center gap-2.5 text-sm text-ink-800">
              <input
                type="checkbox"
                name="fitnessCleared"
                defaultChecked={otCase.fitnessCleared}
                className="h-4 w-4 rounded border-ink-300 text-brand-600"
              />
              Anaesthetic fitness cleared
            </label>

            <div>
              <label className="label" htmlFor="anaesthetist">
                Anaesthetist
              </label>
              <input
                id="anaesthetist"
                name="anaesthetist"
                defaultValue={otCase.anaesthetist ?? ""}
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor="assistants">
                Assistants
              </label>
              <input
                id="assistants"
                name="assistants"
                defaultValue={otCase.assistants ?? ""}
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor="procedureNote">
                Procedure notes
              </label>
              <textarea
                id="procedureNote"
                name="procedureNote"
                rows={5}
                defaultValue={otCase.procedureNote ?? ""}
                className="input"
              />
            </div>

            <button className="btn-primary w-full">Save</button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Detail({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-500">{term}</dt>
      <dd className="text-right font-medium text-ink-900">{value}</dd>
    </div>
  );
}
