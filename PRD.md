REVERIE — Product Requirements Document
The tutor that dreams about you between sessions
Hackathon: Global AI Hackathon Series with Qwen Cloud (Devpost / Alibaba Cloud) Track: Track 1 — MemoryAgent Deadline: July 9, 2026, 5:00 PM EDT One-liner: An AI tutor with a real memory architecture — it observes how a student learns, consolidates those observations into structured, inspectable memories while they're gone ("dreaming"), and opens the next session already knowing their weak spots. Every part of the memory lifecycle is visible on screen. Author: Fable 5 (lead architect). Executor: Codex (100% of code). Owner: Saf.

§0 — EXECUTION PROTOCOL (Codex: read this before anything else)
You are executing this PRD end to end. Zero lines of code will be written by a human. This document is deliberately exhaustive — you should not need to make a single product, design, or architecture assumption. Where a genuine unknown exists (e.g., which models the provided API key can access), this PRD gives you a discovery procedure and a fallback chain instead of an assumption.
0.1 The Prime Directive
The previous project by this team failed with a working backend because the intelligence was invisible — a correct engine behind a dead dashboard. Therefore the single most important law of this build:
EVERY BACKEND CAPABILITY MUST HAVE A PIXEL. If the system does something clever and the UI does not show it happening, the feature does not exist. When you must trade backend sophistication against visible feedback, visible feedback wins. The demo is the product.
§5.9 contains the capability→pixel mapping table. It is a contract. Do not ship a capability whose pixel is missing.
0.2 PROGRESS.md protocol (mandatory)
Create PROGRESS.md at repo root in your first commit and update it after completing each milestone and whenever you make a non-trivial decision or hit a blocker. Saf will periodically paste this file back to Fable (the architect) for audit, so write it for an external reviewer. Required structure:
# Reverie — Build Progress
## Environment Report        <- filled during M0, see §3
## Milestone Status          <- table: M0..M8, status (todo/in-progress/done/blocked), date, notes
## Decisions Log             <- numbered; what you chose, why, what the PRD said
## Deviations from PRD       <- anything you could not do as written + your workaround
## Blockers & Questions      <- anything requiring Saf or Fable input
## Demo Readiness Checklist  <- copy from §17, check items off as they become true
0.3 Build order is law
Milestones (§14) must be executed in order. M0 (environment + deployment skeleton) comes first because Alibaba Cloud deployment proof is a disqualification requirement and this team has never deployed there. Do not touch the constellation until a stub is live on ECS.
0.4 Self-review requirement (frontend)
After every frontend milestone, render the app and inspect screenshots of every screen at 1440×900 and 390×844. Compare against the design system in §9 and the banned-patterns list in §9.8. If any screen would be described as "a dashboard with buttons and text," it has failed; iterate before marking the milestone done. Note screenshot review results in PROGRESS.md.
0.5 Questions you must answer during M0 (write answers in PROGRESS.md → Environment Report)
You will be given a live DashScope/Alibaba Cloud API key via environment variable. Discover and record:
    1    Model inventory: GET {DASHSCOPE_BASE}/models — full list the key can access.
    2    Chat model: confirm access to qwen-plus (preferred) via a 1-token test completion; record latency. Fallback chain: qwen-plus → qwen-max → qwen-turbo → newest available qwen3-*-instruct.
    3    Embeddings: confirm text-embedding-v4 (preferred, record its dimension) else text-embedding-v3. Record actual vector dimension — the DB schema depends on it (§6).
    4    Vision: is any qwen-vl-* / qwen3-vl-* model accessible? (yes/no + model id). This gates the stretch feature in §4.6. Do not build the stretch feature until core milestones M0–M7 are done.
    5    Rate limits / quota: record any rate-limit headers or documented QPM/TPM limits encountered; note the ~1M-token-per-model quota and estimate demo + eval consumption (§10.6 has the budget).
    6    Endpoint: confirm which base URL works with the key: https://dashscope-intl.aliyuncs.com/compatible-mode/v1 (international) or https://dashscope.aliyuncs.com/compatible-mode/v1 (mainland). Use the OpenAI-compatible mode exclusively.
    7    ECS: record region, instance type, and public IP of the deployment target once provisioned (§12).

§1 — MISSION & RUBRIC MAPPING
1.1 What wins Track 1
The track asks for: persistent memory, experience accumulation, preference recall, cross-session improvement, efficient store/retrieve, forgetting outdated information, and recall of critical memories within limited context windows. Most entries will be a chatbot + vector DB + a decay function, invisible to the judge. Reverie wins by making the entire memory lifecycle a visible, animated, inspectable object and by proving improvement with a replay eval against two baselines.
1.2 Rubric → feature mapping (build priorities flow from this)
Rubric axis
Weight
What in Reverie earns it
Innovation & AI Creativity
30%
Dream consolidation cycle (extraction→dedupe→contradiction→decay) as a real background worker; budgeted retrieval as a selection algorithm; event-sourced memory enabling truthful live animation; multi-model Qwen orchestration (chat + embeddings + judge)
Technical Depth & Engineering
30%
Four-tier memory architecture; append-only event log with projections; typed engram schema with provenance; deterministic decay math; SSE-driven real-time UI; clean FastAPI service boundaries; eval harness
Problem Value & Impact
25%
Every AI tutor today has amnesia; personalization is the unsolved problem in AI edtech. Authentic founder story (Saf co-founded a tutoring business). Memory engine is cleanly extractable as an open-source layer
Presentation & Documentation
15%
The constellation IS the architecture diagram, live; 3-minute demo choreographed in §11; architecture docs in §13
1.3 Submission requirements this PRD must satisfy (disqualification traps)
    •    Public open-source repo, license included (MIT), all source + assets + setup instructions.
    •    Backend running on Alibaba Cloud + a short screen recording proving deployment (separate from the demo video) and/or a linked code file showing Alibaba Cloud API usage. Both will be produced (§12.5).
    •    Architecture diagram (Mermaid source in §13.4; export as PNG for Devpost).
    •    Public demo video ≤ 3 minutes (§11).
    •    Text description + track identification (§13.5 gives the skeleton).
    •    Optional blog post for bonus prize (Saf writes; §13.6 lists the technical beats to feed him).

