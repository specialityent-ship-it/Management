import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { formatDate, humanLabel } from "@/lib/format";
import { NewStaffForm, StaffRow } from "@/components/StaffForms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Staff" };

const ROLE_NOTES: Record<string, string> = {
  ADMIN: "Full access, including staff and settings",
  DOCTOR: "Clinical views",
  RECEPTION: "Appointments, patients and payments",
  OT_COORDINATOR: "Theatre scheduling",
  MARKETING: "CRM and social publishing",
};

export default async function StaffPage() {
  const session = await getSession();
  const staff = await prisma.user.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">Staff accounts</h1>
        <p className="mt-1 text-sm text-ink-600">
          Who can sign in to the console, and what they can reach.
        </p>
      </div>

      <NewStaffForm />

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem]">
            <thead className="border-b border-ink-200 bg-ink-50">
              <tr>
                <th className="th">Name</th>
                <th className="th">Role</th>
                <th className="th">Added</th>
                <th className="th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {staff.map((member) => (
                <StaffRow
                  key={member.id}
                  member={{
                    id: member.id,
                    name: member.name,
                    email: member.email,
                    role: member.role,
                    active: member.active,
                  }}
                  isSelf={member.id === session?.userId}
                  addedOn={formatDate(member.createdAt)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <section className="card p-5">
        <h2 className="text-sm font-bold text-ink-900">What each role can do</h2>
        <dl className="mt-3 space-y-2 text-sm">
          {Object.entries(ROLE_NOTES).map(([role, note]) => (
            <div key={role} className="flex gap-3">
              <dt className="w-40 shrink-0 font-medium text-ink-900">{humanLabel(role)}</dt>
              <dd className="text-ink-600">{note}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs text-ink-500">
          Content management (doctors, services, staff) is restricted to administrators. Give people
          the narrowest role that lets them do their job.
        </p>
      </section>
    </div>
  );
}
