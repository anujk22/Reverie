import type { ReactNode } from "react";

export function GatedRoute({
  title,
  children
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <section className="rounded-md bg-panel p-6">
      <p className="font-mono text-xs uppercase tracking-widest text-muted">
        Gated until M0
      </p>
      <h2 className="mt-2 text-2xl font-semibold">{title}</h2>
      <p className="mt-4 max-w-2xl text-sm leading-6 text-muted">
        This route is intentionally a placeholder until the Alibaba ECS stub is
        live and `/api/health` is reachable from the public deployment. M5
        frontend design work, constellation rendering, dream visuals, and eval
        charts should not begin before that gate clears.
      </p>
      {children ? <div className="mt-5">{children}</div> : null}
    </section>
  );
}
