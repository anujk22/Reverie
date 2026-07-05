# Reverie — Build Progress

## Environment Report

Generated on 2026-07-04 in `/Users/anuj/Documents/Coding/Hackathons/QwenHacks`.

| Item | Result |
| --- | --- |
| Repo state | Git initialized locally with remote `https://github.com/anujk22/Reverie.git`; push is pending GitHub authentication in this environment. |
| Node.js | v22.22.3 |
| npm | 10.9.8 |
| Python | `python3` is 3.14.5; `python3.11` is available and used for backend verification. Docker targets Python 3.11 per PRD. |
| DashScope API key | Provided by Anuj for process-only use. Not written to repo. No secret was printed. |
| DashScope base URL | `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` works. Mainland endpoint rejects this key with 401. |
| Model inventory | Live inventory succeeded: 148 models accessible. Full list below. |
| Chat model | `qwen-plus` confirmed via strict reply test: `610 ms`. Fallback models available in inventory include `qwen-max`, `qwen-turbo`, and multiple `qwen3-*-instruct` models. |
| Embeddings | `text-embedding-v4` confirmed: `1024` dimensions, `379 ms`. `EMBED_DIM` default updated to `1024`. |
| Vision | Yes. VL/omni models detected, including `qwen-vl-max`, `qwen-vl-plus`, `qwen3-vl-flash`, `qwen3-vl-plus`, and `qwen3-vl-235b-a22b-instruct`. Stretch M9 still gated until M0-M8 are done. |
| Rate limits / quota | No rate-limit headers observed in env check responses. Token use is logged in `llm_calls`. |
| Endpoint | Use international endpoint exclusively for this key. Mainland endpoint failed for models, chat, and embeddings with 401. |
| ECS | Blocked: no Alibaba Cloud instance credentials or target IP provided in this workspace. Deployment files and docs are scaffolded. |

<details>
<summary>Full DashScope model inventory from M0.5</summary>

