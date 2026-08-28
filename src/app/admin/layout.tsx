import Link from "next/link";
import { redirect } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Scissors,
  Users,
  Contact,
  CreditCard,
  Megaphone,
  MessagesSquare,
  BellRing,
  Stethoscope,
  ClipboardList,
  UserCog,
  Settings,
} from "lucide-react";
import { getSession } from "@/lib/auth";
import { clinic } from "@/lib/config";
import { SignOutButton } from "@/components/SignOutButton";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/appointments", label: "Appointments", icon: CalendarDays },
  { href: "/admin/ot", label: "Operation theatre", icon: Scissors },
  { href: "/admin/patients", label: "Patients", icon: Users },
  { href: "/admin/crm", label: "CRM", icon: Contact },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/social", label: "Social", icon: Megaphone },
  { href: "/admin/conversations", label: "Chatbot", icon: MessagesSquare },
  { href: "/admin/notifications", label: "Notifications", icon: BellRing },
  { href: "/admin/doctors", label: "Doctors", icon: Stethoscope },
  { href: "/admin/services", label: "Services", icon: ClipboardList },
  { href: "/admin/staff", label: "Staff", icon: UserCog },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen bg-ink-50">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-ink-200 bg-white lg:flex">
        <Link href="/admin" className="flex items-center gap-2.5 border-b border-ink-200 px-5 py-4">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-xs font-bold text-white">
            {clinic.name.slice(0, 2).toUpperCase()}
          </span>
          <span className="text-sm font-bold tracking-tight text-ink-900">Console</span>
        </Link>

        <nav className="flex-1 space-y-0.5 p-3">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-ink-200 p-3">
          <p className="truncate px-3 text-sm font-medium text-ink-900">{session.name}</p>
          <p className="truncate px-3 text-xs text-ink-500">{session.role.replace("_", " ")}</p>
          <SignOutButton />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-ink-200 bg-white px-4 py-3 lg:hidden">
          <Link href="/admin" className="text-sm font-bold text-ink-900">
            {clinic.name} Console
          </Link>
          <SignOutButton />
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b border-ink-200 bg-white px-2 py-2 lg:hidden">
          {NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-ink-600 hover:bg-ink-100"
            >
              {label}
            </Link>
          ))}
        </nav>

        <main className="min-w-0 flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
