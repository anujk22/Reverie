import Link from "next/link";
import type { ReactNode } from "react";
import { HealthPanel } from "@/components/HealthPanel";

const routes = [
  { href: "/", label: "Session" },
  { href: "/dream", label: "Dream" },
  { href: "/evals", label: "Evals" },
  { href: "/architecture", label: "Architecture" },
  { href: "/conductor", label: "Conductor" }
];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-muted">Reverie</p>
            <h1 className="text-xl font-semibold">Pre-M5 frontend skeleton</h1>
          </div>
          <nav className="flex flex-wrap gap-2 text-sm">
            {routes.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className="rounded-md border border-line px-3 py-2 text-muted hover:text-text"
              >
                {route.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto grid max-w-6xl gap-6 px-5 py-6 lg:grid-cols-[1fr_360px]">
        <div>{children}</div>
        <HealthPanel />
      </main>
    </div>
  );
}