`ccai-pro`, `deepseek-v3.2`, `deepseek-v4-flash`, `deepseek-v4-pro`, `glm-5.1`, `glm-5.2`, `kimi-k2.7-code`, `qvq-max`, `qwen-coder-plus`, `qwen-flash`, `qwen-flash-character`, `qwen-image-2.0`, `qwen-image-2.0-2026-03-03`, `qwen-image-2.0-pro`, `qwen-image-2.0-pro-2026-03-03`, `qwen-image-2.0-pro-2026-04-22`, `qwen-image-2.0-pro-2026-06-22`, `qwen-image-edit`, `qwen-image-edit-max`, `qwen-image-edit-max-2026-01-16`, `qwen-image-edit-plus`, `qwen-image-edit-plus-2025-10-30`, `qwen-image-edit-plus-2025-12-15`, `qwen-image-max`, `qwen-image-max-2025-12-30`, `qwen-image-plus`, `qwen-image-plus-2026-01-09`, `qwen-max`, `qwen-mt-flash`, `qwen-mt-lite`, `qwen-mt-plus`, `qwen-mt-turbo`, `qwen-omni-turbo`, `qwen-plus`, `qwen-plus-2025-01-25`, `qwen-plus-2025-04-28`, `qwen-plus-2025-07-14`, `qwen-plus-2025-09-11`, `qwen-plus-2025-12-01`, `qwen-plus-character`, `qwen-plus-latest`, `qwen-turbo`, `qwen-vl-max`, `qwen-vl-ocr-2025-11-20`, `qwen-vl-plus`, `qwen2-7b-instruct`, `qwen3-14b`, `qwen3-235b-a22b`, `qwen3-235b-a22b-instruct-2507`, `qwen3-235b-a22b-thinking-2507`, `qwen3-30b-a3b`, `qwen3-30b-a3b-instruct-2507`, `qwen3-30b-a3b-thinking-2507`, `qwen3-32b`, `qwen3-8b`, `qwen3-asr-flash-2026-02-10`, `qwen3-asr-flash-realtime`, `qwen3-asr-flash-realtime-2025-10-27`, `qwen3-asr-flash-realtime-2026-02-10`, `qwen3-coder-480b-a35b-instruct`, `qwen3-coder-flash`, `qwen3-coder-next`, `qwen3-coder-plus`, `qwen3-coder-plus-2025-07-22`, `qwen3-coder-plus-2025-09-23`, `qwen3-livetranslate-flash`, `qwen3-livetranslate-flash-2025-12-01`, `qwen3-livetranslate-flash-realtime`, `qwen3-livetranslate-flash-realtime-2025-09-22`, `qwen3-max`, `qwen3-max-2025-09-23`, `qwen3-max-2026-01-23`, `qwen3-max-preview`, `qwen3-next-80b-a3b-instruct`, `qwen3-next-80b-a3b-thinking`, `qwen3-omni-30b-a3b-captioner`, `qwen3-omni-flash`, `qwen3-omni-flash-2025-09-15`, `qwen3-omni-flash-2025-12-01`, `qwen3-omni-flash-realtime`, `qwen3-omni-flash-realtime-2025-09-15`, `qwen3-omni-flash-realtime-2025-12-01`, `qwen3-s2s-flash-realtime`, `qwen3-tts-flash`, `qwen3-tts-flash-2025-09-18`, `qwen3-tts-flash-2025-11-27`, `qwen3-tts-flash-realtime`, `qwen3-tts-flash-realtime-2025-09-18`, `qwen3-tts-flash-realtime-2025-11-27`, `qwen3-tts-instruct-flash`, `qwen3-tts-instruct-flash-2026-01-26`, `qwen3-tts-instruct-flash-realtime`, `qwen3-tts-instruct-flash-realtime-2026-01-22`, `qwen3-tts-vc-2026-01-22`, `qwen3-tts-vc-realtime-2025-11-27`, `qwen3-tts-vc-realtime-2026-01-15`, `qwen3-tts-vd-2026-01-26`, `qwen3-tts-vd-realtime-2025-12-16`, `qwen3-tts-vd-realtime-2026-01-15`, `qwen3-vl-235b-a22b-instruct`, `qwen3-vl-235b-a22b-thinking`, `qwen3-vl-flash`, `qwen3-vl-flash-2025-10-15`, `qwen3-vl-flash-2026-01-22`, `qwen3-vl-plus`, `qwen3-vl-plus-2025-09-23`, `qwen3-vl-plus-2025-12-19`, `qwen3.5-122b-a10b`, `qwen3.5-27b`, `qwen3.5-35b-a3b`, `qwen3.5-397b-a17b`, `qwen3.5-flash`, `qwen3.5-flash-2026-02-23`, `qwen3.5-livetranslate-flash-realtime`, `qwen3.5-livetranslate-flash-realtime-2026-05-19`, `qwen3.5-omni-flash`, `qwen3.5-omni-flash-2026-03-15`, `qwen3.5-omni-flash-realtime`, `qwen3.5-omni-flash-realtime-2026-03-15`, `qwen3.5-omni-plus`, `qwen3.5-omni-plus-2026-03-15`, `qwen3.5-omni-plus-realtime`, `qwen3.5-omni-plus-realtime-2026-03-15`, `qwen3.5-plus`, `qwen3.5-plus-2026-02-15`, `qwen3.5-plus-2026-04-20`, `qwen3.6-27b`, `qwen3.6-35b-a3b`, `qwen3.6-flash`, `qwen3.6-flash-2026-04-16`, `qwen3.6-max-preview`, `qwen3.6-plus`, `qwen3.6-plus-2026-04-02`, `qwen3.7-max`, `qwen3.7-max-2026-05-17`, `qwen3.7-max-2026-05-20`, `qwen3.7-max-2026-06-08`, `qwen3.7-max-preview`, `qwen3.7-plus`, `qwen3.7-plus-2026-05-26`, `qwq-plus`, `qwq-plus-2025-03-05`, `text-embedding-v3`, `text-embedding-v4`, `tongyi-tingwu-slp`, `wan2.7-image`, `wan2.7-image-pro`, `z-image-turbo`.

</details>

## Milestone Status

