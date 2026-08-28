import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { formatDateTime, formatTime, humanLabel } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { NewOtCaseForm } from "@/components/NewOtCaseForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Operation theatre" };

const FILTERS = [
  { key: "upcoming", label: "Upcoming" },
  { key: "today", label: "Today" },
  { key: "PLANNED", label: "Planned" },
  { key: "SCHEDULED", label: "Scheduled" },
  { key: "COMPLETED", label: "Completed" },
  { key: "all", label: "All" },
];

export default async function OtPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const query = await searchParams;
  const filter = query.status ?? "upcoming";

  const where: Prisma.OtCaseWhereInput = {};
  if (filter === "upcoming") {
    where.scheduledStart = { gte: new Date() };
    where.status = { notIn: ["CANCELLED", "COMPLETED"] };
  } else if (filter === "today") {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    where.scheduledStart = { gte: start, lt: new Date(start.getTime() + 86_400_000) };
  } else if (filter !== "all") {
    where.status = filter as Prisma.OtCaseWhereInput["status"];
  }

  const [cases, patients, surgeons, services, theatres] = await Promise.all([
    prisma.otCase.findMany({
      where,
      orderBy: { scheduledStart: filter === "upcoming" || filter === "today" ? "asc" : "desc" },
      take: 100,
      include: {
        patient: { select: { id: true, name: true, phone: true, mrn: true } },
        surgeon: { select: { name: true } },
        service: { select: { name: true } },
        theatre: { select: { name: true } },
        checklist: { select: { done: true } },
      },
    }),
    prisma.patient.findMany({ orderBy: { updatedAt: "desc" }, take: 200, select: { id: true, name: true, mrn: true, phone: true } }),
    prisma.doctor.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.service.findMany({ where: { active: true, kind: "OT" }, orderBy: { name: "asc" }, select: { id: true, name: true, durationMin: true } }),
    prisma.theatre.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">Operation theatre</h1>
        <p className="mt-1 text-sm text-ink-600">
          Schedule cases, track pre-op readiness and move cases through theatre.
        </p>
      </div>

      <NewOtCaseForm
        patients={patients}
        surgeons={surgeons}
        services={services}
        theatres={theatres}
      />

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((option) => (
          <Link
            key={option.key}
            href={`/admin/ot?status=${option.key}`}
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
          <table className="w-full min-w-[52rem]">
            <thead className="border-b border-ink-200 bg-ink-50">
              <tr>
                <th className="th">Scheduled</th>
                <th className="th">Patient</th>
                <th className="th">Procedure</th>
                <th className="th">Theatre</th>
                <th className="th">Readiness</th>
                <th className="th">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {cases.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-14 text-center text-sm text-ink-500">
                    No theatre cases in this view.
                  </td>
                </tr>
              )}
              {cases.map((otCase) => {
                const done = otCase.checklist.filter((i) => i.done).length;
                return (
                  <tr key={otCase.id}>
                    <td className="td whitespace-nowrap">
                      <Link href={`/admin/ot/${otCase.id}`} className="font-medium hover:text-brand-700">
                        {formatDateTime(otCase.scheduledStart)}
                      </Link>
                      <p className="text-xs text-ink-500">
                        until {formatTime(otCase.scheduledEnd)} · {otCase.reference}
                      </p>
                    </td>
                    <td className="td">
                      <Link href={`/admin/patients/${otCase.patient.id}`} className="font-medium hover:text-brand-700">
                        {otCase.patient.name}
                      </Link>
                      <p className="text-xs text-ink-500">{otCase.patient.mrn}</p>
                    </td>
                    <td className="td">
                      <p>{otCase.service.name}</p>
                      <p className="text-xs text-ink-500">
                        {otCase.surgeon.name} · {humanLabel(otCase.anaesthesia)}
                      </p>
                    </td>
                    <td className="td text-sm">{otCase.theatre?.name ?? <span className="text-amber-600">Unassigned</span>}</td>
                    <td className="td">
                      <p className="text-sm">
                        {done}/{otCase.checklist.length} checks
                      </p>
                      <p className="text-xs">
                        {otCase.consentSigned ? (
                          <span className="text-emerald-700">Consent ✓</span>
                        ) : (
                          <span className="text-amber-600">Consent pending</span>
                        )}
                      </p>
                    </td>
                    <td className="td">
                      <StatusBadge status={otCase.status} />
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
