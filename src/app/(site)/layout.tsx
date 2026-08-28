import Link from "next/link";
import { clinic } from "@/lib/config";
import { ChatWidget } from "@/components/ChatWidget";

const NAV = [
  { href: "/services", label: "Services" },
  { href: "/doctors", label: "Doctors" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-ink-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-3.5">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-600 text-sm font-bold text-white">
              {clinic.name.slice(0, 2).toUpperCase()}
            </span>
            <span className="text-base font-bold tracking-tight text-ink-900">{clinic.name}</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <a
              href={`tel:${clinic.phone.replace(/\s/g, "")}`}
              className="hidden text-sm font-medium text-ink-600 hover:text-ink-900 sm:block"
            >
              {clinic.phone}
            </a>
            <Link href="/book" className="btn-primary">
              Book appointment
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-ink-200 bg-ink-50">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-sm font-bold text-ink-900">{clinic.name}</p>
            <p className="mt-2 text-sm text-ink-600">{clinic.tagline}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-ink-900">Visit</p>
            <p className="mt-2 text-sm text-ink-600">{clinic.address}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-ink-900">Contact</p>
            <p className="mt-2 text-sm text-ink-600">{clinic.phone}</p>
            <p className="text-sm text-ink-600">{clinic.email}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-ink-900">Quick links</p>
            <ul className="mt-2 space-y-1.5">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-sm text-ink-600 hover:text-brand-700">
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/login" className="text-sm text-ink-600 hover:text-brand-700">
                  Staff sign in
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-ink-200 px-4 py-5">
          <p className="mx-auto max-w-6xl text-xs text-ink-500">
            © {new Date().getFullYear()} {clinic.name}. Information on this site is general and is
            not a substitute for a consultation. In an emergency, contact your local emergency
            number.
          </p>
        </div>
      </footer>

      <ChatWidget />
    </div>
  );
}