| Milestone | Status | Date | Notes |
| --- | --- | --- | --- |
| M0 | blocked-external | 2026-07-05 | Alibaba ECS identity verification was rejected externally; remediation is running via retry + hackathon Discord ticket. Deployment executes whenever access lands. |
| M0.5 | done | 2026-07-04 | Local DashScope discovery, live observer/dream acceptance, and smoke eval completed. ECS health proof still belongs to M0. |
| M1 | done | 2026-07-04 | SQLite migrations, event store/projection, decay and retrieval pure functions implemented. `backend/.venv311/bin/python -m pytest backend/tests` passes. |
| M2 | done | 2026-07-04 | Streaming chat route, mock/live LLM boundary, observer validation, token logging, and SSE/event broadcast path implemented. API smoke passed in `MOCK_LLM=true`. |
| M3 | done | 2026-07-04 | Dream worker has Replay, Distill, Deduplicate, Reconcile, Decay, Report stages and dream report rows. Acceptance smoke and committed test cover duplicate merge + misconception supersession. |
| M4 | done | 2026-07-04 | Session-open and per-turn budgeted retrieval return winners, exclusions, score breakdowns, confidence/strength metadata, and emit reinforcement events. |
| M5 | provisional | 2026-07-05 | ECS gate dissolved by Fable. Design rescue pass completed; Fable provisionally accepted pending screenshot review. Hold two-panel session composition while later work proceeds. |
| M6 | ready-for-fable-review | 2026-07-05 | Dream view, Evals honest-state screen, and `/architecture` memory-pipeline card implemented and QA'd at desktop + narrow widths. |
| M7 | todo |  |  |
| M8 | todo |  |  |
| M9 | todo |  | Gated on VL model and core completion. |

## Decisions Log

1. Started with a greenfield repo because the workspace was empty. This matches the PRD's requested repo layout.
2. Chose a deterministic mock LLM/embedding fallback for local development because `DASHSCOPE_API_KEY` is absent. The PRD allows graceful degradation for API failures; live mode still routes through a single DashScope client.
3. Implementing sqlite-vec as an optional future path and using a JSON vector table plus brute-force cosine by default. The PRD explicitly allows a NumPy/brute-force fallback if sqlite-vec is unavailable; at demo scale this keeps M0-M7 reliable.
4. FABLE RULING — 2026-07-04: M0 amended, not waived. M1-M4 may proceed locally. M5 design/constellation is gated on a live ECS stub. M0 remains blocked-external; Anuj owns ECS provisioning and SSH handoff.
5. FABLE RULING — 2026-07-04: `MOCK_LLM=true` is approved for dev, tests, and rehearsal only. The shell must show a visible mono `MOCK` chip whenever active. Mock mode is banned from the final demo video, deployment proof, and anything feeding `EVALS.md`.
6. FABLE RULING — 2026-07-04: sqlite-vec gets a 30-minute Docker timebox. If it does not work quickly, brute-force NumPy/vector cosine is the shipped default at demo scale, documented as a deliberate tradeoff with a future upgrade path.
7. FABLE RULING — 2026-07-04: eval numbers must come only from completed real runs. Cached real results are allowed for camera convenience; synthetic or hand-edited results are prohibited. No real run by deadline means honest empty state, no `EVALS.md` numbers, and the eval beat is cut from the demo.
8. FABLE RULING — 2026-07-04: `deploy.sh` and `docs/DEPLOY.md` are written now and executed once Anuj provides ECS IP and SSH key. Environment Report ECS row remains empty until true.
9. Added a pre-M5 frontend skeleton only: health panel, visible `MOCK` chip, and gated placeholders. Full design system/constellation work remains blocked until the ECS stub is live.
10. The first dependency install attempt used local Python 3.14 and failed because pinned `pydantic-core` does not support Python 3.14. Verification was moved to `backend/.venv311` with Python 3.11, matching Docker.
11. FABLE AUDIT — 2026-07-04: M1-M4 approved. M5 gate is public `GET /api/health` from ECS public IP served by Docker stack, returning ok + live DashScope model IDs. Frontend through Nginx is M8, not the M5 gate.
12. FABLE AUDIT — 2026-07-04: M0.5 required immediately when key lands: env check, live M2/M3 acceptance, extraction/judge quality, token costs. Completed locally; ECS deployment still pending.
13. FABLE AUDIT — 2026-07-04: dream session-level pass must recover affect from session1 because turn-level cap may drop anxiety. Added acceptance test and implementation.
14. Live M0.5 revealed two quality issues: Qwen sometimes mislabeled correct performance as misconception, and session-level memory could duplicate an existing affect if phrased differently. Fable rejected demo-string deterministic normalization, so the final mechanism is: generic extraction prompt rules for type assignment, session-level LLM/mock extraction for missed affect/strategy memories, exact-quote validation, and same-type vector dedupe before adding session-level memories.
15. Added `backend/scripts/reembed_engrams.py` and updated `EMBED_DIM=1024` so mock-to-live vector transition can re-embed or reset cleanly.
16. FABLE AUDIT — 2026-07-04: ECS target may be free-tier sized. Updated deployment so images build locally for `linux/amd64`, ship via `docker save`/`scp`, add a 2 GB swap file on ECS, and run `docker compose up -d --no-build` on the instance.
17. FABLE DIRECTIVE — 2026-07-05: ECS identity verification was rejected externally; remediation is running via retry + hackathon Discord ticket. The M5 ECS gate is dissolved. Build M5-M8 without waiting; deployment executes whenever access lands, even submission morning.
18. FABLE DIRECTIVE — 2026-07-05: fallback of record if ECS never lands is to submit with an `llm.py` permalink proving DashScope/Alibaba Cloud usage, a recording of the live app with token logs, and an honest note plus ticket screenshot. This is a fallback only; deployment remains attempted until deadline.
19. FABLE DIRECTIVE — 2026-07-05: current M5 was wireframe fidelity, not spec. Rescue pass before M6 focuses on removing message borders, bottom-anchored conversation, richer constellation rendering, labeled header actions, composer polish, screenshot QA, and 8-12 real engrams across the demo arc.
20. M5 rescue duplicate mechanism is content-general: same-type memories now run through a normalized content/token overlap plus subject-tag overlap matcher before insertion/reinforcement. This is not keyed to chain-rule strings or demo tags; a Spanish-conjugation acceptance test covers the litmus directly. Session-level affect recovery also treats natural "freeze/freezing" language as affect evidence in the mock path.
21. FABLE AUDIT — 2026-07-05: M5 rescue pass is provisionally accepted pending Fable's screenshot review, but M6 may proceed. The product framing is hardened: Reverie leads as a memory engine wearing a tutoring skin, not a math tutor.
22. Premise hardening implemented across `README.md`, `docs/DEVPOST.md`, `docs/ARCHITECTURE.md`, metadata, and route copy. The docs state near the top that extraction, dreaming, forgetting, duplicate detection, and budgeted recall contain zero calculus knowledge; the subject lives in prompt/script surfaces, and `backend/tests/test_dedupe.py` proves the Spanish-conjugation litmus.
23. `docs/DESIGN.md` was read and resolved. Useful design/product-contract details were folded into `docs/ARCHITECTURE.md`; the standalone file was deleted so there is no mystery untracked design note.
24. Eval result JSON is runtime state, not source. `backend/app/evals/results/*.json` is ignored; the API returns an honest empty state until a completed real run exists, and augments that state with live token totals from `llm_calls`.

