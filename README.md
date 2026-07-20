# Reverie

![Reverie recalling interview-preparation memory across sessions](docs/screenshots/final-session-recall-desktop.png)

Reverie is a visible persistent-memory agent and subject-agnostic memory engine.
Typed extraction with provenance receipts, dream consolidation,
Ebbinghaus-style decay, and budgeted retrieval are all watchable in real time.

It is built for **Track 1 — MemoryAgent**. The engine persists user preferences
and experience across sessions, reconciles corrections, reinforces useful
memories, lets stale context fade, and recalls only what fits a fixed context
budget.

## Submission evidence

| Requirement | Evidence |
| --- | --- |
| Alibaba Cloud deployment | [ECS deployment record and deployment status](docs/ALIBABA_DEPLOYMENT_PROOF.md) |
| Qwen Cloud API usage | [Production endpoint and model routing in `backend/app/config.py`](https://github.com/anujk22/Reverie/blob/main/backend/app/config.py) |
| Architecture diagram | [System diagram](docs/diagram.svg) and [architecture notes](docs/ARCHITECTURE.md) |
| Measured memory behavior | [Frozen live evaluation](EVALS.md) and [evaluation harness](backend/app/evals/runner.py) |
| Reproducible deployment | [Alibaba Cloud ECS deployment guide](docs/DEPLOY.md) and [`deploy.sh`](deploy.sh) |

Reverie was deployed as a complete Docker Compose stack on Alibaba Cloud ECS in
the US (Silicon Valley) region. The instance was released after evidence capture;
the repository makes no claim that the historical deployment is still online.

## The problem

Context windows are not memory; they are repeated cost. Replaying an entire
transcript makes every response more expensive, preserves stale facts, and can
bury the few details that should actually shape the next interaction. Reverie
turns that hidden process into an inspectable memory lifecycle.

## What Reverie does

The film demo follows Lena across two interview-preparation sessions. Friday
becomes Monday, an overexplaining habit becomes an impact-first strategy, and a
preference for one direct question at a time survives into the next session.
Reverie also remembers the pressure she described and adapts the next response
without replaying her transcript.

The core memory pipeline is subject-agnostic. Demo vocabulary is isolated to
[`backend/app/subject.py`](backend/app/subject.py) and evaluation scripts, and
[`backend/tests/test_engine_purity.py`](backend/tests/test_engine_purity.py)
enforces that boundary.

## Memory lifecycle

1. `qwen-flash` observes an exchange and proposes typed memories.
2. Quote gates reject memories without substantive evidence in the transcript.
3. SQLite persists engrams, vectors, source links, and an append-only event audit.
4. `qwen-max` distills, deduplicates, and reconciles memories during the dream cycle.
5. Reinforcement and Ebbinghaus-style decay change memory strength over time.
6. Semantic relevance, strength, recency, and type priors rank active memories.
7. Greedy packing selects only memories that fit the 1,200-token context budget.
8. The frontend renders the backend graph, provenance, lifecycle events, and token usage.

![Architecture diagram](docs/diagram.svg)

Implementation details are documented in
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Qwen Cloud integration

All model roles use the DashScope OpenAI-compatible API at
`https://dashscope-intl.aliyuncs.com/compatible-mode/v1`:

- `qwen-plus` — assistant responses
- `qwen-flash` — observation and extraction
- `qwen-max` — dream consolidation and evaluation judging
- `text-embedding-v4` — embeddings and retrieval

The endpoint and model IDs are defined in
[backend/app/config.py](backend/app/config.py); the `AsyncOpenAI` client is
initialized with the environment-provided key and base URL in
[backend/app/llm.py](backend/app/llm.py).

Reverie was deployed on Alibaba Cloud ECS for submission evidence capture. That
instance has since been released, so this repository does not claim a currently
live public endpoint. The [deployment record](docs/ALIBABA_DEPLOYMENT_PROOF.md)
identifies the production integration and historical topology. Original ECS
Console and Workbench captures are supplied directly in the Devpost proof field,
and the reproducible procedure remains in [docs/DEPLOY.md](docs/DEPLOY.md).

## Evaluation

The frozen live evaluation compares identical three-session scripts under
no-memory, full-history, and Reverie conditions:

| Result | No memory | Full history | Reverie |
| --- | ---: | ---: | ---: |
| Personalization mean | 1.0 | 2.5 | **4.7** |
| Reply-path tokens | 7,271 | 32,764 | **10,598** |

Reverie used **68% fewer reply-path tokens than full history**. It also passed
all six scripted retrieval checks in sessions 2–3: four expected-tag checks and
two stale-tag exclusion checks. Personalization was judged by `qwen-max` from
three judge samples for each of two scored openings per condition.

These are controlled, synthetic workload results—not a user study or a
production benchmark. The raw numbers, token-accounting boundary, and per-session
scores are in [EVALS.md](EVALS.md); the harness is in
[backend/app/evals/runner.py](backend/app/evals/runner.py).

## Quickstart

```bash
cp .env.example .env
docker compose up --build
```

Open the frontend at <http://localhost:3000> and backend health at
<http://localhost:8000/api/health>.

For live Qwen calls, set `DASHSCOPE_API_KEY` in `.env` and keep
`MOCK_LLM=false`. For deterministic offline use:

```bash
MOCK_LLM=true docker compose up --build
```

The interface always shows a `MOCK` chip when live Qwen is unavailable, and
`GET /api/health` reports the mode and configured model IDs.

## Verification

Backend:

```bash
python3.11 -m venv backend/.venv311
backend/.venv311/bin/pip install -r backend/requirements.txt
backend/.venv311/bin/python -m compileall -q backend/app backend/tests
backend/.venv311/bin/pytest backend/tests
```

Frontend:

```bash
cd frontend
npm ci
npm run lint
npm run typecheck
npm run build
```

Repository and containers:

```bash
docker compose config --quiet
docker compose build
```

## License

[MIT](LICENSE)