§2 — HARD LAWS (non-negotiable, violating any defeats the project)
    1    Every backend capability has a pixel (§0.1). The mapping table in §5.9 is a contract.
    2    The LLM proposes; deterministic code disposes. LLMs extract candidate memories, judge similarity/contradiction, and generate tutoring text. The decisions of what is stored, merged, superseded, decayed, and retrieved are made by deterministic, unit-tested code operating on typed structures. No code path where raw model text directly mutates memory state without passing schema validation.
    3    Memory is event-sourced. Every memory mutation is an immutable event in an append-only log; the engram table is a projection. The UI animates from the event stream — the constellation animation must be a true rendering of real events, never theater.
    4    Every engram carries provenance. Any memory can be traced to the exact utterances that spawned it, in two clicks in the UI.
    5    Structured, never sludge. No memory is ever stored as free text appended to a prompt. Engrams are typed, scored, schema-validated JSON.
    6    Deployment before decoration. A stub must be live on Alibaba ECS (M0) before any visual work begins.
    7    The demo is reproducible. The entire 3-minute demo runs from seeded scripts in /demo with a deterministic clock (§11). A judge cloning the repo can replay it.
    8    One domain, deep. Reverie tutors Calculus I differentiation (chain rule vs product rule confusion as the hero misconception). Do not generalize to "any subject" in code. The memory engine is subject-agnostic by design, but the shipped product, seed data, prompts, and demo are calculus.
    9    No secrets in the repo. API keys via environment only; .env.example with placeholders; verify with a pre-commit grep before every push.

§3 — ENVIRONMENT & PLATFORM
3.1 Stack (fixed — do not substitute)
Layer
Choice
Why
Frontend
Next.js 14+ (App Router), TypeScript, Tailwind CSS, Framer Motion
Codex one-shot reliability; motion quality
Constellation
HTML5 Canvas + d3-force for layout physics (render loop is custom canvas, d3 only computes positions)
Full visual control, no heavy graph-lib look
Charts (eval)
Recharts
Reliable, styleable
Backend
Python 3.11, FastAPI, Uvicorn
Async, SSE support, Codex reliability
DB
SQLite + sqlite-vec extension (vector search)
Zero infra to break; deliberately boring persistence is defensible engineering
LLM/API
DashScope OpenAI-compatible mode; openai Python SDK pointed at DashScope base URL
Simplest correct integration
Jobs
In-process asyncio background worker (the "dream worker") + manual trigger endpoint
No Celery/Redis — unnecessary risk
Realtime
Server-Sent Events (SSE) from FastAPI → frontend
Simpler than websockets, sufficient (server→client only)
Deploy
Docker Compose (frontend + backend + volume) on one Alibaba ECS instance, Nginx reverse proxy, HTTPS optional (IP + port acceptable for judging)
Minimal surface
3.2 Model routing (after M0 discovery; defaults below)
Job
Model
Params
Tutor conversation
qwen-plus
temp 0.7, streaming on
Memory extraction (observer)
qwen-plus
temp 0.1, JSON mode / strict schema prompt
Consolidation judge (dup/contradiction)
qwen-plus
temp 0.0
Eval personalization judge
qwen-max (fallback qwen-plus)
temp 0.0, fixed rubric
Embeddings
text-embedding-v4 (fallback v3)
record dimension
(Stretch, gated) handwriting photo
discovered qwen-vl-*
§4.6
All model IDs live in backend/app/config.py as env-overridable constants. Every LLM call goes through one llm.pyclient module with: retries (3, exponential backoff), timeout (60s), token accounting (log prompt/completion tokens per call into llm_calls table — the eval dashboard reads this), and structured-output validation (Pydantic; on parse failure, one repair attempt with the validation error appended, then discard + log).
3.3 Configuration
.env (backend): DASHSCOPE_API_KEY, DASHSCOPE_BASE_URL, CHAT_MODEL, EMBED_MODEL, JUDGE_MODEL, DB_PATH, DEMO_MODE=true|false, CLOCK_OFFSET_SECONDS (see §11.4).

§4 — PRODUCT OVERVIEW
4.1 Cast
    •    Student (demo persona): Maya Chen, Calc I student. Hero misconception: treats the chain rule as the product rule — differentiates f(g(x)) as f'(x)·g'(x). Secondary traits seeded across sessions: learns best from worked examples before abstract rules; anxious about exams; strong on power rule; weak on recognizing composite functions; prefers being asked guiding questions over being given answers.
    •    Reverie: the tutor agent. Warm, precise, Socratic-leaning. Never gushes. Opens sessions by using memory, not by reciting it robotically.
4.2 The product in one paragraph
A split-screen tutoring app. Left: the conversation. Right: the Constellation — a live map of everything Reverie knows about this student, where memories form, glow, connect, strengthen, fade, and get overwritten in real time as the conversation happens and as the dream cycle runs between sessions. Below the surface: a four-tier memory engine (§5). Around it: a Memory Inspector (click any star → full detail + provenance), a Dream view (watch consolidation run), and an Eval dashboard (proof of improvement vs baselines).
4.3 Screens (full specs in §9)
    1    Session — conversation + live constellation + context budget meter.
    2    Dream — the consolidation cycle, visualized as it runs.
    3    Memory Inspector — drawer/panel: engram detail, provenance trail, lifecycle history.
    4    Evals — three-way baseline comparison, metric charts, token costs.
    5    Conductor (hidden route /conductor, demo-only) — buttons that drive the choreographed demo (§11.3).
4.4 Core user flows
    •    F1 Tutoring turn: student sends message → tutor streams reply → in parallel, the Observer extracts candidate engrams from the exchange → validated candidates are written as engram.observed events → constellation shows new faint stars within ~2s of the exchange.
    •    F2 Session end → Dream: ending a session enqueues a dream cycle → Dream view (or a compact "dreaming" indicator) shows each consolidation stage → constellation updates (merges, contradictions resolved, decay applied).
    •    F3 Session open with memory: new session → budgeted retrieval assembles the memory pack → context budget meter shows which engrams won slots and why → tutor's opening message visibly uses them.
    •    F4 Inspect: click any node → Inspector opens with type, content, confidence, strength, access history, provenance quotes, lifecycle timeline.
    •    F5 Prove: Evals screen runs/replays the scripted eval (§10) → charts render.
4.5 What Reverie remembers (engram taxonomy — exhaustive; do not add types)
Type
Example content
Tier
misconception
"Applies product rule to composite functions f(g(x))"
semantic
mastery
"Reliably applies power rule, incl. negative exponents"
semantic
preference
"Wants worked examples before abstract statements"
procedural
affect
"Anxiety spikes around exam mentions; respond by concretizing next step"
procedural
goal
"Midterm on July 18 covering differentiation"
semantic
fact
"Is a first-year engineering student"
semantic
strategy_outcome
"Guiding-question approach on 2026-07-04 led to unaided correct solution"
procedural
4.6 Stretch feature (GATED — build only after M7, only if VL model confirmed in M0)
Photo of handwritten work → engrams. Upload photo in Session → VL model transcribes and identifies the error → error becomes a misconception engram with the photo as provenance. One upload button, one result card, nothing more. If VL is unavailable or time is short, skip without redesign — nothing else depends on it.

