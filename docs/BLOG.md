# Building Reverie: a memory engine you can watch think

Every AI assistant has the same embarrassing secret: it's a goldfish. You can tell it your deadline, your one recurring mistake, and exactly how you like your answers — and next session it greets you like a stranger. The workaround everyone reaches for is stuffing the entire conversation history back into the prompt. But context windows aren't memory; they are cost. You pay for every stale token on every call, quality drifts as the transcript balloons, and nothing ever gets *forgotten*.

We built Reverie for QwenHacks Track 1 (MemoryAgent) to treat memory as what it actually is: a first-class, inspectable, budgeted system. Extraction with provenance receipts, dream consolidation, Ebbinghaus decay, and budgeted retrieval are all watchable in real time.

## A memory problem anyone can understand

The film follows Lena across two interview-preparation sessions. She says the final interview is Friday, believes credibility requires explaining every technical detail, and admits that she froze last time. Then the facts change: the interview moves to Monday, she corrects her strategy to lead with impact, and asks for one question at a time with direct feedback and no pep talk. A useful memory engine has to preserve the correction, remember the pressure without reducing her to it, and use the right details when she returns.

## Typed, event-audited memories with receipts

Reverie never stores vibes. After each exchange, a fast observer model extracts typed engrams — `misconception`, `mastery`, `preference`, `affect`, `goal`, `fact`, `strategy_outcome` — each with confidence, importance, and subject tags. Every candidate must cite exact quotes from the transcript; if the quote isn't actually in the conversation, the memory is rejected. Click any memory in the UI and you see its provenance: the utterances it came from and every lifecycle event since.

Current memory state is stored transactionally, and every observation, reinforcement, merge, supersession, decay, and archive also appends to an audit timeline. Nothing is silently overwritten. Explicit corrections preserve the earlier version through a supersession edge; explicit forgetting removes the memory, its vector, and its provenance links. The frontend never invents memory state — it renders the graph from the API and animates the event stream.

## Dreams: distill, dedupe, reconcile — then forget

Between sessions, Reverie dreams. The end-session dream cycle replays the session and runs three judged passes on `qwen-max`:

- **Distill** re-examines provisional memories against their evidence and confirms, revises, or rejects them.
- **Deduplicate** finds near-duplicate memories by embedding similarity, asks a judge whether they're truly the same, and merges them with reinforcement instead of letting the graph silt up.
- **Reconcile** detects contradictions: Lena first believes she needs every technical detail, then corrects the strategy to lead with impact. The older belief is superseded rather than silently deleted, preserving the correction as history. Changed goal timing is handled the same way, so Monday replaces Friday instead of competing with it.

Then time does its work. Memory strength follows an Ebbinghaus-style decay curve driven by importance, access count, and time since last recall. A stale, low-importance question loses strength day by day; recalled memories are reinforced. Forgetting isn't a bug filed for later — it's a scheduled stage with its own visible events.

## Recall is a budget, not a dump

Before each response, Reverie assembles a memory pack under a fixed token budget. A measured semantic-relevance floor removes weak mid-session matches; remaining candidates are ranked on relevance, type priors, strength, and recency, then greedily packed until the budget is spent. The UI shows searched, filtered, ranked, and selected counts, retrieval latency, winner chips, selection reasons, and token cost. When the assistant leads with one impact story and asks one direct question, you can see exactly which memories earned their way into that reply.

## Measured, not asserted

The eval harness plays identical scripted sessions through three conditions: no memory, full transcript history, and Reverie. A judge model scores how personalized each session opening is against a truth sheet; live runs write `EVALS.md`, and mock runs are labeled `real_run=false` and never become claims.

The final live run: **+3.7 personalization vs no memory with 68% fewer reply-context tokens than full history**. Reverie's openings scored 5.0 and 4.333 across sessions two and three (mean 4.7), against 1.0 for no memory and a 4.0/1.0 split (mean 2.5) for full history. It passed all six scripted retrieval checks in sessions two and three: four expected-tag checks and two stale-tag exclusion checks. Reply-context tokens across three sessions: 10,598 for Reverie vs 32,764 for full history — the full-history baseline ballooned from 2,493 tokens in session one to 19,444 by session three, while Reverie stayed nearly flat (2,498 → 4,310). The forgetting check passed: the stale question never resurfaced in a memory pack.

This was a controlled three-session workload, not a user study or production benchmark. Personalization was judged by `qwen-max` from three samples for each of two scored openings per condition. The harness, scripts, token-accounting boundary, and per-session numbers are public in the repository.

The full-history result is the interesting one. It's not just 3x more expensive — it's *worse*. By session three, the relevant facts are buried in transcript noise and its personalization collapses to 1.0. Distilled, budgeted memory beats total recall on both axes.

## Zero domain knowledge

The core memory algorithms contain zero demo-domain knowledge. Every Lena-specific string lives in one subject file and the eval scripts; a purity test fails the build if commerce vocabulary leaks into the engine. Swap that subject layer and the same engine can remember a customer across support tickets, a patient across visits, or an engineer across a codebase. The test suite includes Spanish-conjugation acceptance tests that exercise the duplicate guard outside the demo domain.

## Qwen multi-model routing on Alibaba Cloud

Reverie routes each cognitive function to the model depth it deserves, all through DashScope on Alibaba Cloud: `qwen-flash` runs the high-frequency observer pass after every turn, `qwen-plus` handles assistant conversation, `qwen-max` is reserved for slower dream consolidation and judge calls, and `text-embedding-v4` powers retrieval. The health endpoint reports every role's model ID, so a demo can prove which model served each function. The backend is FastAPI with SQLite as a materialized memory ledger plus event audit trail; the frontend is Next.js. Without an API key the whole stack falls back to a deterministic mock mode with an honest `MOCK` chip in the UI — useful for cold clones, never for claims.

## What we took away

Three convictions survived the build. Memory needs provenance, or users can't trust it. Memory needs a budget, or it quietly becomes the cost problem it was meant to solve. And memory needs to forget on purpose, or it drowns in itself. The numbers say a small, honest memory beats a giant transcript — and with the whole lifecycle visible, you don't have to take the numbers on faith.

## Alibaba Cloud deployment

Reverie was deployed on Alibaba Cloud ECS with Docker Compose, Nginx, Next.js,
FastAPI, and a persistent SQLite ledger. The instance was released after evidence
capture, so no currently live endpoint is claimed. The deployment record is in
[`docs/ALIBABA_DEPLOYMENT_PROOF.md`](./ALIBABA_DEPLOYMENT_PROOF.md), and the
original ECS Console and Workbench captures are supplied directly in the Devpost
proof field. The architecture is documented in
[`docs/ARCHITECTURE.md`](./ARCHITECTURE.md), and the source is available at
[`github.com/anujk22/Reverie`](https://github.com/anujk22/Reverie).
