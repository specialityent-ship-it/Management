import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatDate, formatDateTime, formatMoney, humanLabel } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      appointments: {
        orderBy: { start: "desc" },
        include: { doctor: { select: { name: true } }, service: { select: { name: true } } },
      },
      otCases: {
        orderBy: { scheduledStart: "desc" },
        include: { service: { select: { name: true } }, surgeon: { select: { name: true } } },
      },
      payments: { orderBy: { createdAt: "desc" } },
      leads: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!patient) notFound();

  const totalPaid = patient.payments
    .filter((p) => p.status === "PAID")
    .reduce((sum, p) => sum + p.amountMinor - p.refundedMinor, 0);

  return (
    <div className="space-y-6">
      <Link href="/admin/patients" className="text-sm font-medium text-brand-700 hover:underline">
        ← All patients
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">{patient.name}</h1>
        <p className="mt-1 text-sm text-ink-600">
          {patient.mrn} · {patient.phone}
          {patient.email && ` · ${patient.email}`}
        </p>
        <p className="mt-0.5 text-sm text-ink-500">
          {humanLabel(patient.gender)}
          {patient.dob && ` · born ${formatDate(patient.dob)}`}
          {patient.city && ` · ${patient.city}`}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <p className="text-sm text-ink-600">Appointments</p>
          <p className="mt-1 text-2xl font-bold text-ink-900">{patient.appointments.length}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-ink-600">Theatre cases</p>
          <p className="mt-1 text-2xl font-bold text-ink-900">{patient.otCases.length}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-ink-600">Net paid</p>
          <p className="mt-1 text-2xl font-bold text-ink-900">{formatMoney(totalPaid)}</p>
        </div>
      </div>

      <section className="card overflow-hidden">
        <div className="border-b border-ink-200 px-5 py-3.5">
          <h2 className="text-sm font-bold text-ink-900">Appointment history</h2>
        </div>
        {patient.appointments.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-ink-500">No appointments.</p>
        ) : (
          <ul className="divide-y divide-ink-100">
            {patient.appointments.map((appointment) => (
              <li key={appointment.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-ink-900">{appointment.service.name}</p>
                  <p className="text-xs text-ink-500">
                    {formatDateTime(appointment.start)} · {appointment.doctor.name} ·{" "}
                    {appointment.reference}
                  </p>
                  {appointment.reason && (
                    <p className="mt-1 text-xs text-ink-500">{appointment.reason}</p>
                  )}
                </div>
                <StatusBadge status={appointment.status} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {patient.otCases.length > 0 && (
        <section className="card overflow-hidden">
          <div className="border-b border-ink-200 px-5 py-3.5">
            <h2 className="text-sm font-bold text-ink-900">Theatre history</h2>
          </div>
          <ul className="divide-y divide-ink-100">
            {patient.otCases.map((otCase) => (
              <li key={otCase.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <div>
                  <Link
                    href={`/admin/ot/${otCase.id}`}
                    className="text-sm font-medium text-ink-900 hover:text-brand-700"
                  >
                    {otCase.service.name}
                  </Link>
                  <p className="text-xs text-ink-500">
                    {formatDateTime(otCase.scheduledStart)} · {otCase.surgeon.name} ·{" "}
                    {otCase.reference}
                  </p>
                </div>
                <StatusBadge status={otCase.status} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {patient.payments.length > 0 && (
        <section className="card overflow-hidden">
          <div className="border-b border-ink-200 px-5 py-3.5">
            <h2 className="text-sm font-bold text-ink-900">Payments</h2>
          </div>
          <ul className="divide-y divide-ink-100">
            {patient.payments.map((payment) => (
              <li key={payment.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-ink-900">
                    {formatMoney(payment.amountMinor)}
                    <span className="ml-2 font-normal text-ink-500">
                      {humanLabel(payment.purpose)}
                    </span>
                  </p>
                  <p className="font-mono text-xs text-ink-500">
                    {payment.receiptNo} · {formatDate(payment.createdAt)}
                  </p>
                </div>
                <StatusBadge status={payment.status} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {patient.notes && (
        <section className="card p-5">
          <h2 className="text-sm font-bold text-ink-900">Notes</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-ink-700">{patient.notes}</p>
        </section>
      )}
    </div>
  );
}