§5 — MEMORY ARCHITECTURE (the core)
5.1 Four tiers
    1    Working memory — the assembled context for the current LLM call (memory pack + recent turns). Ephemeral; never persisted as memory. Its size is the context budget and it is visualized (§9.4.3).
    2    Episodic memory — raw, immutable record of everything that happened: every utterance, every event, per session. Table: episodes, utterances.
    3    Semantic memory — extracted, typed, deduplicated knowledge about the student: engrams of types misconception|mastery|goal|fact.
    4    Procedural memory — learned how-to-teach-this-student rules: engrams of types preference|affect|strategy_outcome. Injected into the tutor system prompt as structured directives (§8.1), never as raw chat history.
5.2 The engram (canonical schema)
{
  "id": "eng_01J...",             // ULID
  "type": "misconception",
  "content": "Applies the product rule to composite functions f(g(x)), differentiating as f'(x)·g'(x).",
  "subject_tags": ["chain_rule", "composite_functions"],
  "confidence": 0.72,              // extractor's belief this is true of the student, 0..1
  "importance": 0.9,               // type-prior × extractor signal, 0..1 (misconception/goal high)
  "strength": 0.83,                // computed, decays over time, boosted by access (§5.5)
  "status": "active",              // active | superseded | archived
  "superseded_by": null,
  "source_utterance_ids": ["utt_...", "utt_..."],   // provenance, ≥1 required
  "created_at": "...", "last_accessed_at": "...", "access_count": 3,
  "embedding": [/* dim from M0 */]
}
Pydantic-validated on every write. Invalid extractor output never touches the DB (§3.2 repair-then-discard).
5.3 Event sourcing (Law 3)
Append-only memory_events table; engrams is a projection. Event types (exhaustive): engram.observed (new candidate written live during session), engram.consolidated (survived dream processing), engram.merged (dup folded in; strength boosted), engram.superseded (contradiction resolved; old→superseded, points to winner), engram.reinforced(accessed in retrieval; strength boost), engram.decayed (strength recomputed downward in dream), engram.archived(strength < 0.05 floor). Every event: {id, engram_id, event_type, payload_json, session_id?, created_at}. The SSE stream (§7.4) broadcasts each event as it commits; the constellation animates from this stream and from replaying the log on load. This is what makes the animation true.
5.4 The Observer (live extraction during sessions)
After each student↔tutor exchange completes, run extraction (§8.2) over the last exchange plus a 6-turn window. Output: 0–3 candidate engrams. Deterministic pipeline then: validate schema → embed content → nearest-neighbor check against active engrams (cosine > 0.92 ⇒ treat as re-observation: emit engram.reinforced on the existing engram instead of creating a duplicate) → else write engram with status active but flagged provisional: true in payload (rendered as a faint star) → emit engram.observed. Provisional engrams become solid only by surviving a dream cycle. Extraction runs as an asyncio task so it never blocks the tutor's streamed reply.
5.5 Decay & reinforcement math (deterministic, unit-tested)
Let Δt = days since last_accessed_at (using the app clock, §11.4), n = access_count.
λ_eff     = λ_base / (1 + ln(1 + n))          # spaced-repetition: reuse slows forgetting; λ_base = 0.35
strength  = clamp( importance × exp(−λ_eff × Δt), 0, 1 )
On engram.reinforced: access_count += 1, last_accessed_at = now (so strength snaps back up on next compute). Recompute strengths for all active engrams at every dream cycle; emit engram.decayed only when strength drops ≥ 0.05 since last computed value (avoids event spam). strength < 0.05 for a non-goal engram ⇒ engram.archived (fades out of the constellation into a dim "archive belt" ring, §9.4.2 — forgetting must be visible, per the track brief). Constants live in config.py; unit tests pin the curve (given importance 0.9, n=0, strength ≈ 0.63 after 1 day, ≈ 0.31 after 3 days).
5.6 The Dream Cycle (consolidation — the signature innovation)
Triggered on session end (and manually from Conductor). Stages, run in order, each emitting events the Dream view renders live:
    1    Replay — load all provisional engrams + episodic utterances from the ended session.
    2    Distill — consolidation prompt (§8.3) re-examines each provisional engram against its source utterances: confirm (adjust confidence), revise content (tighter phrasing), or reject (hallucinated/unsupported ⇒ delete provisional, log event). Also proposes session-level engrams the per-turn observer missed (e.g., a strategy_outcome visible only across the whole arc).
    3    Deduplicate — pairwise cosine among active engrams of same type; pairs > 0.88 go to the judge (§8.4) with verdicts duplicate|refinement|distinct. duplicate ⇒ merge (keep better-phrased content, sum access counts, max confidence) ⇒ engram.merged. refinement ⇒ new supersedes old ⇒ engram.superseded.
    4    Reconcile — cross-type contradiction check: for each misconception, retrieve similar mastery engrams (and vice versa); judge verdict contradiction|coexist. Contradiction resolution is deterministic: newer evidence + confidence ≥ 0.6 wins; loser superseded. (This is the demo's emotional payoff: Session-2 mastery of the chain rule visibly overwrites the Session-1 misconception.)
    5    Decay pass — §5.5 recompute + archive sweep.
    6    Summarize — write a dream_reports row: counts per stage, tokens used, duration; rendered as the Dream Report card.
Entire cycle for a demo-sized session must finish < 45s. All LLM stages have per-item try/except: one failure skips that item, never aborts the cycle.
5.7 Budgeted retrieval (context assembly under a token budget)
On session open (and refreshed each turn), assemble the memory pack under CONTEXT_BUDGET_TOKENS = 1200 (env-tunable):
score(e) = 0.40·cos_sim(e, query) + 0.30·strength(e) + 0.15·recency_norm(e) + 0.15·type_prior(e | phase)
    •    query = embedding of (current student message, or at session open: student's goal engrams + last session's dream summary).
    •    type_prior(phase): session open favors goal, misconception, preference; mid-session favors misconception, mastery matched to the current problem.
    •    Selection: score-desc greedy knapsack by token length (tiktoken-approx), with quotas — ≥1 preference and ≥1 goal if any exist (prevents pure-similarity tunnel vision).
    •    Every selected engram ⇒ engram.reinforced event (retrieval is rehearsal — one mechanism, two rubric lines).
    •    The full assembly result — winners with their score breakdowns, and the near-misses with reasons — is returned to the frontend and rendered as the Context Budget Meter (§9.4.3). Losing engrams' reasons matter: "excluded: budget exhausted (needed 91 tokens, 40 left)".
5.8 Memory-informed tutoring
The tutor system prompt (§8.1) receives the memory pack as structured blocks: procedural engrams become directives("Prefer worked examples before abstract rules"), semantic engrams become student model lines with confidence annotations. The prompt instructs the tutor to act on memory naturally and to reference a specific past struggle at most once per session opening ("Last time, f(g(x)) tripped you up — want to start there?") — used memory must be perceptible to a judge watching the video, without being robotic.
5.9 Capability → Pixel contract (Law 1)
Backend capability
Its pixel (must exist)
Observer extracts engram live
New faint star materializes in constellation ≤2s after exchange, with a one-line toast naming it
Provisional → consolidated
Star solidifies (opacity/scale up) during Dream
Dedup merge
Two stars drift together and fuse; brief flash
Contradiction resolution
Losing star flashes ember-red, desaturates, shrinks; a strand links it to its successor
Decay
Stars visibly dim between sessions (time-skip makes this dramatic, §11.4)
Archive (forgetting)
Star drifts to the dim outer "archive belt" ring
Reinforcement
Star pulses + brightens when retrieved
Budgeted retrieval
Context Budget Meter: token bar filling, winner chips with score breakdown, excluded list with reasons
Provenance
Inspector: exact quoted utterances, click → scrolls conversation to that message (when in same session)
Dream pipeline stages
Dream view: stage checklist progressing live with per-stage counts
Token accounting
Evals screen: cost per session per condition
Eval improvement
Charts: Reverie vs two baselines across 3 sessions

§6 — DATA MODEL (SQLite + sqlite-vec)
One file DB at DB_PATH (volume-mounted in Docker). WAL mode on. Migrations: plain numbered SQL files in backend/migrations/, applied by a tiny runner at startup (no Alembic).
-- students: single-row for demo, but modeled properly
CREATE TABLE students (id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at TEXT NOT NULL);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY, student_id TEXT NOT NULL REFERENCES students(id),
  started_at TEXT NOT NULL, ended_at TEXT,
  title TEXT,                      -- e.g. "Session 1 — derivatives intro"
  dream_completed INTEGER DEFAULT 0
);

