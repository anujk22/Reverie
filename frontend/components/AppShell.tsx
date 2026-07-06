"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { BarChart3, Brain, Clapperboard, Moon, Network, Radio } from "lucide-react";
import { usePathname } from "next/navigation";
import { DemoDirectorProvider, useDemoDirector } from "@/components/DemoDirector";
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
    <DemoDirectorProvider>
      <AppShellFrame>{children}</AppShellFrame>
    </DemoDirectorProvider>
  );
}

function AppShellFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const director = useDemoDirector();
  const directorActive = director.status !== "idle";

  return (
    <div className="min-h-dvh bg-void text-starlight md:p-3">
      <aside className="fixed bottom-3 left-3 top-3 z-30 hidden w-[72px] rounded-l-lg border border-hairline bg-field md:flex md:flex-col md:items-center">
        <Link
          href="/"
          className="flex h-32 w-full items-center justify-center border-b border-hairline font-display text-[22px] italic leading-none text-starlight [writing-mode:vertical-rl]"
          title="Reverie"
        >
          Reverie
        </Link>
        <nav className="flex flex-1 flex-col items-center gap-3 py-6">
          {routes.map((route) => {
            const Icon = route.icon;
            const active =
              route.href === "/" ? pathname === "/" : pathname.startsWith(route.href);
            return (
              <Link
                key={route.href}
                href={route.href}
                aria-label={route.label}
                title={route.label}
                className={`flex h-10 w-10 items-center justify-center rounded-full transition ${
                  active
                    ? "rounded-[14px] border border-ember/30 bg-ember/10 text-ember"
                    : "text-starlight hover:bg-field-2 hover:text-ember"
                }`}
              >
                <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
              </Link>
            );
          })}
        </nav>
        <div className="flex flex-col items-center gap-3 py-4">
          <button
            type="button"
            aria-label="Play the story"
            title="Play the story"
            onClick={() => director.start()}
            className={`flex h-10 w-10 items-center justify-center rounded-full border border-hairline transition ${
              directorActive
                ? "bg-ember/10 text-ember"
                : "bg-field-2 text-starlight hover:text-ember"
            }`}
          >
            <Clapperboard aria-hidden="true" size={17} strokeWidth={1.8} />
          </button>
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-sage/30 bg-sage/20 font-mono text-[11px] text-starlight">
            LP
          </div>
          <RuntimeChip />
        </div>
      </aside>

      <header className="sticky top-0 z-20 border-b border-hairline bg-field/95 backdrop-blur md:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/" className="font-display text-xl italic">
            Reverie
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Play the story"
              title="Play the story"
              onClick={() => director.start()}
              className={`flex h-10 w-10 items-center justify-center rounded-full border border-hairline ${
                directorActive ? "bg-ember/10 text-ember" : "bg-field-2 text-starlight"
              }`}
            >
              <Clapperboard aria-hidden="true" size={17} strokeWidth={1.8} />
            </button>
            {routes.slice(0, 3).map((route) => {
              const Icon = route.icon;
              return (
                <Link
                  key={route.href}
                  href={route.href}
                  aria-label={route.label}
                  title={route.label}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-hairline bg-field-2 text-starlight"
                >
                  <Icon aria-hidden="true" size={17} strokeWidth={1.8} />
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      <main className="min-h-dvh md:ml-[72px] md:min-h-[calc(100dvh-1.5rem)] md:rounded-r-lg md:border-y md:border-r md:border-hairline md:bg-void">
        {children}
      </main>
    </div>
  );
}
