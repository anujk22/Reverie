# Reverie

![Reverie session screen](docs/screenshots/final-session-recall-desktop.png)

Reverie is a memory engine wearing a tutoring skin: it observes how a learner thinks, dreams over the evidence between sessions, forgets stale memories, and recalls only what fits a fixed context budget.

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