## Deviations from PRD

- M0 live deployment cannot be completed yet because Alibaba ECS identity verification was rejected externally. Workaround until access lands: keep Docker Compose, Nginx config, deploy script, health endpoint, and env check script ready; continue M5-M8 per Fable's dissolved gate directive.
- Local Python is 3.14.5, not 3.11. Docker pins Python 3.11.
- Mock embeddings originally used dimension 128. After M0.5 discovery, default `EMBED_DIM` was updated to the live `text-embedding-v4` dimension of 1024.
- Added new hard law from Fable: eval charts/results must not be fabricated. The current eval endpoint returns an honest unavailable state until a live DashScope-backed run exists.
- Dream distillation currently uses deterministic consolidation for provisional memories plus session-level LLM/mock extraction for affect/strategy memories. Live Qwen judge/distillation for dedup/contradiction remains required before M7 and before any recorded material.
- If ECS never lands before submission, fallback of record is an `llm.py` permalink showing DashScope/Alibaba Cloud API usage, a live app recording with token logs, and an honest deployment note plus ticket screenshot.

## Verification Log

- `backend/.venv311/bin/pytest backend/tests` -> 20 passed.
- `MOCK_LLM=true ... TestClient` API smoke -> `/api/health`, `POST /api/sessions`, streamed `POST /api/sessions/{id}/chat`, and `/api/memory/graph` passed.
- Observer broadcast smoke -> subscriber received `engram.observed` with toast.
- Dream acceptance smoke -> duplicate merge count >= 1 and contradiction supersession count >= 1.
- Retrieval smoke -> session-open pack included `preference`, `goal`, and chain-rule memory with score breakdowns.
- `backend/.venv311/bin/python backend/scripts/env_check.py` -> safe skipped path with missing key.
- `jq empty backend/app/evals/scripts/*.json` -> passed.
- `npm run typecheck` in `frontend/` -> passed.
- `npm run build` in `frontend/` -> passed.
- Local M5 pre-rescue screenshot QA with Chrome/Playwright -> 1440x900 and 390x844 inspected. Full live UI rehearsal produced 4 graph nodes before dream and 5 after dream; Session 2 budget meter rendered `121 / 1200` tokens; inspector opened from a budget chip with provenance and lifecycle; canvas pixel check was nonblank; narrow viewport horizontal overflow was `0`; emoji display sanitizer prevented Qwen emoji leakage.
- `npm install` reports 5 transitive vulnerabilities in the current Next/ESLint dependency tree. No force update applied.
- Local stub servers started: backend `MOCK_LLM=true` on `http://127.0.0.1:8000`; frontend on `http://127.0.0.1:3001` because port 3000 was already occupied. Health and frontend HTTP checks returned 200.
- Live env check with DashScope key -> international endpoint works, mainland endpoint fails with 401; `qwen-plus` chat ok at `610 ms`; `text-embedding-v4` ok at `1024` dims and `379 ms`; 28 VL/omni models detected.
- Live observer sample -> Qwen extracted the chain-rule misconception and example-first preference with exact source quotes and no errors.
- Live M0.5 session1/session2 flow -> one affect memory, misconception superseded by active mastery, report2 reconcile `superseded: 1`; total live M0.5 flow token use `4932` prompt + `894` completion over 14 calls, no errors.
- Live smoke eval -> strict JSON judge response, personalization score `5`, `244` prompt tokens + `97` completion tokens, `2961 ms`, no error.
- M5 rescue screenshot QA, live mode -> `docs/screenshots/m5-rescue-desktop.png` captured at exact `1440x900` with inspector open, live constellation, budget meter, drawing-on chips, bottom composer visible, no console errors, and no horizontal overflow. `docs/screenshots/m5-rescue-narrow.png` captured at exact `390x844` with live constellation, budget meter, session header, and first exchange; no horizontal overflow and no offscreen offenders.
- M5 rescue live demo arc -> Session 1 five natural turns + dream + Session 2 two recall turns produced 9 active engrams: 3 preference, 2 misconception, 1 affect, 1 strategy_outcome, 1 goal, 1 mastery. This satisfies the 8-12 inhabited-sky target and proves session-level affect recovery without overfilling duplicates.
- `backend/.venv311/bin/pytest backend/tests/test_dedupe.py backend/tests/test_observer.py backend/tests/test_dream_and_retrieval_service.py` -> 11 passed after the content-general duplicate guard.
- M6 Dream browser QA, live backend -> `/dream` loaded at 1440x900 and 390x844; "run latest dream" triggered a real backend dream; stage rows rendered saved/event counts with no `[object Object]`; console clean; narrow horizontal overflow `0`. Screenshots: `docs/screenshots/m6-dream-desktop.png`, `docs/screenshots/m6-dream-narrow.png`.
- M6 Evals browser QA -> `/evals` renders honest empty state only (`real_run=false`), no fabricated chart headings, synthetic-results prohibition visible, observed model token totals visible, console clean, narrow horizontal overflow `0`. Screenshots: `docs/screenshots/m6-evals-desktop.png`, `docs/screenshots/m6-evals-narrow.png`.
- M6 Architecture browser QA -> `/architecture` renders the memory pipeline card, Qwen on Alibaba Cloud, storage/event-store proof, and Spanish subject-swap proof; console clean; narrow horizontal overflow `0`. Screenshots: `docs/screenshots/m6-architecture-desktop.png`, `docs/screenshots/m6-architecture-narrow.png`.
- `npm run typecheck` in `frontend/` -> passed.
- `npm run build` in `frontend/` -> passed for routes `/`, `/dream`, `/evals`, `/architecture`, `/conductor`.
- `backend/.venv311/bin/pytest backend/tests` -> 20 passed.
- `jq empty backend/app/evals/scripts/*.json` -> passed.
- `git diff --check` -> passed.
- Secret-pattern scan for DashScope/Qwen key material -> no repo matches.

