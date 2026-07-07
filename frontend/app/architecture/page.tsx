import { ArrowRight, Brain, Cloud, Database, Network, Radio } from "lucide-react";
import { Fragment } from "react";
import { PageHeader, TagPill } from "@/components/ReverieUI";

const layers = [
  {
    eyebrow: "Person Signal",
    title: "Session stream",
    body: "The assistant hears what Lena says, preserves provenance, and turns each important turn into evidence.",
    icon: Radio
  },
  {
    eyebrow: "Memory Engine",
    title: "Memory engine",
    body: "The product core forms durable memories, consolidates them between sessions, and keeps the graph honest.",
    icon: Brain,
    featured: true,
    verbs: ["extract", "dream", "forget", "recall"]
  },
  {
    eyebrow: "Working Context",
    title: "Budgeted recall",
    body: "The most relevant memories compete for a fixed context budget before each response.",
    icon: Network
  }
];

const storage = [
  ["Memories", "Typed observations with confidence, strength, and lifecycle state."],
  ["Memory timeline", "Every consolidation, merge, decay, and recall is preserved as evidence."],
  ["Recall vectors", "Embeddings let the assistant retrieve the right memories without replaying everything."]
];

const stack = [
  ["Frontend", "Next.js App Router · live constellation canvas · streaming updates"],
  ["Backend", "FastAPI · SQLite memory ledger · dream worker · recall service"],
  [
    "Qwen on Alibaba Cloud",
    "Observer · assistant · dreams and judges · embeddings, reported live by /api/health"
  ],
  ["Deployment", "Docker Compose · Nginx · ECS-ready runtime"]
];

const swaps = [
  ["Support", "A customer across support tickets."],
  ["Healthcare", "A patient across visits."],
  ["Codebase", "An engineer across a codebase."],
  ["Litmus proof", "Spanish-conjugation tests exercise the duplicate guard outside the demo subject."]
];

export default function ArchitecturePage() {
  return (
    <div className="cosmic-shell min-h-dvh px-4 py-6 md:min-h-[calc(100dvh-1.5rem)] md:px-8 lg:px-12">
      <div className="relative z-10 mx-auto max-w-6xl space-y-6">
        <PageHeader
          eyebrow="People"
          title="Reverie is a domain-agnostic memory engine."
          description="The demo scenario is the hardest memory workload we could give it: one person, under pressure, returning across multiple sessions."
          meta={
            <>
              <TagPill>Event Sourced</TagPill>
              <TagPill>Budgeted Recall</TagPill>
              <TagPill>Dream Consolidation</TagPill>
            </>
          }
        />

        <section className="stellar-panel rounded-lg p-5 md:p-6">
          <p className="text-[14px] font-medium text-starlight">
            Zero Domain Knowledge
          </p>
          <p className="mt-3 max-w-4xl font-display text-[30px] leading-tight text-starlight md:text-[38px]">
            The engine contains zero domain knowledge. Swap one script file and the
            same engine remembers a customer across support tickets, a patient across
            visits, an engineer across a codebase. The test suite proves it.
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            {swaps.map(([name, detail]) => (
              <div key={name} className="rounded-lg border border-hairline bg-field-2/80 p-3">
                <p className="text-[13px] font-medium text-starlight">
                  {name}
                </p>
                <p className="mt-2 text-sm leading-6 text-starlight">{detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="stellar-panel rounded-lg p-5 md:p-6">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto_1.15fr_auto_1fr] lg:items-stretch">
            {layers.map((layer, index) => {
              const Icon = layer.icon;
              return (
                <Fragment key={layer.title}>
                  <div
                    className={`rounded-lg border bg-field/70 p-5 ${
                      layer.featured
                        ? "border-ember/50 shadow-[0_8px_28px_-12px_rgba(93,64,35,0.16)] lg:-my-2"
                        : "border-hairline"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[13px] font-medium text-starlight">
                        {layer.eyebrow}
                      </p>
                      <Icon
                        aria-hidden="true"
                        className={layer.featured ? "text-ember" : "text-dim"}
                        size={20}
                        strokeWidth={1.8}
                      />
                    </div>
                    <h2
                      className={`mt-5 font-semibold leading-snug text-starlight ${
                        layer.featured ? "text-2xl" : "text-xl"
                      }`}
                    >
                      {layer.title}
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-dim">{layer.body}</p>
                    {layer.verbs ? (
                      <div className="mt-5 flex flex-wrap gap-2">
                        {layer.verbs.map((verb) => (
                          <span
                            key={verb}
                            className="rounded-full border border-ember/30 bg-field-2 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-glow"
                          >
                            {verb[0].toUpperCase() + verb.slice(1)}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  {index < layers.length - 1 ? (
                    <div className="hidden items-center justify-center lg:flex">
                      <div className="flex items-center gap-2 text-ember/80">
                        <span className="h-px w-10 bg-hairline" />
                        <ArrowRight aria-hidden="true" size={18} strokeWidth={1.8} />
                        <span className="h-px w-10 bg-hairline" />
                      </div>
                    </div>
                  ) : null}
                </Fragment>
              );
            })}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="stellar-panel rounded-lg p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[14px] font-medium text-starlight">
                Storage
              </p>
              <Database aria-hidden="true" className="text-dim" size={18} strokeWidth={1.8} />
            </div>
            <div className="mt-5 grid gap-3">
              {storage.map(([name, detail]) => (
                <div key={name} className="rounded-lg border border-hairline bg-field-2/80 p-3">
                  <p className="text-[13px] font-medium text-starlight">
                    {name}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-starlight">{detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="stellar-panel rounded-lg p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[14px] font-medium text-starlight">
                Runtime Stack
              </p>
              <Cloud aria-hidden="true" className="text-dim" size={18} strokeWidth={1.8} />
            </div>
            <div className="mt-5 grid gap-3">
              {stack.map(([name, detail]) => (
                <div
                  key={name}
                  className="grid gap-2 rounded-lg border border-hairline bg-field-2/80 p-3 md:grid-cols-[170px_1fr]"
                >
                  <p className="text-[13px] font-medium text-starlight">
                    {name}
                  </p>
                  <p className="text-sm leading-6 text-starlight">{detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
