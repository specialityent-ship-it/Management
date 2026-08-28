import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { clinic } from "@/lib/config";
import { LoginForm } from "@/components/LoginForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Staff sign in" };

export default async function LoginPage() {
  if (await getSession()) redirect("/admin");

  return (
    <div className="grid min-h-screen place-items-center bg-ink-50 px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="flex items-center justify-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-600 text-sm font-bold text-white">
            {clinic.name.slice(0, 2).toUpperCase()}
          </span>
          <span className="text-lg font-bold tracking-tight text-ink-900">{clinic.name}</span>
        </Link>

        <div className="card mt-8 p-6">
          <h1 className="text-lg font-bold text-ink-900">Staff sign in</h1>
          <p className="mt-1 text-sm text-ink-600">Access the management console.</p>
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-sm text-ink-500">
          <Link href="/" className="hover:text-brand-700">
            ← Back to the website
          </Link>
        </p>
      </div>
    </div>
  );
}