## M2 Observer Sample

Test exchange:

> Student: "I have a midterm soon and I am anxious about chain rule. For f(g(x)), I think I do f'(x) times g'(x), like product rule? Honestly can you show me an example first? Rules in the abstract do not stick for me."

Validated observer output written as provisional engrams:

1. `misconception` — "Differentiates f(g(x)) as f'(x) times g'(x), applying the product rule pattern to compositions." Tags: `chain_rule`, `composite_functions`; confidence `0.78`; importance `0.95`.
2. `preference` — "Learns chain rule best from a worked example before an abstract rule." Tags: `worked_examples`; confidence `0.88`; importance `0.78`.
3. `goal` — "Is preparing for a differentiation midterm covering chain rule." Tags: `midterm`, `differentiation`; confidence `0.80`; importance `0.90`.

## M0.5 Live Samples

Live observer sample, using `qwen-plus` against DashScope international endpoint:

1. `misconception` — "Differentiates f(g(x)) as f'(x) times g'(x), applying the product rule pattern to compositions." Exact source quote: "For f(g(x)), I think I do f prime x times g prime x, like product rule?"
2. `preference` — "Learns chain rule more effectively through worked examples than abstract rule statements." Exact source quote: "Honestly can you show me an example first? Rules in the abstract do not stick for me."

