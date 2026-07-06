# Reverie — 3-Minute Demo Video Script

Target runtime: ~2:55. Narration: ElevenLabs (~420 words, slight slowdown ~0.95x on the forgetting and close beats).
Format: 10s failure cold open → cinematic name animation → live demo with zoom/popout edits → close.
Editor: Kite. Footage spine: film mode (`?film=1`), live backend only — **never MOCK** (visible MOCK chip is disqualifying per project rules).

**Framing rules (non-negotiable):** the words "tutor," "tutoring," and "student" never appear in this video. The persona is **Lena**. The learning scenario is presented as a deliberate *stress test* of the engine, never as the product category. Reverie is a memory engine — infrastructure with a visible mind.

**Blockers before recording:**

- [ ] Live eval run complete — fills the bracketed numbers `[X] [Y] [Z] [N]` in the Evals beat
- [ ] Repositioning pass landed (Maya → Lena everywhere, affect-adaptive session opening verified on camera)
- [ ] ~14s of "amnesiac assistant" footage for the cold open (no_memory eval condition on screen, or a plain generic chat mock blanking on a returning user)

---

## [00:00 – 00:14] THE FAILURE COLD OPEN

**Screen:** a plain, generic chat UI (or the no-memory eval condition). A returning user asks "Where were we?" and gets a bland "Hi! What would you like to work on today?"

> Every AI product ships with the same flaw. Your users explain themselves — their goals, their preferences, what they struggle with — and the moment the session ends, it's gone. Context windows aren't memory. They're a goldfish with a bigger bowl.

## [00:14 – 00:17] NAME ANIMATION

**Screen:** cinematic text: REVERIE. The dormant brain fades in behind it.

> Meet Reverie. A memory engine you can watch think.

## [00:17 – 00:50] SESSION 1 — MEMORY FORMS

**Screen:** session view. Lena's first message streams. ZOOM to the engram toast the moment it fires, then popout on the new node igniting.

> To prove it, we gave it the hardest memory workload there is: one person, learning something difficult, across multiple sessions. This brain starts empty. Lena starts talking — and watch the right side. An observer model just caught that: a misconception, typed, scored, and pinned to the moment she said it.

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

**Screen:** Session 2 opens. ZOOM on budget meter filling, then on the assistant's reply citing the misconception.

> Lena returns. Reverie doesn't reload her transcript — it retrieves under a budget. Twelve hundred tokens, scored on relevance, strength, and recency. It knows what she got wrong last week — she never repeated it.

**Screen:** hold on the reply's gentle, low-pressure phrasing.

> It even remembered she panics under pressure — and changed how it responds.

**Screen:** ZOOM — excluded memories with reasons.

> And it shows its work: what it recalled, what it left out, and why.

## [02:10 – 02:35] EVALS

**Screen:** /evals with real numbers. Popout the token comparison.

> We measured it against two baselines — no memory at all, and stuffing the entire history into context. Reverie scored [X] on personalization versus [Y], recalled [Z] percent of planted facts, and used [N] percent fewer tokens than full history. Measured, not asserted.

*Fallback if the live numbers underwhelm: cut this beat down to the token-efficiency claim only.*

## [02:35 – 02:55] CLOSE

**Screen:** /architecture card, then pull back to the fully-lit brain.

> And the engine contains zero domain knowledge — no curriculum, no calculus. Swap one script file, and the same engine remembers a customer across support tickets, a patient across visits, an engineer across your codebase. The test suite proves it. Typed memories, event sourcing, dreams, decay, budgeted recall — running on Qwen, on Alibaba Cloud. Your AI shouldn't meet its users for the first time, every time.

**Screen:** beat. Logo.

> Reverie. Memory you can watch.

---

## Production notes

- **Zoom discipline:** zoom only when the VO names a pixel (toast, quote, meter, dimming node, the gentle reply). The UI is dark and atmospheric — constant motion reads as chaos. Wide-and-still is the default; zoom is the emphasis.
- **The affect beat (01:50) is the emotional center of the film.** Give it stillness: no zoom movement while the line lands, just the reply on screen. This is the moment a judge retells to another judge.
- **Pauses:** the script has deliberate beats ("Watch —", the close). Insert real 0.5–1s gaps in the edit; don't rely on TTS to breathe.
- **Proof-listen** the ElevenLabs output at 1x before export (artifact check).
- **Record big, punch in later:** capture at full display resolution; do zooms in post so text stays sharp.
- **Test the export** at 1080p at Devpost-embed size — if the budget meter isn't readable, judges can't read it either.
- **Spare line** if the video runs short (over the architecture card): "This is not a decorative visualization — every pixel on this screen is backed by a database event."

## Order of operations

1. Repositioning pass lands (rename + affect beat) → 2. run evals live, fill brackets → 3. rehearse film mode live twice → 4. record footage → 5. generate VO → 6. cut in Kite → 7. export, watch on laptop, submit.
