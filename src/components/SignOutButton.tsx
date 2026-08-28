"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button onClick={signOut} className="btn-ghost mt-2 w-full justify-start text-sm">
      <LogOut className="h-4 w-4" /> Sign out
    </button>
  );
}
