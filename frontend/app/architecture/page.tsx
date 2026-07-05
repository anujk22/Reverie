import { Brain, Cloud, Database, GitBranch, Network, Radio } from "lucide-react";

const layers = [
  {
    eyebrow: "person signal",
    title: "Session stream",
    body: "Utterances, provenance quotes, and response turns enter as events.",
    icon: Radio
  },
  {
    eyebrow: "memory engine",
    title: "Extract · dream · forget · recall",
    body: "The core pipeline has no calculus rules. It stores typed memories about a person.",
    icon: Brain,
    featured: true
  },
  {
    eyebrow: "working context",
    title: "Budgeted recall",
    body: "Relevant memories compete for a fixed token budget before each response.",
    icon: Network
  }
];

const stack = [
  ["Frontend", "Next.js App Router · Canvas constellation · SSE event stream"],
  ["Backend", "FastAPI · SQLite event store · dream worker · retrieval service"],
  ["Qwen on Alibaba Cloud", "qwen-plus for chat, observer, judges · text-embedding-v4"],
  ["Deployment", "Docker Compose · Nginx · ECS when identity access lands"]
];

export default function ArchitecturePage() {
  return (
    <div className="cosmic-shell min-h-dvh px-4 py-6 md:min-h-[calc(100dvh-1.5rem)] md:px-8 lg:px-12">
      <div className="relative z-10 mx-auto max-w-6xl space-y-6">
        <header>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ember">
            architecture
          </p>
          <h1 className="display-glow mt-3 max-w-3xl font-display text-[46px] font-medium leading-[1.02] text-starlight">
            Reverie is a memory engine wearing a tutoring skin.
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-dim">
            The subject lives in prompts. The durable product is extraction, dreaming,
            forgetting, and budgeted recall over a person-shaped memory graph.
          </p>
        </header>

        <section className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-3">
            {layers.map((layer) => {
              const Icon = layer.icon;
              return (
                <div
                  key={layer.title}
                  className={`stellar-panel rounded-lg p-5 ${
                    layer.featured ? "border-ember/40" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-dim">
                      {layer.eyebrow}
                    </p>
                    <Icon
                      aria-hidden="true"
                      className={layer.featured ? "text-ember" : "text-dim"}
                      size={19}
                      strokeWidth={1.8}
                    />
                  </div>
                  <h2 className="mt-5 text-xl font-semibold leading-snug text-starlight">
                    {layer.title}
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-dim">{layer.body}</p>
                </div>
              );
            })}
          </div>

          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-hairline" />
            <GitBranch aria-hidden="true" className="text-ember" size={18} strokeWidth={1.8} />
            <span className="h-px flex-1 bg-hairline" />
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
            <section className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-dim">
                  storage
                </p>
                <Database aria-hidden="true" className="text-dim" size={18} strokeWidth={1.8} />
              </div>
              <dl className="mt-5 grid gap-3 font-mono text-[11px] text-dim">
                <div className="stellar-panel rounded-lg p-3">
                  <dt>engrams</dt>
                  <dd className="mt-1 text-starlight">typed memories with strength</dd>
                </div>
                <div className="stellar-panel rounded-lg p-3">
                  <dt>memory_events</dt>
                  <dd className="mt-1 text-starlight">append-only lifecycle truth</dd>
                </div>
                <div className="stellar-panel rounded-lg p-3">
                  <dt>engram_vectors</dt>
                  <dd className="mt-1 text-starlight">1024-d embeddings for recall</dd>
                </div>
              </dl>
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-dim">
                  runtime stack
                </p>
                <Cloud aria-hidden="true" className="text-dim" size={18} strokeWidth={1.8} />
              </div>
              <div className="mt-5 grid gap-3">
                {stack.map(([name, detail]) => (
                  <div key={name} className="stellar-panel grid gap-2 rounded-lg p-3 md:grid-cols-[170px_1fr]">
                    <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ember">
                      {name}
                    </p>
                    <p className="text-sm leading-6 text-starlight">{detail}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </section>

        <section className="stellar-panel rounded-lg p-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-dim">
            subject swap proof
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-starlight">
            Spanish-conjugation tests exercise the duplicate guard outside the demo
            subject. The same memory pipeline would run unchanged for a different
            subject prompt.
          </p>
        </section>
      </div>
    </div>
  );
}
