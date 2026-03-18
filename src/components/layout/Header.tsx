"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/logo";

export function Header() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-border bg-bg-card px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Logo className="h-5 w-auto" />
        <span className="text-text-muted text-xs font-mono">Events</span>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/events/new"
          className="rounded-full bg-accent hover:bg-accent-hover text-white font-mono text-[13px] font-medium py-2 px-4 transition-colors"
        >
          + New Event
        </Link>
        <button
          onClick={handleLogout}
          className="rounded-full border border-border hover:border-text-secondary text-text-secondary font-mono text-[13px] py-2 px-3 transition-colors"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
