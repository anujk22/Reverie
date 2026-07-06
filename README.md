# Reverie

![Reverie session screen](docs/screenshots/final-session-recall-desktop.png)

Reverie is a visible memory engine: extraction with provenance receipts, dream consolidation, Ebbinghaus decay, and budgeted retrieval are all watchable in real time.

The demo scenario is the hardest memory workload we could give it: one person, learning something difficult, across multiple sessions, over weeks. Lena Park is anxious about an exam, wants worked examples, studies late after work, and asks for one small question at a time.

The engine contains zero domain knowledge. Swap one script file and the same engine remembers a customer across support tickets, a patient across visits, an engineer across a codebase. The test suite proves it.

Memory is the missing layer for any AI that serves the same human twice: a learner across weeks, a patient across visits, a customer across tickets. Context windows aren't memory; they are cost. Reverie makes memory a first-class, inspectable, budgeted system. It remembers not just what the user got wrong but how they felt, and adapts.

What is inside:

- Dream cycle with schema-gated Qwen judges for distillation, duplicate/refinement checks, contradiction handling, and deterministic memory updates.
- Budgeted retrieval with visible winner chips, token usage, and excluded memories.
- Event-sourced memory with provenance-verified extraction, visible consolidation, reinforcement, decay, archive, and supersession events.
- Eval harness for no-memory, full-history, and Reverie conditions. Live runs write `EVALS.md`; mock runs stay marked `real_run=false`.

![Architecture diagram](docs/diagram.svg)

## Quickstart

```bash
cp .env.example .env
docker compose up --build
```

Set `DASHSCOPE_API_KEY` in `.env` for live Qwen calls. Local deterministic fallback:

```bash
MOCK_LLM=true docker compose up --build
```

Frontend: http://localhost:3000<br>
Backend health: http://localhost:8000/api/health

## Useful Links

- Demo video: `<PLACEHOLDER>`
- Eval results: [EVALS.md](./EVALS.md)
- Build log and verification: [PROGRESS.md](./PROGRESS.md)
- Architecture: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
