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
        Memory surface unavailable
      </p>
      <h2 className="mt-2 text-2xl font-semibold">{title}</h2>
      <p className="mt-4 max-w-2xl text-sm leading-6 text-muted">
        This route is a fallback shell. Shipped screens should render memory
        state, dream events, or honest proof state from the backend.
      </p>
      {children ? <div className="mt-5">{children}</div> : null}
    </section>
  );
}