Live dream report after fixes:

- Session 1 report: replay `4`, distill confirmed `5`, dedupe merged `0`, reconcile superseded `0`, duration `6828 ms`.
- Session 2 report: replay `1`, distill confirmed `2`, dedupe merged `0`, reconcile superseded `1`, duration `3940 ms`.
- Final live memory state includes one active affect, active preference, active goal, active mastery, strategy_outcome, and the original misconception superseded by the mastery.

Live smoke eval:

- Judge model: `qwen-plus`.
- Score: `5`.
- Tokens: `244` prompt + `97` completion.
- Latency: `2961 ms`.
- Result is smoke-only and does not populate `EVALS.md` full-run claims.

## Draft Demo Scripts for Fable Punch-up

Session 1 draft (`backend/app/evals/scripts/session1.json`):

1. Maya: "I keep freezing when someone says the midterm is going to lean on chain rule. I can do plain power rule, but nested functions make me second-guess myself."
2. Maya: "Like with f(g(x)), my hand wants to write f'(x) times g'(x). I know that smells like product rule, but it is the mistake I keep making."
3. Maya: "Could we start with actual numbers first? If I see one worked example, the rule usually lands better."
4. Maya: "Please ask me one small question at a time. When someone dumps the full solution, I nod along and then cannot repeat it."
5. Maya: "Also, I usually study late after work, so shorter practice sets are easier for me to stick with."

Session 2 draft (`backend/app/evals/scripts/session2.json`):

1. Maya: "Can we pick up from yesterday? I remember I mixed up the nested thing with product rule, but I want to try a worked one first."
2. Maya: "For (3x^2 + 5)^4, I think the outside derivative is 4(3x^2 + 5)^3, and then I multiply by 6x for the inside. Is that finally the move?"
3. Maya: "It feels less panicky if I write outside first, then inside, almost like a checklist."
4. Maya: "One smaller thing still blurs: sin(5x^2). I forget whether cos keeps the inside unchanged before I multiply by the inside derivative."
5. Maya: "The power rule itself is fine now. It is recognizing that something is nested that slows me down."

## Blockers & Questions

- Need Alibaba Cloud ECS region, instance, SSH target, and deployment credentials to complete the M0 public `/api/health` proof if identity remediation succeeds.
- Need GitHub authentication in this environment to push to `https://github.com/anujk22/Reverie.git`.

## Demo Readiness Checklist

- [ ] Backend live on Alibaba ECS; /api/health public
- [ ] Deployment proof recording done (§12.5 shot list)
- [ ] Repo public, MIT license, no secrets (grep + git history check), .env.example present
- [ ] README per §13.2 with hero screenshot; ARCHITECTURE.md + diagram PNG
- [ ] EVALS.md with real numbers; forgetting check passing
- [ ] 3-minute demo recorded following §11.1; uploaded public
- [ ] Devpost: description, track = MemoryAgent, video link, repo link, deployment proof, llm.py permalink
- [ ] Blog post published + linked (bonus prize)
- [ ] PROGRESS.md current — Environment Report filled, all milestones marked
