import Link from "next/link";
import { Mail, MessageSquare } from "lucide-react";
import { NotificationStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { formatDateTime, humanLabel } from "@/lib/format";
import { emailConfigured, whatsappConfigured } from "@/lib/notifications";

export const dynamic = "force-dynamic";
export const metadata = { title: "Notifications" };

const FILTERS = ["all", "SENT", "FAILED", "SKIPPED"];

const TONES: Record<string, string> = {
  SENT: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  FAILED: "bg-red-50 text-red-700 ring-red-200",
  SKIPPED: "bg-ink-100 text-ink-600 ring-ink-200",
};

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const query = await searchParams;
  const filter = query.status ?? "all";

  const where: Prisma.NotificationLogWhereInput =
    filter !== "all" && Object.values(NotificationStatus).includes(filter as NotificationStatus)
      ? { status: filter as NotificationStatus }
      : {};

  const [logs, counts] = await Promise.all([
    prisma.notificationLog.findMany({ where, orderBy: { createdAt: "desc" }, take: 150 }),
    prisma.notificationLog.groupBy({ by: ["status"], _count: true }),
  ]);

  const countFor = (status: string) => counts.find((c) => c.status === status)?._count ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">Notifications</h1>
        <p className="mt-1 text-sm text-ink-600">
          Every confirmation, receipt and reminder the system has tried to send.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card flex items-center gap-4 p-5">
          <Mail className={`h-6 w-6 ${emailConfigured() ? "text-brand-600" : "text-ink-300"}`} />
          <div className="flex-1">
            <p className="text-sm font-semibold text-ink-900">Email</p>
            <p className="text-xs text-ink-500">
              {emailConfigured() ? "SMTP configured" : "Needs SMTP_HOST and SMTP_PORT"}
            </p>
          </div>
        </div>
        <div className="card flex items-center gap-4 p-5">
          <MessageSquare
            className={`h-6 w-6 ${whatsappConfigured() ? "text-brand-600" : "text-ink-300"}`}
          />
          <div className="flex-1">
            <p className="text-sm font-semibold text-ink-900">WhatsApp</p>
            <p className="text-xs text-ink-500">
              {whatsappConfigured()
                ? "Cloud API configured"
                : "Needs WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID"}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((option) => (
          <Link
            key={option}
            href={`/admin/notifications?status=${option}`}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === option
                ? "bg-brand-600 text-white"
                : "bg-white text-ink-600 ring-1 ring-inset ring-ink-200 hover:bg-ink-100"
            }`}
          >
            {option === "all" ? "All" : humanLabel(option)}
            {option !== "all" && (
              <span className="ml-1.5 text-xs opacity-70">{countFor(option)}</span>
            )}
          </Link>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem]">
            <thead className="border-b border-ink-200 bg-ink-50">
              <tr>
                <th className="th">When</th>
                <th className="th">Channel</th>
                <th className="th">Message</th>
                <th className="th">Recipient</th>
                <th className="th">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-14 text-center text-sm text-ink-500">
                    Nothing sent yet.
                  </td>
                </tr>
              )}
              {logs.map((log) => (
                <tr key={log.id} className="align-top">
                  <td className="td whitespace-nowrap text-ink-500">
                    {formatDateTime(log.createdAt)}
                  </td>
                  <td className="td">
                    <span className="inline-flex items-center gap-1.5 text-sm">
                      {log.channel === "EMAIL" ? (
                        <Mail className="h-3.5 w-3.5 text-ink-400" />
                      ) : (
                        <MessageSquare className="h-3.5 w-3.5 text-ink-400" />
                      )}
                      {humanLabel(log.channel)}
                    </span>
                  </td>
                  <td className="td">
                    <p className="font-medium">{humanLabel(log.template)}</p>
                    {log.subject && (
                      <p className="mt-0.5 max-w-md text-xs text-ink-500">{log.subject}</p>
                    )}
                  </td>
                  <td className="td text-sm">{log.recipient}</td>
                  <td className="td">
                    <span className={`badge ${TONES[log.status]}`}>{humanLabel(log.status)}</span>
                    {log.error && (
                      <p className="mt-1 max-w-xs text-xs text-red-600">{log.error}</p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
