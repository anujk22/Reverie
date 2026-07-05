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
| M0 | blocked | 2026-07-04 | Blocked-external: Anuj owns ECS provisioning/SSH handoff. Fable amended gate: M1-M4 may proceed locally; M5 is gated on live ECS stub. |
| M0.5 | done | 2026-07-04 | Local DashScope discovery, live observer/dream acceptance, and smoke eval completed. ECS health proof still belongs to M0. |
| M1 | done | 2026-07-04 | SQLite migrations, event store/projection, decay and retrieval pure functions implemented. `backend/.venv311/bin/python -m pytest backend/tests` passes. |
| M2 | done | 2026-07-04 | Streaming chat route, mock/live LLM boundary, observer validation, token logging, and SSE/event broadcast path implemented. API smoke passed in `MOCK_LLM=true`. |
| M3 | done | 2026-07-04 | Dream worker has Replay, Distill, Deduplicate, Reconcile, Decay, Report stages and dream report rows. Acceptance smoke and committed test cover duplicate merge + misconception supersession. |
| M4 | done | 2026-07-04 | Session-open and per-turn budgeted retrieval return winners, exclusions, score breakdowns, confidence/strength metadata, and emit reinforcement events. |
| M5 | local-preview | 2026-07-05 | Session screen, design system, canvas constellation, inspector, and budget meter are implemented locally because ECS verification may take 1-2 days. Official M5 acceptance remains gated on public ECS `/api/health` and Fable screenshot review. |
| M6 | todo |  |  |
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
17. ECS verification is delayed externally, so M5 was built as a local preview to avoid losing schedule. This does not waive Fable's gate: no M6 deep work or M5 acceptance until the ECS health proof exists and Fable reviews the Session screenshots.

## Deviations from PRD

- M0 live deployment cannot be completed from this environment without Alibaba Cloud ECS access. Workaround: provide Docker Compose, Nginx config, deploy script, health endpoint, and env check script so Anuj can run the proof once ECS credentials exist. Fable explicitly approved proceeding through M1-M4 while this is blocked.
- Local Python is 3.14.5, not 3.11. Docker pins Python 3.11.
- Mock embeddings originally used dimension 128. After M0.5 discovery, default `EMBED_DIM` was updated to the live `text-embedding-v4` dimension of 1024.
- Added new hard law from Fable: eval charts/results must not be fabricated. The current eval endpoint returns an honest unavailable state until a live DashScope-backed run exists.
- Dream distillation currently uses deterministic consolidation for provisional memories plus session-level LLM/mock extraction for affect/strategy memories. Live Qwen judge/distillation for dedup/contradiction remains required before M7 and before any recorded material.
- M5 visual work was implemented before the ECS public health proof only because Alibaba account verification may take 1-2 days. It is marked local-preview, not accepted/done.

## Verification Log

- `backend/.venv311/bin/python -m pytest backend/tests` -> 17 passed.
- `MOCK_LLM=true ... TestClient` API smoke -> `/api/health`, `POST /api/sessions`, streamed `POST /api/sessions/{id}/chat`, and `/api/memory/graph` passed.
- Observer broadcast smoke -> subscriber received `engram.observed` with toast.
- Dream acceptance smoke -> duplicate merge count >= 1 and contradiction supersession count >= 1.
- Retrieval smoke -> session-open pack included `preference`, `goal`, and chain-rule memory with score breakdowns.
- `backend/.venv311/bin/python backend/scripts/env_check.py` -> safe skipped path with missing key.
- `jq empty backend/app/evals/scripts/*.json` -> passed.
- `npm run typecheck` in `frontend/` -> passed.
- `npm run build` in `frontend/` -> passed.
- Local M5 screenshot QA with Chrome/Playwright -> 1440x900 and 390x844 inspected. Full live UI rehearsal produced 4 graph nodes before dream and 5 after dream; Session 2 budget meter rendered `121 / 1200` tokens; inspector opened from a budget chip with provenance and lifecycle; canvas pixel check was nonblank; narrow viewport horizontal overflow was `0`; emoji display sanitizer prevented Qwen emoji leakage.
- `npm install` reports 5 transitive vulnerabilities in the current Next/ESLint dependency tree. No force update applied.
- Local stub servers started: backend `MOCK_LLM=true` on `http://127.0.0.1:8000`; frontend on `http://127.0.0.1:3001` because port 3000 was already occupied. Health and frontend HTTP checks returned 200.
- Live env check with DashScope key -> international endpoint works, mainland endpoint fails with 401; `qwen-plus` chat ok at `610 ms`; `text-embedding-v4` ok at `1024` dims and `379 ms`; 28 VL/omni models detected.
- Live observer sample -> Qwen extracted the chain-rule misconception and example-first preference with exact source quotes and no errors.
- Live M0.5 session1/session2 flow -> one affect memory, misconception superseded by active mastery, report2 reconcile `superseded: 1`; total live M0.5 flow token use `4932` prompt + `894` completion over 14 calls, no errors.
- Live smoke eval -> strict JSON judge response, personalization score `5`, `244` prompt tokens + `97` completion tokens, `2961 ms`, no error.

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

## Blockers & Questions

- Need Alibaba Cloud ECS region, instance, SSH target, and deployment credentials to complete the M0 public `/api/health` proof.
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
