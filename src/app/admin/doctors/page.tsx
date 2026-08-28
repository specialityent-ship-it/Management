import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { NewDoctorForm } from "@/components/NewDoctorForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Doctors" };

export default async function AdminDoctorsPage() {
  const doctors = await prisma.doctor.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: {
      services: { where: { active: true }, select: { id: true } },
      availability: { where: { active: true }, select: { id: true } },
      _count: { select: { appointments: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">Doctors</h1>
        <p className="mt-1 text-sm text-ink-600">
          Everyone listed on the website. Add consulting hours so patients can book them.
        </p>
      </div>

      <NewDoctorForm />

      {doctors.length === 0 ? (
        <div className="card px-5 py-14 text-center">
          <p className="text-sm text-ink-600">No doctors yet.</p>
          <p className="mt-1 text-sm text-ink-500">
            Add your first one above — the website stays empty until you do.
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem]">
              <thead className="border-b border-ink-200 bg-ink-50">
                <tr>
                  <th className="th">Name</th>
                  <th className="th">Specialty</th>
                  <th className="th">Fee</th>
                  <th className="th">Consulting hours</th>
                  <th className="th">Services</th>
                  <th className="th">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {doctors.map((doctor) => (
                  <tr key={doctor.id}>
                    <td className="td">
                      <Link
                        href={`/admin/doctors/${doctor.id}`}
                        className="font-medium hover:text-brand-700"
                      >
                        {doctor.name}
                      </Link>
                      <p className="text-xs text-ink-500">{doctor.qualifications}</p>
                    </td>
                    <td className="td text-sm">{doctor.specialty}</td>
                    <td className="td text-sm">
                      {doctor.consultFee > 0 ? formatMoney(doctor.consultFee) : "—"}
                    </td>
                    <td className="td text-sm">
                      {doctor.availability.length > 0 ? (
                        `${doctor.availability.length} window${doctor.availability.length === 1 ? "" : "s"}`
                      ) : (
                        <span className="text-amber-600">None — not bookable</span>
                      )}
                    </td>
                    <td className="td text-sm">{doctor.services.length}</td>
                    <td className="td">
                      {doctor.active ? (
                        <span className="badge bg-emerald-50 text-emerald-800 ring-emerald-200">
                          Listed
                        </span>
                      ) : (
                        <span className="badge bg-ink-100 text-ink-600 ring-ink-200">Hidden</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