CREATE TABLE utterances (
  id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES sessions(id),
  role TEXT NOT NULL CHECK(role IN ('student','tutor')),
  content TEXT NOT NULL, created_at TEXT NOT NULL, seq INTEGER NOT NULL
);

CREATE TABLE engrams (
  id TEXT PRIMARY KEY, student_id TEXT NOT NULL REFERENCES students(id),
  type TEXT NOT NULL CHECK(type IN ('misconception','mastery','preference','affect','goal','fact','strategy_outcome')),
  content TEXT NOT NULL,
  subject_tags TEXT NOT NULL DEFAULT '[]',      -- JSON array
  confidence REAL NOT NULL, importance REAL NOT NULL, strength REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','superseded','archived')),
  provisional INTEGER NOT NULL DEFAULT 1,
  superseded_by TEXT REFERENCES engrams(id),
  created_at TEXT NOT NULL, last_accessed_at TEXT NOT NULL, access_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE engram_sources (           -- provenance, many-to-many
  engram_id TEXT NOT NULL REFERENCES engrams(id),
  utterance_id TEXT NOT NULL REFERENCES utterances(id),
  PRIMARY KEY (engram_id, utterance_id)
);

CREATE TABLE memory_events (
  id TEXT PRIMARY KEY, engram_id TEXT REFERENCES engrams(id),
  event_type TEXT NOT NULL, payload_json TEXT NOT NULL DEFAULT '{}',
  session_id TEXT, created_at TEXT NOT NULL
);
CREATE INDEX idx_events_created ON memory_events(created_at);

CREATE TABLE dream_reports (
  id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES sessions(id),
  started_at TEXT NOT NULL, finished_at TEXT,
  stats_json TEXT NOT NULL DEFAULT '{}'          -- per-stage counts, tokens, duration
);

CREATE TABLE llm_calls (
  id TEXT PRIMARY KEY, purpose TEXT NOT NULL,    -- tutor|observer|consolidate|judge|eval_judge|embed
  model TEXT NOT NULL, prompt_tokens INTEGER, completion_tokens INTEGER,
  latency_ms INTEGER, session_id TEXT, created_at TEXT NOT NULL, error TEXT
);

CREATE TABLE app_state (key TEXT PRIMARY KEY, value TEXT NOT NULL);  -- clock_offset_seconds, demo flags

-- sqlite-vec virtual table; dimension set at migration time from M0 discovery
CREATE VIRTUAL TABLE engram_vectors USING vec0(engram_id TEXT PRIMARY KEY, embedding float[{EMBED_DIM}]);
If sqlite-vec install fails on the ECS image for any reason: fallback is a vectors BLOB column + brute-force cosine in NumPy (fine at demo scale, <500 engrams). Record the choice in PROGRESS.md.

§7 — BACKEND SPEC (FastAPI)
7.1 Module layout
backend/
  app/
    main.py            # FastAPI app, CORS, SSE, startup migrations
    config.py          # env, constants (λ_base, budget, thresholds, model ids)
    llm.py             # single DashScope client: chat/stream/embed/judge + retries + token logging
    models.py          # Pydantic schemas (Engram, Event, MemoryPack, ...)
    db.py              # sqlite connection, migrations runner, event append + SSE broadcast hook
    memory/
      observer.py      # §5.4
      dream.py         # §5.6 pipeline
      decay.py         # §5.5 pure functions (unit-tested)
      retrieval.py     # §5.7 scoring + knapsack (unit-tested)
    tutor.py           # prompt assembly (§8.1) + streaming chat
    evals/
      runner.py        # §10
      scripts/         # scripted sessions JSON
    routes/
      sessions.py chat.py memory.py dream.py evals.py conductor.py
  migrations/  tests/  Dockerfile  requirements.txt
7.2 API surface (all JSON; errors as {error: {code, message}} with proper status codes)
POST /api/sessions                    -> create session (auto title "Session N — ...")
POST /api/sessions/{id}/end           -> ends session, enqueues dream, returns dream_report id
POST /api/sessions/{id}/chat          -> {message} -> SSE/chunked stream of tutor reply;
                                         side effects: utterances persisted, observer task spawned,
                                         memory pack (with budget breakdown) included as a
                                         'memory_pack' SSE event before the first token
GET  /api/memory/graph                -> full constellation state: active+superseded+archived engrams
                                         (id, type, content, strength, status, links) — initial render
GET  /api/memory/engrams/{id}         -> full engram + provenance quotes + lifecycle events
GET  /api/memory/events?after=<ts>    -> event log page (replay/scrubbing)
POST /api/dream/run                   -> manual trigger (Conductor); idempotent per session
GET  /api/dream/reports/{id}          -> stage-by-stage report
GET  /api/events/stream               -> SSE: memory events + dream stage events + toasts
POST /api/conductor/*                 -> §11.3 (guarded by DEMO_MODE=true)
POST /api/evals/run                   -> run eval suite (async); GET /api/evals/results -> JSON for charts
GET  /api/health                      -> {ok, db, dashscope_reachable, model_ids}   # deployment proof shot
7.3 Chat turn sequence (F1, precise)
    1    Persist student utterance. 2. Run retrieval (§5.7) → memory pack; emit pack over SSE. 3. Assemble prompt (§8.1); stream tutor reply token-by-token; persist tutor utterance on completion. 4. Spawn observer task (§5.4); its events flow over SSE as they commit. 5. Log tokens.
7.4 SSE event envelope
{"kind":"memory_event","event_type":"engram.observed","engram":{...},"toast":"Noticed: confuses chain rule with product rule","at":"..."}
{"kind":"dream_stage","stage":"reconcile","status":"running","counts":{...}}
{"kind":"memory_pack","budget":1200,"used":1054,"winners":[{"engram_id":"...","score":0.81,"breakdown":{"sim":0.4,...},"tokens":88}],"excluded":[{"engram_id":"...","reason":"budget exhausted"}]}
7.5 Error handling standard
Every LLM call: retry ×3 w/ backoff, then degrade gracefully — tutor falls back to memory-less reply with a visible (subtle) "memory offline" chip rather than 500ing; observer/dream failures skip the item and log. The demo must never hard-crash on a transient API error.

§8 — PROMPTS (full text; keep verbatim modulo whitespace, iterate only if outputs fail validation)
8.1 Tutor system prompt (assembled per turn)
You are Reverie, a private tutor for Calculus I. You are warm, precise, and Socratic:
you prefer asking one guiding question over giving the answer, but you never withhold
help when the student is stuck twice on the same point. You keep replies under 120
words unless working a full example. Use plain LaTeX-free notation (write f(g(x)),
x^2, not \frac).

You have long-term memory of this student. Act on it naturally — like a human tutor
who simply remembers — do not recite it or say "my memory says".

TEACHING DIRECTIVES (from procedural memory — follow these):
{procedural_block e.g. "- Show a worked example before stating an abstract rule. (confidence 0.8)"}

STUDENT MODEL (from semantic memory — believed true with stated confidence):
{semantic_block e.g. "- MISCONCEPTION (0.72): applies product rule to composite functions f(g(x))."}

SESSION CONTEXT:
{goal_block; session number; today's date per app clock}

At the start of a session (first reply only), you may reference at most ONE specific
past struggle or win, concretely and briefly, to orient the session.
8.2 Observer extraction prompt
You watch a tutoring exchange and extract durable observations about the STUDENT.
Return STRICT JSON: {"engrams":[{"type":"...","content":"...","subject_tags":[".."],
"confidence":0.0,"importance":0.0,"source_quotes":["exact substring from transcript", ...]}]}
Rules:
- 0 to 3 engrams. Return {"engrams":[]} if nothing durable was revealed. Most turns reveal nothing.
- type ∈ misconception|mastery|preference|affect|goal|fact|strategy_outcome.
- content: one sentence, third person, specific and testable. Bad: "struggles with calculus".
  Good: "Differentiates f(g(x)) as f'(x)·g'(x), applying the product rule pattern to compositions."
- Only claims supported by the transcript. Every engram MUST include at least one exact source quote.
- confidence: how sure the transcript supports this. importance: how much a tutor should care
  (misconceptions and goals high; incidental facts low).
TRANSCRIPT (most recent exchange last):
{window}
Deterministic post-check: every source_quotes entry must be a real substring of the window (fuzzy match ≥ 0.9 via difflib); engram rejected otherwise. Quotes map to utterance ids for provenance.
8.3 Dream distillation prompt (per provisional engram)
You are consolidating a tutoring session into long-term memory. Given a candidate memory
and the exact transcript excerpts it came from, return STRICT JSON:
{"verdict":"confirm|revise|reject","content":"(final one-sentence content if confirm/revise)",
 "confidence":0.0,"reason":"one short sentence"}
- reject if the excerpts do not actually support the claim.
- revise to make content tighter/more precise; never broader than evidence.
CANDIDATE: {engram}
EXCERPTS: {quotes}
Plus one session-level pass: same JSON contract, input = full session transcript + list of already-extracted engrams, asked only for strategy_outcome/affect patterns visible across the arc, max 2.
8.4 Judge prompt (dedup & contradiction)
Compare two memories about the same student. Return STRICT JSON:
{"verdict":"duplicate|refinement|contradiction|distinct","reason":"one sentence"}
- duplicate: same claim in different words.
- refinement: B is a strictly more precise/updated version of A.
- contradiction: they cannot both be true of the student now.
- distinct: different claims that can coexist.
A: {engram_a}   B: {engram_b}
8.5 Eval personalization judge (§10)
Score 1-5 how well this tutor OPENING message demonstrates specific knowledge of this
student (their known misconception, goal, and learning preference), while sounding natural.
5 = references a specific prior struggle or preference accurately and naturally.
3 = generic but subject-appropriate. 1 = could be sent to any student.
Return STRICT JSON {"score":N,"reason":"..."}.
STUDENT GROUND TRUTH: {truth_sheet}   TUTOR OPENING: {message}

§9 — FRONTEND & DESIGN SYSTEM (execute exactly; no substitutions)
9.1 Aesthetic thesis
A quiet observatory at night. Reverie watches a mind and maps it like a night sky. The interface is dark, still, and precise; the only living, luminous thing is the memory itself. All boldness is spent on ONE signature element — the Constellation — and everything around it is disciplined, editorial, and typographically confident. If a screen looks like "a dashboard with buttons," it has failed (§0.4).
9.2 Design tokens (Tailwind config; derive everything from these)
Color
Token
Hex
Use
void
#070B14
app background
field
#0D1424
panels, cards
field-2
#131C31
raised surfaces, hover
hairline
#1E2A44
1px borders only — never heavier
starlight
#E9EDF6
primary text
dim
#8A94AD
secondary text, labels
faint
#4A5674
tertiary, disabled, archive belt
ember-amber
#E8A33D
THE accent: semantic memory, glow, primary actions
amber-glow
#FFD9A0
node cores, pulse highlights
sage-teal
#3FBFAD
mastery engrams, success states
coral
#E5534B
misconception engrams, contradiction flash
moth
#B9A7E8 — restricted: node tint for preference/affect only, never backgrounds/gradients

Node color by type: misconception=coral, mastery=sage-teal, preference/affect=moth, goal/fact/strategy=ember-amber. Status overrides hue: superseded/archived = desaturated toward faint.
Type
Role
Face
Notes
Display
Fraunces (Google Fonts, optical size axis on)
H1/H2, session titles, big eval numbers. Weight 550–620, tight leading, slight negative tracking
Body/UI
Inter
14–16px UI, 1.6 body leading
Data
JetBrains Mono
scores, token counts, timestamps, confidences — every number in the app is mono
Scale: 12 / 14 / 16 / 20 / 28 / 40 / 64. Eyebrow labels: 11px Inter, 0.08em tracking, uppercase, dim.
Space & shape: 8px grid. Radius: 8px cards, 6px controls, full for chips/nodes. Shadows: none — depth comes from field layering + hairlines + glow. Glow (memory elements only): box-shadow: 0 0 24px rgba(232,163,61,0.25)scaled by strength.
Motion (Framer Motion): default ease [0.22, 1, 0.36, 1], 300–500ms. Constellation ambient: slow node drift (position noise, ±2px over 6s) + strength-proportional glow breathing (4s cycle) — alive, not busy. Big moments (fusion, contradiction, dream stages) get 600–900ms choreographed sequences. prefers-reduced-motion: disable ambient drift, keep state changes as fades.
9.3 App shell
Left rail, 64px, icon-only (Session / Dream / Evals — tooltips on hover), wordmark "Reverie" in Fraunces at top rotated or stacked, student chip (Maya C.) at bottom. Content area fills the rest. No top navbar. No footer.
9.4 Screen: SESSION (the hero — most build time goes here)
Layout ≥1280px: two columns, 44% / 56%.
┌──┬───────────────────────────┬─────────────────────────────────┐
│▐ │  SESSION 2 — CHAIN RULE   │            (canvas)             │
│▐ │  eyebrow: JULY 5 · 14 MIN │        THE CONSTELLATION        │
│▐ │ ┌───────────────────────┐ │      · ✦ stars, drift, glow     │
│▐ │ │ conversation stream   │ │   ✦        ·        ✦           │
│▐ │ │ (student ↔ tutor)     │ │        ·       ✦     ·          │
│▐ │ └───────────────────────┘ │  outer dim ring = archive belt  │
│▐ │ [ composer …        ↵ ]  │─────────────────────────────────│
│▐ │                           │  CONTEXT BUDGET  ▓▓▓▓▓░ 1054/1200│
└──┴───────────────────────────┴─────────────────────────────────┘
9.4.1 Conversation: No avatars, no bubbles-with-tails. Student messages: right-aligned, field-2 rounded blocks. Tutor: left-aligned, no container — just starlight text on void with a 2px ember-amber left rule; streams token-by-token. Timestamps in mono on hover only. When the tutor's reply used specific engrams, a subtle row of tiny node-chips appears under the reply ("drawing on: ✦ chain-rule misconception · ✦ worked-examples preference"); hovering a chip makes the corresponding star pulse in the constellation. This hover-link between text and sky is a signature micro-interaction — build it.
9.4.2 Constellation (canvas): d3-force layout (charge −80, link strength 0.3, collide by radius, gentle center force), positions computed in a worker-ish rAF loop, rendered custom on canvas at devicePixelRatio. Nodes: radius 4–14px by importance; core amber-glow (or type hue), halo opacity = strength; provisional = 40% opacity, dashed halo ring. Links: episodic provenance links faint hairline strands (only shown for hovered/selected node to avoid hairball); superseded→successor shown as a fading strand. Semantic clusters loosely gathered by shared subject_tags (extra weak links between same-tag nodes). Archive belt: a dim ring near the canvas edge; archived stars drift outward to it over 2s and sit at 15% opacity — visible forgetting. Hover: node scales 1.3×, tooltip (type eyebrow + content + strength/confidence in mono). Click: opens Inspector (§9.5). New engram: star materializes from the direction of the conversation panel with a 600ms scale+glow-in, plus toast bottom-left: eyebrow NEW MEMORY, one line of content. Empty state (pre-Session-1): a nearly black sky with faint static stars and the line, centered, Fraunces italic: "Reverie hasn't met Maya yet. Everything she teaches it will appear here." — an invitation, not a void.
9.4.3 Context Budget Meter (below constellation, collapsible): mono header WORKING MEMORY — 1054 / 1200 TOKENS; horizontal bar of stacked segments, one per selected engram, colored by type, width ∝ tokens; hover a segment → score breakdown popover (sim .34 · strength .28 · recency .09 · prior .10 = .81) and the star pulses. Beneath, dimtext listing top 2 excluded with reasons. This meter is the "limited context window" rubric line, on screen at all times.
9.5 Memory Inspector (right-side drawer, 420px, over the constellation)
Header: type eyebrow in type-hue + status chip. Content sentence set LARGE in Fraunces (this is the emotional object — a belief about a person; typography should honor it). Mono stat row: confidence 0.72 · strength 0.83 · recalled ×3 · born Jul 4. Provenance: quoted utterance excerpts in field-2 blocks with a hairline left rule — "said Jul 4, Session 1"; click → jumps/scrolls conversation when same-session. Lifecycle: vertical timeline of this engram's events (observed → consolidated → reinforced ×2 → …) with mono timestamps. If superseded: banner strand linking to successor ("overwritten by …" → click navigates).
9.6 Screen: DREAM
Centered column, max 720px. While idle: last Dream Report card. While running (triggered by session end or Conductor): stage list — Replay, Distill, Deduplicate, Reconcile, Decay, Report — each row: eyebrow stage name, live status (hairline spinner → sage-teal check), and a mono count that ticks up ("3 memories confirmed · 1 revised · 1 rejected"). Above the stages, a slim horizontal strip renders a live mini-constellation so merges/dimming are seen duringthe dream. Copy at top, Fraunces: "Reverie is dreaming about Session 1." Report card on completion: per-stage counts, duration, tokens — all mono. The Session screen shows a compact version: composer disabled, replaced by a breathing amber line + "Dreaming…" so a demo can stay on the split view.
9.7 Screen: EVALS
Fraunces headline: "Does memory make it better? Proof." Three-condition legend (No memory / Full history / Reverie — faint / dim / ember-amber). Charts (Recharts, styled to tokens: hairline grid, mono axes): (1) Personalization score per session (grouped bars, 1–5); (2) Recall precision per session (lines); (3) Tokens per session (bars — Reverie flat & low, full-history climbing). Below: run metadata + a Run evals button (mono) with live progress. Numbers rendered HUGE in Fraunces where a headline stat exists ("+2.1 personalization by Session 3 at 0.4× the tokens").
9.8 Banned (auto-fail list — check every screen against this)
Purple/blue gradients or any gradient backgrounds; glassmorphism; emoji anywhere in UI; centered hero + three feature cards; default shadcn look; borders heavier than 1px; more than one accent per view (type hues in the constellation are the sanctioned exception); lorem ipsum; toasts stacking >2; spinners where skeletons fit; Title Case Buttons (sentence case only); exclamation marks in UI copy.
9.9 Responsive & a11y floor
Breakpoint <1024px: constellation becomes a top panel (40vh) above the conversation; Inspector becomes a bottom sheet. Keyboard: visible focus rings (ember-amber, 2px offset); Inspector closable with Esc; composer submit on Enter. Canvas nodes get an offscreen list alternative for screen readers (engram list in DOM, aria-live for new-memory toasts).

§10 — EVAL HARNESS (the proof)
10.1 Design
Three scripted sessions for Maya (fixed student turns, JSON in backend/app/evals/scripts/), replayed under three conditions:
    •    A — No memory: tutor prompt has no memory blocks; each session cold.
    •    B — Full history: naive baseline — entire prior transcript stuffed into context (truncate head if over model limit; count tokens honestly).
    •    C — Reverie: full pipeline (observer + dream between sessions + budgeted retrieval).
Student turns are IDENTICAL across conditions (scripted), so differences are attributable to memory handling. Runner executes A, B, C sequentially, seeding a fresh DB per condition (evals/run_<ts>/<cond>.db).
10.2 Metrics
    1    Personalization score (1–5): §8.5 judge on the tutor's session-opening message, sessions 2 and 3, against the ground-truth sheet (scripts/truth.json: Maya's canonical misconception, preference, goal). 3 judge samples, report mean.
    2    Recall precision/recall @ budget (condition C, deterministic — no LLM): each script defines probe points with expected engram tags (e.g., session 3 probe: retrieval should surface chain_rule misconception + worked_examples preference). Measure whether expected tags are in the assembled pack.
    3    Token cost per session: from llm_calls — B's climbing curve vs C's flat curve is the efficiency story.
    4    Forgetting check (C only): a deliberately stale seeded engram ("studying limits for a quiz on July 1") must decay below retrieval threshold by session 3 and never appear in a pack. Pass/fail assertion.
10.3 Output
evals/results/latest.json consumed by the Evals screen; also a markdown summary table auto-written to EVALS.md(linked from README — judges who read the repo see numbers without running anything).
10.4 Honesty rule
Numbers must be real runs. If a metric disappoints, tune the system (retrieval weights, prompts), never hand-edit results. The token budget for a full eval run (~9 sessions × ~8 turns + judges) ≈ 150–250K tokens — fits the quota; record actual usage in PROGRESS.md.

§11 — DEMO MODE & THE 3-MINUTE FILM
11.1 Beat sheet (the video Saf will record; the product must make each beat effortless)
t
Beat
What's on screen
0:00–0:15
Thesis
Empty-sky state + narration: "Every AI tutor has amnesia. Reverie remembers — and you can watch it think."
0:15–0:50
Session 1
Scripted convo auto-plays; Maya flubs chain rule; stars materialize live; hover the misconception star
0:50–1:20
The Dream
End session → Dream view: stages tick, a merge fuses on the mini-constellation, report card lands
1:20–1:35
Time skip
Conductor advances clock +1 day → stars visibly dim (decay is REAL and visible)
1:35–2:05
Session 2
Budget meter assembles the pack on screen; tutor opens on yesterday's exact struggle; Maya nails it; coral misconception star flashes, dims, superseded by a sage-teal mastery star
2:05–2:35
Proof
Evals screen: three-condition charts; headline stat in huge Fraunces
2:35–3:00
Architecture + close
Architecture card (§13.4 diagram, restyled to tokens) + "Qwen on Alibaba Cloud" + end frozen on before/after
11.2 Requirements this imposes
Scripted session playback with natural typing pacing; every §5.9 pixel functioning; time-skip; a static architecture-card route (/architecture) rendering the diagram in the app's own design system (recorded, not slideware).
11.3 Conductor (/conductor, only when DEMO_MODE=true)
Plain utilitarian panel (exempt from §9 polish; still dark, still not ugly): Reset demo (wipe DB → seed baseline) · Play Session 1 script (auto-plays student turns with 20–35 cps typing simulation; tutor replies are LIVE model calls) · End session & dream · Advance clock +1 day / +3 days · Play Session 2 script · Run evals · Load pre-baked eval results (fallback if live run is slow on camera). Keyboard shortcuts (1,2,3…) so Saf can drive it off-screen while recording.
11.4 App clock
All now() in decay/retrieval/timestamps flows through app.clock.now() = wall time + clock_offset_seconds from app_state. Conductor mutates the offset; a dim mono chip in the shell shows the simulated date whenever offset ≠ 0 (honesty on camera).
11.5 Demo scripts
/demo/scripts/session1.json, session2.json: Maya's exact turns, written to reliably elicit the target engrams (her flub must literally contain "f'(x) times g'(x)" reasoning; her preference stated naturally: "honestly can you just show me an example first? rules in the abstract don't stick for me"). Include expected-engram annotations per turn for testing. Write these scripts with care — they are the screenplay.

§12 — DEPLOYMENT (Alibaba Cloud — M0, before anything pretty)
    1    Provision: ECS instance (ecs.e or g-series, 2 vCPU/4GB, Ubuntu 22.04) in the account's available region; security group opens 22, 80, 443.
    2    Ship: Docker Compose: backend (uvicorn :8000, volume ./data for SQLite), frontend (Next standalone :3000), nginx (80 → frontend, /api + /api/events/stream → backend with proxy_buffering off for SSE). deploy.sh: rsync/git pull + compose build + up. Document every step in docs/DEPLOY.md as you go.
    3    M0 proof: stub /api/health calling DashScope live, deployed and reachable at the public IP — before the constellation exists.
    4    DashScope from ECS: verify egress reachability of the chosen base URL from the instance in M0.
    5    Proof recording checklist (Saf records ~60s, separate from demo): browser → http://<ECS-IP>/api/healthshowing ok + model ids → Alibaba Cloud console showing the running instance & region → terminal docker compose ps on the instance → one live chat turn in the deployed app. Also permalink backend/app/llm.py(DashScope usage) in the Devpost form.

§13 — REPO, DOCS, SUBMISSION ASSETS
13.1 Repo layout
reverie/
  README.md  PROGRESS.md  EVALS.md  LICENSE (MIT)  docker-compose.yml  deploy.sh  .env.example
  backend/   frontend/    demo/scripts/   docs/ (DEPLOY.md, ARCHITECTURE.md, diagram.png)
13.2 README (write for a judge with 90 seconds)
Order: hero screenshot of the Session screen → one-liner → 4-bullet "what's actually inside" (dream cycle, budgeted retrieval, event-sourced memory, eval results with the headline number) → architecture diagram → quickstart (docker compose up, works with only DASHSCOPE_API_KEY set) → link to demo video, EVALS.md, PROGRESS.md. No badge walls.
13.3 Tests (minimum honest set)
Unit: decay curve pinned values; retrieval scoring + knapsack + quotas; observer source-quote verification; event→projection consistency. Integration: scripted mini-session end-to-end with mocked LLM (fixtures) asserting the full event sequence. CI: GitHub Actions running pytest + next build on push.
13.4 Architecture diagram (Mermaid source; export PNG, restyle colors to §9 tokens)
flowchart LR
  subgraph Browser
    UI[Next.js — Session · Constellation · Dream · Evals] -- SSE --> UI
  end
  subgraph "Alibaba Cloud ECS (Docker)"
    NG[Nginx] --> FE[Next.js server] & BE[FastAPI]
    BE --> DB[(SQLite + sqlite-vec\nengrams · events · episodes)]
    BE --> DW[Dream worker\nreplay→distill→dedupe→reconcile→decay]
    BE --> RET[Budgeted retrieval\nscore + knapsack]
  end
  subgraph "Qwen Cloud (DashScope)"
    QP[qwen-plus — tutor · observer · judges]
    QE[text-embedding-v4]
  end
  BE <--> QP;  BE <--> QE;  UI --> NG
13.5 Devpost description skeleton (Codex drafts, Saf edits voice)
Inspiration (tutoring-business founder story) → What it does → The memory architecture (four tiers, dream cycle, budgeted retrieval — with the constellation screenshot) → Built with → The numbers (EVALS.md headline) → What's next. Track: MemoryAgent. ≤ 600 words.
13.6 Blog-post beats (feed to Saf; bonus prize)
"I built a tutor that dreams": why event-sourcing memory made the UI honest; the decay math; what Qwen's judge got wrong until temp 0; before/after eval chart; the empty-sky screenshot as the opening image.

§14 — MILESTONES (in order; update PROGRESS.md at each gate)
M
Deliverable
Acceptance test
M0
Repo scaffold, scripts/env_check.py (answers §0.5 → PROGRESS.md), Docker stack, stub deployed on ECS, /api/health live
curl http://<ip>/api/health returns ok + model ids from the internet
M1
Migrations, event store + projection, decay/retrieval pure functions, unit tests green
pytest green; seeded engram decays correctly under offset clock
M2
Chat loop: streaming tutor + observer + SSE events + token logging
Scripted exchange produces expected engram + engram.observed on the SSE stream
M3
Dream worker, all 6 stages, dream reports
Session with planted duplicate + contradiction resolves both; report counts correct
M4
Budgeted retrieval wired into session open + per turn; memory pack SSE
Session-2 open pack contains misconception+preference+goal within budget; reinforced events fire
M5
Design system + shell + Session screen + Constellation + Inspector + Budget meter
§0.4 screenshot review passes; every M2/M4 capability has its §5.9 pixel
M6
Dream view + Evals screen + /architecture card
Dream stages animate from real events; charts render from a real eval JSON
M7
Eval harness (3 conditions × 3 sessions), EVALS.md, Conductor + scripts + clock
Full eval run completes; forgetting check passes; full §11.1 beat sheet drivable from Conductor with zero manual DB edits
M8
Deploy final build, proof recording checklist done, README/ARCHITECTURE/diagram, Devpost draft
A stranger with the repo + a key reproduces the demo; §17 checklist fully green
(M9)
Stretch: VL handwriting → engram (only if M0 confirmed VL and M0–M8 done)
Photo upload yields a provenance-linked misconception engram
If time compresses: cut M9, then Evals screen (keep harness + EVALS.md numbers), then Inspector lifecycle timeline. Never cut: constellation live events, dream view, budget meter, deployment, eval numbers.

§15 — NON-GOALS (do not build)
Multi-student auth/accounts (one seeded student); multi-subject support; voice; mobile-first layouts; RAG over textbooks; gamification/streaks/points; admin panels; websockets; Kubernetes; any queue infra; fine-tuning.

§16 — RISK REGISTER
Risk
Mitigation
ECS/DashScope egress or account friction
M0 front-loads it; if intl endpoint fails try mainland; escalate to Saf via PROGRESS.md Blockers immediately
sqlite-vec build issues in Docker
Pinned wheel; else NumPy brute-force fallback (§6)
Observer extraction noisy/hallucinatory
Source-quote substring verification + provisional status + dream distillation rejects
Judge/extractor JSON malformed
Strict schema + one repair attempt + discard-and-log; never crash the turn
Dream cycle slow on camera
Demo sessions are short (≤10 exchanges); parallelize per-item LLM calls with bounded concurrency (4)
Token quota exhaustion
Per-model accounting in llm_calls; eval budget in §10.4; qwen-turbo fallback for observer if needed
Constellation perf
Canvas render, capped node count on screen (~150 active + belt), d3-force alpha decay to rest
Live tutor reply goes off-script during recording
Tutor is live but student turns are scripted to constrain it; Saf can re-record a beat; Conductor reset is one click

§17 — FINAL SUBMISSION CHECKLIST (copy into PROGRESS.md; all must be checked)
    •    [ ] Backend live on Alibaba ECS; /api/health public
    •    [ ] Deployment proof recording done (§12.5 shot list)
    •    [ ] Repo public, MIT license, no secrets (grep + git history check), .env.example present
    •    [ ] README per §13.2 with hero screenshot; ARCHITECTURE.md + diagram PNG
    •    [ ] EVALS.md with real numbers; forgetting check passing
    •    [ ] 3-minute demo recorded following §11.1; uploaded public
    •    [ ] Devpost: description, track = MemoryAgent, video link, repo link, deployment proof, llm.py permalink
    •    [ ] Blog post published + linked (bonus prize)
    •    [ ] PROGRESS.md current — Environment Report filled, all milestones marked
End of PRD. Codex: begin with §0, then M0. Fable is watching the PROGRESS.md.