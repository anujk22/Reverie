# Reverie

Reverie is a memory engine wearing a tutoring skin. It extracts durable observations, dreams over the evidence between sessions, forgets stale memories, and recalls only the memories that fit a fixed context budget.

The engine contains zero calculus knowledge. The subject lives in two prompt surfaces: the tutor prompt and the demo scripts. The memory pipeline itself is subject-agnostic, including extraction, dreaming, forgetting, duplicate detection, and budgeted recall. The clearest proof is the Spanish-conjugation duplicate-guard test in [`backend/tests/test_dedupe.py`](./backend/tests/test_dedupe.py), which exercises the memory machinery without the demo subject.

What is inside:

- Event-sourced memory: every observed, reinforced, merged, superseded, decayed, and archived memory is an immutable event.
- Dream cycle: session memories are consolidated, deduplicated, reconciled, decayed, and reported.
- Budgeted retrieval: the working-memory pack is scored under a fixed token budget and rendered on screen.
- Visible proof: the Session, Dream, Evals, Conductor, and Architecture screens are built for the hackathon demo flow.

## Quickstart

```bash
cp .env.example .env
docker compose up --build
```

Local development without a DashScope key can use deterministic fallback mode:

```bash
MOCK_LLM=true docker compose up --build
```

Frontend: http://localhost:3000
Backend health: http://localhost:8000/api/health

## Project Status

See [PROGRESS.md](./PROGRESS.md). Live M0 DashScope/ECS discovery is blocked until credentials and an Alibaba ECS target are provided.
