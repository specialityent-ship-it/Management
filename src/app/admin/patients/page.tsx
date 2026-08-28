import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Patients" };

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const query = await searchParams;
  const search = (query.q ?? "").trim();

  const where: Prisma.PatientWhereInput = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { phone: { contains: search } },
          { mrn: { contains: search, mode: "insensitive" } },
        ],
      }
    : {};

  const patients = await prisma.patient.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: {
      _count: { select: { appointments: true, otCases: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">Patients</h1>
          <p className="mt-1 text-sm text-ink-600">
            Records are created automatically when someone books online.
          </p>
        </div>
        <form className="flex gap-2">
          <input
            name="q"
            defaultValue={search}
            placeholder="Name, phone or MRN"
            className="input w-64"
          />
          <button className="btn-secondary">Search</button>
        </form>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem]">
            <thead className="border-b border-ink-200 bg-ink-50">
              <tr>
                <th className="th">MRN</th>
                <th className="th">Name</th>
                <th className="th">Contact</th>
                <th className="th">Visits</th>
                <th className="th">Last updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {patients.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-14 text-center text-sm text-ink-500">
                    {search ? "No patients match that search." : "No patients yet."}
                  </td>
                </tr>
              )}
              {patients.map((patient) => (
                <tr key={patient.id}>
                  <td className="td font-mono text-xs">{patient.mrn}</td>
                  <td className="td">
                    <Link
                      href={`/admin/patients/${patient.id}`}
                      className="font-medium hover:text-brand-700"
                    >
                      {patient.name}
                    </Link>
                    {patient.city && <p className="text-xs text-ink-500">{patient.city}</p>}
                  </td>
                  <td className="td">
                    <p>{patient.phone}</p>
                    {patient.email && <p className="text-xs text-ink-500">{patient.email}</p>}
                  </td>
                  <td className="td text-sm">
                    {patient._count.appointments} OPD · {patient._count.otCases} OT
                  </td>
                  <td className="td text-sm text-ink-500">{formatDate(patient.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
