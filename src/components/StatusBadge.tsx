import { humanLabel } from "@/lib/format";

const TONES: Record<string, string> = {
  // appointments
  REQUESTED: "bg-amber-50 text-amber-800 ring-amber-200",
  PENDING_PAYMENT: "bg-orange-50 text-orange-800 ring-orange-200",
  CONFIRMED: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  CHECKED_IN: "bg-blue-50 text-blue-800 ring-blue-200",
  COMPLETED: "bg-ink-100 text-ink-700 ring-ink-200",
  CANCELLED: "bg-red-50 text-red-700 ring-red-200",
  NO_SHOW: "bg-red-50 text-red-700 ring-red-200",
  // OT
  PLANNED: "bg-ink-100 text-ink-700 ring-ink-200",
  PRE_OP: "bg-amber-50 text-amber-800 ring-amber-200",
  SCHEDULED: "bg-blue-50 text-blue-800 ring-blue-200",
  IN_THEATRE: "bg-violet-50 text-violet-800 ring-violet-200",
  RECOVERY: "bg-cyan-50 text-cyan-800 ring-cyan-200",
  POSTPONED: "bg-orange-50 text-orange-800 ring-orange-200",
  // payments
  CREATED: "bg-ink-100 text-ink-700 ring-ink-200",
  ATTEMPTED: "bg-amber-50 text-amber-800 ring-amber-200",
  PAID: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  FAILED: "bg-red-50 text-red-700 ring-red-200",
  REFUNDED: "bg-violet-50 text-violet-800 ring-violet-200",
  // leads
  NEW: "bg-blue-50 text-blue-800 ring-blue-200",
  CONTACTED: "bg-cyan-50 text-cyan-800 ring-cyan-200",
  QUALIFIED: "bg-indigo-50 text-indigo-800 ring-indigo-200",
  CONSULT_BOOKED: "bg-brand-50 text-brand-800 ring-brand-200",
  SURGERY_ADVISED: "bg-violet-50 text-violet-800 ring-violet-200",
  WON: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  LOST: "bg-ink-100 text-ink-600 ring-ink-200",
  // social
  DRAFT: "bg-ink-100 text-ink-700 ring-ink-200",
  PUBLISHING: "bg-amber-50 text-amber-800 ring-amber-200",
  PUBLISHED: "bg-emerald-50 text-emerald-800 ring-emerald-200",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge ${TONES[status] ?? "bg-ink-100 text-ink-700 ring-ink-200"}`}>
      {humanLabel(status)}
    </span>
  );
}
