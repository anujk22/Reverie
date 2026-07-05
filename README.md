# Reverie

Reverie is a Calculus I tutor that remembers how a student learns, dreams over the evidence between sessions, and makes the whole memory lifecycle visible.

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
