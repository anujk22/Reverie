# Reverie — 3-Minute Demo Video Script

Target runtime: ~2:55 (hard cap 3:00 — lock the cut at ≤2:57). Narration: ElevenLabs (~390 words; slow to ~0.95x on the forgetting beat and the final thesis line only — the close's list reads at 1x, it does not fit slowed). The word count is deliberately under-stuffed: the film breathes through the name animation, the dream choreography, and the forgetting hold.
Format: 10s failure cold open → cinematic name animation → live demo with zoom/popout edits → close.
Editor: Kite. Footage spine: film mode (`?film=1`), live backend only — **never MOCK** (visible MOCK chip is disqualifying per project rules).

**Framing rules (non-negotiable):** the words "tutor," "tutoring," and "student" never appear in this video. The persona is **Lena**, a merchant migrating her online store onto a commerce platform. Her scenario is presented as *one workload* the engine happens to be running, never as the product category — the close makes the domain-swap explicit. Reverie is a memory engine — infrastructure with a visible mind.

**Blockers before recording (item 1 is the critical path — nothing downstream matters until it lands):**

- [ ] **Live eval run complete** — fills the bracketed numbers `[X] [Y] [Z] [N]` in the Evals beat. Both contingencies are pre-decided in that beat; no judgment calls on edit night.
- [x] Repositioning pass landed (Maya → Lena everywhere, affect-adaptive session opening verified — commit 55d5bda)
- [x] Session 2 script timeline fixed — "yesterday" → "a few days ago," and Lena no longer announces her own misconception or preference (the recall has to be earned, not prompted)
- [ ] Demo domain swap (calculus → store migration) landed, committed, and verified: purity grep clean, 27+ tests green, 11/11 film beats replay
- [ ] ~14s of "amnesiac assistant" footage for the cold open (no_memory eval condition on screen, or a staged generic chat blanking on a returning user — staged footage is fine here because it isn't Reverie, but it must show zero Reverie chrome and no MOCK chip)
- [ ] Film mode replayed end-to-end **twice** on the live Docker stack before any take counts as good

---

## [00:00 – 00:14] THE FAILURE COLD OPEN

**Screen:** a plain, generic chat UI (or the no-memory eval condition). A returning user asks "Where were we?" and gets a bland "Hi! What would you like to work on today?"

> Every AI product ships with the same flaw. Your users explain themselves — their goals, their preferences, what they struggle with — and the moment the session ends, it's gone. Context windows aren't memory. They're a goldfish with a bigger bowl.

## [00:14 – 00:17] NAME ANIMATION

**Screen:** cinematic text: REVERIE. The dormant brain fades in behind it.

> Meet Reverie. A memory engine you can watch think.

## [00:17 – 00:50] SESSION 1 — MEMORY FORMS

**Screen:** session view. Lena's first message streams. ZOOM to the engram toast the moment it fires, then popout on the new node igniting.

> To prove it, we gave it a real workload: one user, one messy multi-day problem. Lena is migrating her store onto a new platform, with a launch date bearing down. This brain starts empty. She starts talking — and watch the right side. An observer model just caught something: a misconception about how the platform retries failed orders — typed, scored, and pinned to the moment she said it.

**Screen:** ZOOM — inspector open on the misconception, source quote highlighted.

> Every memory carries a receipt — the exact words from the transcript. No quote, no memory. Nothing here is hallucinated.

**Screen:** wide shot, several nodes now lit.

> One session in, Reverie holds her goal, her preferences, even her anxiety — each one an event on an append-only ledger.

## [00:50 – 01:20] THE DREAM

**Screen:** end session → constellation choreography → cut to dream report page. ZOOM on merged/superseded counts.

> Then the session ends, and Reverie sleeps. It replays the day, distills what mattered, merges duplicates, and resolves contradictions. Watch — two memories just became one. The language model proposes. Deterministic code disposes. Every decision is on the ledger.

## [01:20 – 01:35] FORGETTING

**Screen:** advance clock +3 days ON CAMERA. Hold on the brain as nodes visibly dim. Slow zoom in. Let 2 seconds breathe.

> Now, three days pass. Watch the brain. Memories she hasn't touched decay along a forgetting curve — because a memory that never forgets isn't memory. It's a landfill.

## [01:35 – 02:10] RECALL — THE PAYOFF

**Screen:** Session 2 opens. ZOOM on budget meter filling, then on the assistant's reply citing the misconception unprompted.

> Lena returns. Reverie doesn't reload her transcript — it retrieves under a budget. Twelve hundred tokens, scored on relevance, strength, and recency. It knows what she got wrong three days ago — she never had to say it twice.

**Screen:** hold on the reply's gentle, low-pressure phrasing.

> It even remembered how frustrated she was when her orders wouldn't sync — and changed how it responds.

**Screen:** ZOOM — excluded memories with reasons.

> And it shows its work: what it recalled, what it left out, and why.

## [02:10 – 02:30] EVALS

**Screen:** /evals with real numbers. Popout the token comparison.

> We measured it against two baselines — no memory at all, and stuffing the entire history into context. Reverie scored 5.0 on personalization versus 4.5, recalled 100 percent of planted facts, and used 71 percent fewer tokens than full history. Measured, not asserted.

**Pre-decided contingencies (locked now, not at 2 a.m. on edit night):**

- **No completed real run by record time** → cut this beat entirely (standing ruling: no real run, no eval claims). Cover the ~20s by extending the recall beat's stillness and playing the spare architecture line over the close.
- **Real run but underwhelming** — underwhelming means personalization delta (Reverie − no-memory) **< 1.0 point** or planted-fact recall **< 80%** → keep the beat, cut the VO to the token-efficiency sentence only ("…and used [N] percent fewer tokens than full history. Measured, not asserted."). Token efficiency vs. full-history is structurally guaranteed to be large, so it is always safe to state.
- The numbers spoken must match `EVALS.md` exactly. Never a favorable subset.

## [02:30 – 02:55] CLOSE

**Screen:** /architecture card, then pull back to the fully-lit brain.

> And the engine contains zero domain knowledge. Swap one script file, and it remembers a patient across visits, a learner across a semester, an engineer across your codebase — the test suite proves it. Typed memories, event sourcing, dreams, decay, budgeted recall, on Qwen, on Alibaba Cloud. Your AI shouldn't meet its users for the first time, every time.

*(The list reads at 1x; slow to 0.95x only on the final thesis sentence, with a half-beat before it.)*

**Screen:** beat. Logo.

> Reverie. Memory you can watch.

---

## Production notes

- **Zoom discipline:** zoom only when the VO names a pixel (toast, quote, meter, dimming node, the gentle reply). Wide-and-still is the default; zoom is the emphasis — constant motion reads as chaos.
- **The affect beat (~01:55) is the emotional center of the film.** Give it stillness: no zoom movement while the line lands, just the reply on screen. This is the moment a judge retells to another judge.
- **Pauses:** the script has deliberate beats ("Watch —", the close). Insert real 0.5–1s gaps in the edit; don't rely on TTS to breathe.
- **Lock picture to VO:** generate and time the ElevenLabs read *before* cutting. If the total read pushes the cut past 2:57, trim the close's list ("Typed memories, … budgeted recall") — never the thesis line, never the pauses.
- **Proof-listen** the ElevenLabs output at 1x before export (artifact check).
- **Record big, punch in later:** capture at full display resolution; do zooms in post so text stays sharp.
- **Test the export** at 1080p at Devpost-embed size — if the budget meter isn't readable, judges can't read it either.
- **Spare line** if the video runs short (over the architecture card): "This is not a decorative visualization — every node on this screen is backed by a database event."

## Order of operations

1. Run evals live, fill brackets or trigger a pre-decided contingency → 2. rehearse film mode live twice on the Docker stack → 3. record footage → 4. generate VO and time it → 5. cut in Kite, picture locked to VO → 6. export, watch at Devpost-embed size, submit.

Item 1 is the critical path. Everything after it is execution, not decision.
