import Link from "next/link";
import { PaymentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { formatDateTime, formatMoney, humanLabel } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { integrations } from "@/lib/config";

export const dynamic = "force-dynamic";
export const metadata = { title: "Payments" };

const FILTERS = ["all", "PAID", "CREATED", "FAILED", "REFUNDED"];

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const query = await searchParams;
  const filter = query.status ?? "all";

  const where: Prisma.PaymentWhereInput =
    filter !== "all" && Object.values(PaymentStatus).includes(filter as PaymentStatus)
      ? { status: filter as PaymentStatus }
      : {};

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [payments, monthTotal, pendingTotal] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 150,
      include: {
        patient: { select: { id: true, name: true } },
        appointment: { select: { reference: true } },
      },
    }),
    prisma.payment.aggregate({
      where: { status: "PAID", createdAt: { gte: monthStart } },
      _sum: { amountMinor: true, refundedMinor: true },
    }),
    prisma.payment.aggregate({
      where: { status: { in: ["CREATED", "ATTEMPTED"] } },
      _sum: { amountMinor: true },
    }),
  ]);

  const collected = (monthTotal._sum.amountMinor ?? 0) - (monthTotal._sum.refundedMinor ?? 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">Payments</h1>
        <p className="mt-1 text-sm text-ink-600">
          Every deposit and fee collected through Razorpay.
        </p>
      </div>

      {!integrations.razorpay && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Razorpay is not configured. Add <code>RAZORPAY_KEY_ID</code> and{" "}
          <code>RAZORPAY_KEY_SECRET</code> to your environment to start collecting payments online.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card p-5">
          <p className="text-sm text-ink-600">Collected this month</p>
          <p className="mt-1 text-2xl font-bold text-ink-900">{formatMoney(collected)}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-ink-600">Awaiting payment</p>
          <p className="mt-1 text-2xl font-bold text-ink-900">
            {formatMoney(pendingTotal._sum.amountMinor ?? 0)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((option) => (
          <Link
            key={option}
            href={`/admin/payments?status=${option}`}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === option
                ? "bg-brand-600 text-white"
                : "bg-white text-ink-600 ring-1 ring-inset ring-ink-200 hover:bg-ink-100"
            }`}
          >
            {option === "all" ? "All" : humanLabel(option)}
          </Link>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[48rem]">
            <thead className="border-b border-ink-200 bg-ink-50">
              <tr>
                <th className="th">Receipt</th>
                <th className="th">Patient</th>
                <th className="th">Purpose</th>
                <th className="th">Amount</th>
                <th className="th">Status</th>
                <th className="th">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {payments.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-14 text-center text-sm text-ink-500">
                    No payments in this view.
                  </td>
                </tr>
              )}
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="td font-mono text-xs">
                    {payment.receiptNo}
                    {payment.appointment && (
                      <p className="text-ink-400">{payment.appointment.reference}</p>
                    )}
                  </td>
                  <td className="td">
                    {payment.patient ? (
                      <Link
                        href={`/admin/patients/${payment.patient.id}`}
                        className="font-medium hover:text-brand-700"
                      >
                        {payment.patient.name}
                      </Link>
                    ) : (
                      <span className="text-ink-400">—</span>
                    )}
                  </td>
                  <td className="td text-sm">{humanLabel(payment.purpose)}</td>
                  <td className="td font-medium">
                    {formatMoney(payment.amountMinor)}
                    {payment.refundedMinor > 0 && (
                      <p className="text-xs text-violet-700">
                        −{formatMoney(payment.refundedMinor)} refunded
                      </p>
                    )}
                  </td>
                  <td className="td">
                    <StatusBadge status={payment.status} />
                    {payment.failureReason && (
                      <p className="mt-1 max-w-xs text-xs text-red-600">{payment.failureReason}</p>
                    )}
                  </td>
                  <td className="td whitespace-nowrap text-sm text-ink-500">
                    {formatDateTime(payment.createdAt)}
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
