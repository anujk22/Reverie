# Building Reverie: a memory engine you can watch think

Every AI assistant has the same embarrassing secret: it's a goldfish. You can tell it your deadline, your one recurring mistake, and exactly how you like your answers — and next session it greets you like a stranger. The workaround everyone reaches for is stuffing the entire conversation history back into the prompt. But context windows aren't memory; they are cost. You pay for every stale token on every call, quality drifts as the transcript balloons, and nothing ever gets *forgotten*.

We built Reverie for QwenHacks Track 1 (MemoryAgent) to treat memory as what it actually is: a first-class, inspectable, budgeted system. Extraction with provenance receipts, dream consolidation, Ebbinghaus decay, and budgeted retrieval are all watchable in real time.

## The hardest memory workload we could find

The demo scenario is one person, under pressure, returning across multiple sessions. Lena Park is migrating her store onto a new commerce platform before a sale date. She brings a misconception about webhook retries, a preference for exact values over doc links, frustration from a failed order sync, and a stale shipping-zone question that should fade. A useful memory engine has to remember what she got wrong, how she felt, and what she needs — and forget what stopped mattering.

## Typed, event-sourced memories with receipts

Reverie never stores vibes. After each exchange, a fast observer model extracts typed engrams — `misconception`, `mastery`, `preference`, `affect`, `goal`, `fact`, `strategy_outcome` — each with confidence, importance, and subject tags. Every candidate must cite exact quotes from the transcript; if the quote isn't actually in the conversation, the memory is rejected. Click any memory in the UI and you see its provenance: the utterances it came from and every lifecycle event since.

That lifecycle is event-sourced. Nothing is ever silently overwritten: observations, reinforcements, merges, supersessions, decay, and archival all append to a memory timeline. The frontend never invents memory state — it renders the graph from the API and animates the append-only event stream.

## Dreams: distill, dedupe, reconcile — then forget

Between sessions, Reverie dreams. The dream worker replays the session and runs three judged passes on `qwen-max`:

- **Distill** re-examines provisional memories against their evidence and confirms, revises, or rejects them.
- **Deduplicate** finds near-duplicate memories by embedding similarity, asks a judge whether they're truly the same, and merges them with reinforcement instead of letting the graph silt up.
- **Reconcile** detects contradictions — Lena *believed* webhook retries were automatic, then learned to enable them — and supersedes the older belief rather than deleting it, preserving the correction as history.

Then time does its work. Memory strength follows an Ebbinghaus-style decay curve driven by importance, access count, and time since last recall. A stale, low-importance question loses strength day by day; recalled memories are reinforced. Forgetting isn't a bug filed for later — it's a scheduled stage with its own visible events.

## Recall is a budget, not a dump

Before each response, Reverie assembles a memory pack under a fixed token budget. Candidate memories are scored on relevance, type priors for the session phase, strength, and confidence; the winners are packed until the budget is spent, and everything else is *visibly excluded* with a reason. The UI shows the winner chips under each assistant reply and a budget meter of tokens used — so when the assistant opens with "no rush, let's keep this small" because it remembered her frustration, you can see exactly which memories earned their way into that reply and what they cost.

## Measured, not asserted

The eval harness plays identical scripted sessions through three conditions: no memory, full transcript history, and Reverie. A judge model scores how personalized each session opening is against a truth sheet; live runs write `EVALS.md`, and mock runs are labeled `real_run=false` and never become claims.

The final live run: **+3.7 personalization vs no memory with 68% fewer reply-context tokens than full history**. Reverie's openings scored 5.0 and 4.333 across sessions two and three (mean 4.7), against 1.0 for no memory and a 4.0/1.0 split (mean 2.5) for full history. Recall precision on planted facts was 1.0 in both probed sessions. Reply-context tokens across three sessions: 10,598 for Reverie vs 32,764 for full history — the full-history baseline ballooned from 2,493 tokens in session one to 19,444 by session three, while Reverie stayed nearly flat (2,498 → 4,310). The forgetting check passed: the stale question never resurfaced in a memory pack.

The full-history result is the interesting one. It's not just 3x more expensive — it's *worse*. By session three, the relevant facts are buried in transcript noise and its personalization collapses to 1.0. Distilled, budgeted memory beats total recall on both axes.

## Zero domain knowledge

The engine contains zero domain knowledge. Every Lena-specific string lives in one subject file and the eval scripts; a purity test fails the build if commerce vocabulary leaks into the engine. Swap one script file and the same engine remembers a customer across support tickets, a patient across visits, an engineer across a codebase. The test suite proves it — including Spanish-conjugation acceptance tests that exercise the duplicate guard entirely outside the demo domain.

## Qwen multi-model routing on Alibaba Cloud

Reverie routes each cognitive function to the model depth it deserves, all through DashScope on Alibaba Cloud: `qwen-flash` runs the high-frequency observer pass after every turn, `qwen-plus` handles assistant conversation, `qwen-max` is reserved for slower dream consolidation and judge calls, and `text-embedding-v4` powers retrieval. The health endpoint reports every role's model ID, so a demo can prove which model served each function. The backend is FastAPI with SQLite as an event-sourced memory ledger; the frontend is Next.js. Without an API key the whole stack falls back to a deterministic mock mode with an honest `MOCK` chip in the UI — useful for cold clones, never for claims.

## What we took away

Three convictions survived the build. Memory needs provenance, or users can't trust it. Memory needs a budget, or it quietly becomes the cost problem it was meant to solve. And memory needs to forget on purpose, or it drowns in itself. The numbers say a small, honest memory beats a giant transcript — and with the whole lifecycle visible, you don't have to take the numbers on faith.
