"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  Archive,
  BookOpen,
  Clapperboard,
  Feather,
  Lightbulb,
  Network
} from "lucide-react";
import { usePathname } from "next/navigation";
import { DemoDirectorProvider, useDemoDirector } from "@/components/DemoDirector";
import { RuntimeChip } from "@/components/RuntimeChip";

const routes = [
  { href: "/", label: "Session", icon: BookOpen },
  { href: "/dream", label: "Dream", icon: Archive },
  { href: "/evals", label: "Evals", icon: Lightbulb },
  { href: "/architecture", label: "Architecture", icon: Network },
  { href: "/conductor", label: "Demo", icon: Clapperboard }
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

  return (
    <div className="reverie-root">
      <aside className="reverie-sidebar" aria-label="Primary navigation">
        <button
          type="button"
          className="sidebar-mark"
          aria-label="Play Reverie demo story"
          onClick={() => director.start()}
        >
          <span>
            <Feather aria-hidden="true" size={31} strokeWidth={1.8} />
          </span>
        </button>

        <nav className="sidebar-nav">
          {routes.map((route) => {
            const Icon = route.icon;
            const active =
              route.href === "/" ? pathname === "/" : pathname.startsWith(route.href);
            return (
              <Link
                key={route.href}
                href={route.href}
                className={`sidebar-link ${active ? "sidebar-link-active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <Icon aria-hidden="true" size={23} strokeWidth={1.55} />
                <span>{route.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="relative z-[1] flex flex-col items-center pb-3">
          <RuntimeChip />
        </div>

        <div className="sidebar-brand">
          <strong>Reverie</strong>
          <span>Cognitive AI Memory Engine</span>
        </div>
      </aside>

      <header className="mobile-shell-bar">
        <Link href="/" className="font-body text-2xl font-semibold">
          Reverie
        </Link>
        <nav className="mobile-shell-nav" aria-label="Mobile navigation">
          {routes.slice(0, 4).map((route) => {
            const Icon = route.icon;
            const active =
              route.href === "/" ? pathname === "/" : pathname.startsWith(route.href);
            return (
              <Link
                key={route.href}
                href={route.href}
                aria-label={route.label}
                aria-current={active ? "page" : undefined}
              >
                <Icon aria-hidden="true" size={18} strokeWidth={1.7} />
              </Link>
            );
          })}
          <button type="button" aria-label="Play Reverie demo story" onClick={() => director.start()}>
            <Feather aria-hidden="true" size={18} strokeWidth={1.7} />
          </button>
        </nav>
      </header>

      <main className="reverie-main">{children}</main>
    </div>
  );
}
