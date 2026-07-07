# Reverie

![Reverie session screen](docs/screenshots/final-session-recall-desktop.png)

Reverie is a visible memory engine: extraction with provenance receipts, dream consolidation, Ebbinghaus decay, and budgeted retrieval are all watchable in real time.

The demo scenario is the hardest memory workload we could give it: one person, under pressure, returning across multiple sessions. Lena Park is migrating her store onto a new commerce platform before a sale date. She brings a misconception about webhook retries, a preference for exact values over doc links, frustration from a failed order sync, and a stale question that should fade. Reverie remembers what she got wrong, how she felt, and what she needs — and forgets what stopped mattering.

The engine contains zero domain knowledge. Swap one script file and the same engine remembers a customer across support tickets, a patient across visits, an engineer across a codebase. The test suite proves it.

Memory is the missing layer for any AI that serves the same human twice: a merchant across launch week, a patient across visits, a customer across tickets. Context windows aren't memory; they are cost. Reverie makes memory a first-class, inspectable, budgeted system. It remembers not just what the user got wrong but how they felt, and adapts.

What is inside:

- Dream cycle with schema-gated Qwen judges for distillation, duplicate/refinement checks, contradiction handling, and deterministic memory updates.
- Budgeted retrieval with visible winner chips, token usage, and excluded memories.
- Event-sourced memory with provenance-verified extraction, visible consolidation, reinforcement, decay, archive, and supersession events.
- Eval harness for no-memory, full-history, and Reverie conditions. Live runs write `EVALS.md`; mock runs stay marked `real_run=false`.

![Architecture diagram](docs/diagram.svg)

## Quickstart

```bash
cp .env.e[x]ample .env
docker compose up --build
```

Set `DASHSCOPE_API_KEY` in `.env` for live Qwen calls. Local deterministic fallback:

```bash
MOCK_LLM=true docker compose up --build
```

The UI shows a `MOCK` chip whenever the backend has no `DASHSCOPE_API_KEY`, marking the deterministic offline fallback. `GET /api/health` reports `"mock"` and the live Qwen model IDs so you can verify which mode you're in.

Frontend: http://localhost:3000<br>
Backend health: http://localhost:8000/api/health

## Useful Links

- Demo video: _(link added on submission day)_
- Eval results: [EVALS.md](./EVALS.md)
- Build log and verification: [PROGRESS.md](./PROGRESS.md)
- Architecture: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
