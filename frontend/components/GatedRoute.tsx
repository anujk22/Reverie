import type { ReactNode } from "react";

export function GatedRoute({
  title,
  children
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="cosmic-shell min-h-dvh px-4 py-6 md:min-h-[calc(100dvh-1.5rem)] md:px-8 lg:px-12">
      <section className="stellar-panel relative z-10 mx-auto max-w-4xl rounded-lg p-7">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ember">
          coming online
        </p>
        <h2 className="display-glow mt-3 font-display text-[44px] font-medium leading-none text-starlight">
          {title}
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-dim">
          This surface lights up when its live backend lands.
        </p>
        {children ? <div className="mt-5">{children}</div> : null}
      </section>
    </div>
  );
}
