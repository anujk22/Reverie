# Reverie — Devpost Submission Copy

This file contains copy-paste-ready submission fields. Replace only values marked
`[PENDING_...]` before the final Devpost submission.

## Project name

Reverie

## One-line tagline

Your AI should not meet its users for the first time, every time.

## Track

Track 1 — MemoryAgent

## Repository

https://github.com/anujk22/Reverie

## Short description

Reverie is a visible, subject-agnostic memory engine for assistants that serve the
same person across sessions. It extracts typed memories with exact transcript
provenance, reconciles corrections during a dream cycle, applies deliberate
decay and forgetting, and retrieves only what fits a fixed context budget.

## Inspiration

Context windows are not memory; they are repeated cost. Replaying an entire
transcript makes each response more expensive, preserves stale facts, and can
bury the few details that should shape the next interaction. We built Reverie to
make memory a first-class, inspectable system instead of an invisible prompt
trick.

## What it does

Reverie follows a person across multiple conversations and makes the full memory
lifecycle visible. `qwen-flash` observes each exchange and proposes typed engrams.
Deterministic quote gates reject unsupported memories. SQLite stores the current
memory state, vectors, provenance links, and an append-only event audit. Between
sessions, `qwen-max` distills observations, merges duplicates, reconciles
corrections, and applies decay. Before the next response, semantic relevance,
strength, recency, and type priors rank active memories, then a greedy packer
selects only what fits a 1,200-token budget.

The Next.js interface renders each stage from backend state: new engrams light up
on the Active Map, every memory opens to its exact source quote, dream stages run
live, stale memories weaken, and the Context Budget Meter shows what was searched,
filtered, ranked, selected, and spent.

The film demo follows Lena across two interview-preparation sessions. Friday
becomes Monday, an overexplaining habit becomes an impact-first strategy, and a
preference for one direct question at a time survives into the next session.
Reverie also remembers the pressure she described and adapts without replaying
the transcript.

## How we built it

The backend is FastAPI. SQLite acts as a transactional materialized memory ledger
with an append-only audit timeline. The frontend is Next.js. Docker Compose runs
the backend, frontend, and Nginx reverse proxy. The complete stack was deployed on
Alibaba Cloud ECS in the US (Silicon Valley) region, with live Qwen Cloud access
through Alibaba Cloud Model Studio (DashScope).

Qwen model routing matches cost and depth to each cognitive function:

- `qwen-flash` — high-frequency observation and extraction
- `qwen-plus` — assistant conversation
- `qwen-max` — dream consolidation and evaluation judging
- `text-embedding-v4` — semantic retrieval

The memory algorithms contain no interview-specific knowledge. Demo vocabulary
is isolated to `backend/app/subject.py`; a purity test fails if it leaks into the
core engine.

## Challenges

The hard part was keeping memory useful without turning it into a transcript
dump. Every candidate needs evidence, model output must pass typed validation,
duplicates and contradictions need different treatment, stale facts need to
decay, and retrieval must fit a measurable budget. We also had to make every
backend capability visible enough that a viewer can verify it rather than trust a
claim.

## Accomplishments

The frozen live evaluation compares identical three-session workloads under
no-memory, full-history, and Reverie conditions. Reverie scored **4.7** on
personalization versus **1.0** with no memory and **2.5** with full history. It
passed all six scripted retrieval checks in sessions two and three: four
expected-tag checks and two stale-tag exclusion checks. Reverie used **10,598**
reply-context tokens versus **32,764** for full history, a **68% reduction**.

These are controlled synthetic workload results, not a user study or production
benchmark. Personalization was judged by `qwen-max` from three judge samples for
each of two scored openings per condition. The frozen evidence and exact
token-accounting boundary are public in `EVALS.md`.

## What we learned

Memory needs provenance to be trustworthy, a budget to control cost, and
deliberate forgetting to remain useful. Full history is not only more expensive;
in our controlled workload it became less personalized as relevant facts were
buried in transcript noise.

