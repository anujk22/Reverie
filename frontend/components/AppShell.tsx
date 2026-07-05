import Link from "next/link";
import type { ReactNode } from "react";
import { BarChart3, Brain, Moon, Network, Radio } from "lucide-react";
import { RuntimeChip } from "@/components/RuntimeChip";

const routes = [
  { href: "/", label: "Session", icon: Radio },
  { href: "/dream", label: "Dream", icon: Moon },
  { href: "/evals", label: "Evals", icon: BarChart3 },
  { href: "/architecture", label: "Architecture", icon: Network },
  { href: "/conductor", label: "Conductor", icon: Brain }
];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-void text-starlight">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-16 border-r border-hairline bg-void md:flex md:flex-col md:items-center">
        <Link
          href="/"
          className="flex h-24 w-full items-center justify-center font-display text-[19px] italic text-starlight [writing-mode:vertical-rl]"
          title="Reverie"
        >
          Reverie
        </Link>
        <nav className="flex flex-1 flex-col items-center gap-2 py-5">
          {routes.map((route) => {
            const Icon = route.icon;
            return (
              <Link
                key={route.href}
                href={route.href}
                aria-label={route.label}
                title={route.label}
                className="flex h-11 w-11 items-center justify-center rounded-xl text-dim transition hover:bg-field-2 hover:text-glow"
              >
                <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
              </Link>
            );
          })}
        </nav>
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-hairline bg-field-2 font-mono text-[11px] text-dim">
            MC
          </div>
          <RuntimeChip />
        </div>
      </aside>

      <header className="sticky top-0 z-20 border-b border-hairline bg-void/90 backdrop-blur md:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/" className="font-display text-xl italic">
            Reverie
          </Link>
          <div className="flex items-center gap-2">
            {routes.slice(0, 3).map((route) => {
              const Icon = route.icon;
              return (
                <Link
                  key={route.href}
                  href={route.href}
                  aria-label={route.label}
                  title={route.label}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-hairline bg-field text-dim"
                >
                  <Icon aria-hidden="true" size={17} strokeWidth={1.8} />
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      <main className="min-h-dvh md:pl-16">{children}</main>
    </div>
  );
}
