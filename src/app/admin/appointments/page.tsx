import Link from "next/link";
import { AppointmentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { formatDateTime, formatMoney, humanLabel } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { AppointmentRowActions } from "@/components/AppointmentRowActions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Appointments" };

const FILTERS = [
  { key: "upcoming", label: "Upcoming" },
  { key: "today", label: "Today" },
  { key: "REQUESTED", label: "Requested" },
  { key: "PENDING_PAYMENT", label: "Awaiting payment" },
  { key: "CONFIRMED", label: "Confirmed" },
  { key: "COMPLETED", label: "Completed" },
  { key: "CANCELLED", label: "Cancelled" },
  { key: "all", label: "All" },
];

function buildWhere(filter: string, search: string): Prisma.AppointmentWhereInput {
  const where: Prisma.AppointmentWhereInput = {};

  if (filter === "upcoming") {
    where.start = { gte: new Date() };
    where.status = { in: ["REQUESTED", "PENDING_PAYMENT", "CONFIRMED", "CHECKED_IN"] };
  } else if (filter === "today") {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    where.start = { gte: start, lt: new Date(start.getTime() + 86_400_000) };
  } else if (filter !== "all" && Object.values(AppointmentStatus).includes(filter as AppointmentStatus)) {
    where.status = filter as AppointmentStatus;
  }

  if (search) {
    where.OR = [
      { reference: { contains: search, mode: "insensitive" } },
      { patient: { name: { contains: search, mode: "insensitive" } } },
      { patient: { phone: { contains: search } } },
    ];
  }

  return where;
}

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const query = await searchParams;
  const filter = query.status ?? "upcoming";
  const search = (query.q ?? "").trim();

  const appointments = await prisma.appointment.findMany({
    where: buildWhere(filter, search),
    orderBy: { start: filter === "upcoming" || filter === "today" ? "asc" : "desc" },
    take: 100,
    include: {
      patient: true,
      doctor: { select: { name: true } },
      service: { select: { name: true, priceMinor: true } },
      payments: { select: { status: true, amountMinor: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">Appointments</h1>
          <p className="mt-1 text-sm text-ink-600">
            Confirm requests, check patients in and record outcomes.
          </p>
        </div>
        <form className="flex gap-2">
          <input type="hidden" name="status" value={filter} />
          <input
            name="q"
            defaultValue={search}
            placeholder="Reference, name or phone"
            className="input w-64"
          />
          <button className="btn-secondary">Search</button>
        </form>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((option) => (
          <Link
            key={option.key}
            href={`/admin/appointments?status=${option.key}${search ? `&q=${encodeURIComponent(search)}` : ""}`}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === option.key
                ? "bg-brand-600 text-white"
                : "bg-white text-ink-600 ring-1 ring-inset ring-ink-200 hover:bg-ink-100"
            }`}
          >
            {option.label}
          </Link>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[56rem]">
            <thead className="border-b border-ink-200 bg-ink-50">
              <tr>
                <th className="th">When</th>
                <th className="th">Patient</th>
                <th className="th">Service / Doctor</th>
                <th className="th">Payment</th>
                <th className="th">Status</th>
                <th className="th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {appointments.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-14 text-center text-sm text-ink-500">
                    No appointments match this view.
                  </td>
                </tr>
              )}
              {appointments.map((appointment) => {
                const paid = appointment.payments
                  .filter((p) => p.status === "PAID")
                  .reduce((sum, p) => sum + p.amountMinor, 0);

                return (
                  <tr key={appointment.id} className="align-top">
                    <td className="td whitespace-nowrap">
                      <p className="font-medium">{formatDateTime(appointment.start)}</p>
                      <p className="font-mono text-xs text-ink-500">{appointment.reference}</p>
                    </td>
                    <td className="td">
                      <Link
                        href={`/admin/patients/${appointment.patientId}`}
                        className="font-medium hover:text-brand-700"
                      >
                        {appointment.patient.name}
                      </Link>
                      <p className="text-xs text-ink-500">{appointment.patient.phone}</p>
                      {appointment.reason && (
                        <p className="mt-1 max-w-xs text-xs text-ink-500">{appointment.reason}</p>
                      )}
                    </td>
                    <td className="td">
                      <p>{appointment.service.name}</p>
                      <p className="text-xs text-ink-500">{appointment.doctor.name}</p>
                    </td>
                    <td className="td whitespace-nowrap">
                      {paid > 0 ? (
                        <span className="text-emerald-700">{formatMoney(paid)} paid</span>
                      ) : (
                        <span className="text-ink-400">—</span>
                      )}
                    </td>
                    <td className="td">
                      <StatusBadge status={appointment.status} />
                      <p className="mt-1 text-xs text-ink-400">{humanLabel(appointment.source)}</p>
                    </td>
                    <td className="td text-right">
                      <AppointmentRowActions
                        id={appointment.id}
                        status={appointment.status}
                        staffNote={appointment.staffNote}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
