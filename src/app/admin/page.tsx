import Link from "next/link";
import { CalendarDays, Scissors, IndianRupee, Contact, ArrowRight } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatMoney, formatTime, formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { BLOCKING_STATUSES } from "@/lib/scheduling";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const now = new Date();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [todayAppointments, todayOt, pendingRequests, openLeads, monthRevenue, upcoming, recentLeads] =
    await Promise.all([
      prisma.appointment.count({
        where: { start: { gte: dayStart, lt: dayEnd }, status: { in: BLOCKING_STATUSES } },
      }),
      prisma.otCase.count({
        where: {
          scheduledStart: { gte: dayStart, lt: dayEnd },
          status: { notIn: ["CANCELLED", "POSTPONED"] },
        },
      }),
      prisma.appointment.count({ where: { status: { in: ["REQUESTED", "PENDING_PAYMENT"] } } }),
      prisma.lead.count({ where: { stage: { notIn: ["WON", "LOST"] } } }),
      prisma.payment.aggregate({
        where: { status: "PAID", createdAt: { gte: monthStart } },
        _sum: { amountMinor: true },
      }),
      prisma.appointment.findMany({
        where: { start: { gte: now }, status: { in: BLOCKING_STATUSES } },
        orderBy: { start: "asc" },
        take: 8,
        include: { patient: true, doctor: true, service: true },
      }),
      prisma.lead.findMany({
        where: { stage: { notIn: ["WON", "LOST"] } },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
    ]);

  const stats = [
    { label: "Appointments today", value: todayAppointments, icon: CalendarDays, href: "/admin/appointments" },
    { label: "Theatre cases today", value: todayOt, icon: Scissors, href: "/admin/ot" },
    { label: "Awaiting confirmation", value: pendingRequests, icon: CalendarDays, href: "/admin/appointments?status=REQUESTED" },
    { label: "Open leads", value: openLeads, icon: Contact, href: "/admin/crm" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">Dashboard</h1>
        <p className="mt-1 text-sm text-ink-600">{formatDate(now)}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, href }) => (
          <Link key={label} href={href} className="card p-5 transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between">
              <p className="text-sm text-ink-600">{label}</p>
              <Icon className="h-4 w-4 text-ink-400" />
            </div>
            <p className="mt-2 text-3xl font-bold text-ink-900">{value}</p>
          </Link>
        ))}
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-ink-600">Collected this month</p>
          <IndianRupee className="h-4 w-4 text-ink-400" />
        </div>
        <p className="mt-2 text-3xl font-bold text-ink-900">
          {formatMoney(monthRevenue._sum.amountMinor ?? 0)}
        </p>
        <Link href="/admin/payments" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">
          View payments <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-ink-200 px-5 py-3.5">
            <h2 className="text-sm font-bold text-ink-900">Next appointments</h2>
            <Link href="/admin/appointments" className="text-sm font-medium text-brand-700 hover:underline">
              All
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-ink-500">Nothing scheduled.</p>
          ) : (
            <ul className="divide-y divide-ink-100">
              {upcoming.map((appointment) => (
                <li key={appointment.id} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink-900">
                      {appointment.patient.name}
                    </p>
                    <p className="truncate text-xs text-ink-500">
                      {appointment.service.name} · {appointment.doctor.name}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-medium text-ink-900">{formatTime(appointment.start)}</p>
                    <p className="text-xs text-ink-500">{formatDate(appointment.start)}</p>
                  </div>
                  <StatusBadge status={appointment.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-ink-200 px-5 py-3.5">
            <h2 className="text-sm font-bold text-ink-900">Leads to follow up</h2>
            <Link href="/admin/crm" className="text-sm font-medium text-brand-700 hover:underline">
              All
            </Link>
          </div>
          {recentLeads.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-ink-500">No open leads.</p>
          ) : (
            <ul className="divide-y divide-ink-100">
              {recentLeads.map((lead) => (
                <li key={lead.id} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div className="min-w-0">
                    <Link href={`/admin/crm/${lead.id}`} className="truncate text-sm font-medium text-ink-900 hover:text-brand-700">
                      {lead.name}
                    </Link>
                    <p className="truncate text-xs text-ink-500">
                      {lead.phone}
                      {lead.interest && ` · ${lead.interest}`}
                    </p>
                  </div>
                  <StatusBadge status={lead.stage} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