## What's next

Test the same engine against additional subject layers, add measured
scale-triggered vector indexing when direct cosine scan stops being sufficient,
and expose the memory controls through more host applications.

## Technologies used

Alibaba Cloud ECS, Alibaba Cloud Model Studio, Qwen Cloud, DashScope,
`qwen-flash`, `qwen-plus`, `qwen-max`, `text-embedding-v4`, Python, FastAPI,
Pydantic, SQLite, TypeScript, React, Next.js, Docker Compose, Nginx.

## Proof of Alibaba Cloud deployment

Reverie was fully deployed and running on Alibaba Cloud ECS in the US (Silicon
Valley) region on July 18, 2026. The deployment ran the FastAPI backend, Next.js
frontend, Nginx reverse proxy, persistent SQLite ledger, and live DashScope/Qwen
Cloud connectivity. The ECS instance was released after evidence capture, so no
currently live endpoint is claimed.

Direct production code showing the required Qwen Cloud base URL:

https://github.com/anujk22/Reverie/blob/main/backend/app/config.py

The file defines `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`
directly while keeping the value environment-configurable.

Repository deployment record and canonical source proof:

https://github.com/anujk22/Reverie/blob/main/docs/ALIBABA_DEPLOYMENT_PROOF.md

Attach both original screenshots directly to this Devpost field. The Workbench
evidence shows the backend, frontend, and Nginx containers running, plus database
availability, DashScope reachability, `mock: false`, and the active Qwen and
embedding model IDs. The ECS Console evidence shows the instance in Running
status in the US (Silicon Valley) region.

## Architecture explanation

The browser reaches Nginx on Alibaba Cloud ECS. Nginx routes interface traffic to
Next.js and `/api` traffic to FastAPI. FastAPI stores typed engrams, vectors,
source links, and lifecycle events in SQLite. It calls Qwen Cloud through the
international DashScope OpenAI-compatible endpoint. Observation, conversation,
dream consolidation, judging, and embeddings are separated by model role. The
architecture diagram and component contract are here:

https://github.com/anujk22/Reverie/blob/main/docs/ARCHITECTURE.md

## Testing instructions

From the repository root:

```bash
cp .env.example .env
docker compose up --build
```

Open `http://localhost:3000` and check
`http://localhost:8000/api/health`. Without a DashScope key, set
`MOCK_LLM=true` for deterministic offline inspection; the UI labels that mode
visibly. With a live key, keep `MOCK_LLM=false` and confirm health reports
`dashscope_reachable: true` and `mock: false`.

## Video description

Approximately 2 minutes 20 seconds. The video demonstrates the real application:
typed observation with provenance, correction and dream consolidation, decay and
forgetting, cross-session budgeted recall, affect-aware adaptation, frozen live
evaluation results, and Qwen model routing on Alibaba Cloud.

## Submission links

- Repository: https://github.com/anujk22/Reverie
- Alibaba deployment proof: https://github.com/anujk22/Reverie/blob/main/docs/ALIBABA_DEPLOYMENT_PROOF.md
- Direct Qwen code proof: https://github.com/anujk22/Reverie/blob/main/backend/app/config.py
- Architecture: https://github.com/anujk22/Reverie/blob/main/docs/ARCHITECTURE.md
- Frozen evaluation: https://github.com/anujk22/Reverie/blob/main/EVALS.md
- Optional published blog: `[PENDING_PUBLISHED_BLOG_URL_IF_AVAILABLE]`

## Final manual checklist

- [ ] Upload the final video publicly and paste its URL into Devpost.
- [ ] Paste the deployment-proof answer and attach both original screenshots in
      the Devpost proof field.
- [ ] Open every link above in a logged-out browser.
- [ ] Select **Track 1 — MemoryAgent**.
- [ ] Confirm the video plays at Devpost embed size and is about three minutes or
      shorter.
- [ ] Submit before July 20, 2026 at 5:00 PM EDT.
