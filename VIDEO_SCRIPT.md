# Reverie — 3-Minute Demo Video Script

Target runtime: ~2:55 (hard cap 3:00 — lock the cut at ≤2:57). Narration: ElevenLabs (~390 words; slow to ~0.95x on the forgetting beat and the final thesis line only — the close's list reads at 1x, it does not fit slowed). The word count is deliberately under-stuffed: the film breathes through the name animation, the dream choreography, and the forgetting hold.
Format: 10s failure cold open → cinematic name animation → live demo with zoom/popout edits → close.
Editor: Kite. Footage spine: film mode (`?film=1`), live backend only — **never MOCK** (visible MOCK chip is disqualifying per project rules).

**Framing rules (non-negotiable):** the words "tutor," "tutoring," and "student" never appear in this video. The persona is **Lena**, a merchant migrating her online store onto a commerce platform. Her scenario is presented as *one workload* the engine happens to be running, never as the product category — the close makes the domain-swap explicit. Reverie is a memory engine — infrastructure with a visible mind.

**Blockers before recording (item 1 is the critical path — nothing downstream matters until it lands):**

- [x] **Live eval run complete** — fills the bracketed numbers `[X] [Y] [Z] [N]` in the Evals beat. Both contingencies are pre-decided in that beat; no judgment calls on edit night.
- [x] Repositioning pass landed (Maya → Lena everywhere, affect-adaptive session opening verified — commit 55d5bda)
- [x] Session 2 script timeline fixed — "yesterday" → "a few days ago," and Lena no longer announces her own misconception or preference (the recall has to be earned, not prompted)
- [x] Demo domain swap (calculus → store migration) landed, committed, and verified: purity grep clean, 27+ tests green, 11/11 film beats replay
- [x] ~14s of "amnesiac assistant" footage for the cold open (no_memory eval condition on screen, or a staged generic chat blanking on a returning user — staged footage is fine here because it isn't Reverie, but it must show zero Reverie chrome and no MOCK chip)
- [x] Film mode replayed end-to-end **twice** on the live Docker stack before any take counts as good

---

## [00:00 – 00:14] THE FAILURE COLD OPEN

**Screen / Director Notes:**
- [Page: Standard generic chat window or `/evals` page under `no_memory` condition]
- Start with a generic chat window (neutral cream tones, no memory indicators).
- User types: *"Can we pick up with the webhook order sync setting we discussed?"*
- The assistant replies: *"Hi there! I don't have access to prior conversations. Could you explain what you're working on?"*
- **Visual Action:** ZOOM slightly on the generic reply to capture the feeling of amnesia.

> Every AI product ships with the same flaw. Your users explain themselves — their goals, their preferences, what they struggle with — and the moment the session ends, it's gone. Context windows aren't memory. They're a goldfish with a bigger bowl.

## [00:14 – 00:17] NAME ANIMATION

**Screen / Director Notes:**
- Transition to a black card that fades into the deep warm brown-black shell background.
- Large typography: **REVERIE** in center.
- Fade-in the faint neural outline of the brain graphic behind the text.

> Meet Reverie. A memory engine you can watch think.

## [00:17 – 00:50] SESSION 1 — MEMORY FORMS

**Screen / Director Notes:**
- [Page: Main `/` Session workspace]
- Starts with an empty `Memory Constellation` canvas on the right (0 glowing nodes).
- Lena's first message streams in the chat pane.
- **Visual Action:**
  - ZOOM in on the chat message as it mentions: *"I'm terrified the webhook order sync will break during launch."*
  - Toast notification slides in on the bottom-right: `engram.observed` (shows type: `misconception`, model: `observer · qwen-flash`).
  - PAN to the Memory Constellation as a new red/orange node ignites and starts pulsing on the canvas.
  - **Click** the node to open the **Inspector Panel** on the left. Highlight the exact quote: *"Webhook order sync will break..."*

> To prove it, we gave it a real workload: one user, one messy multi-day problem. Lena is migrating her store onto a new platform, with a launch date bearing down. This brain starts empty. She starts talking — and watch the right side. A Qwen-flash observer just caught something: a misconception about how the platform retries failed orders — typed, scored, and pinned to the moment she said it.
> Every memory carries a receipt — the exact words from the transcript. No quote, no memory. Nothing here is hallucinated.

**Screen / Director Notes:**
- Return to a WIDE shot of the workspace.
- Lena enters a few more messages (simulating timeline progress).
- **Visual Action:** Watch 3-4 other nodes (goals, preferences, affect) ignite in different colors (sage, gold, coral) across the constellation.

> One session in, Reverie holds her goal, her preferences, even her anxiety — each one an event on an append-only ledger.

## [00:50 – 01:20] THE DREAM

**Screen / Director Notes:**
- **Visual Action:**
  - Click the **"End Session"** button on the top header.
  - The screen dims slightly, and the Constellation canvas enters "Dream Mode" choreography (nodes pulse and connect lines dynamically).
  - Cut to the `/dream` report page.
  - ZOOM in on the **Dream Report Numbers** (distilled, merged, reconciled counts). The `2 merged` or `1 superseded` counters should stand out in large ember typography.
  - Scroll down to the dream stage logs showing: `Replay` ➡️ `Distill` ➡️ `Deduplicate` ➡️ `Reconcile` ➡️ `Decay` stage transitions.

> Then the session ends, and Reverie sleeps. It replays the day, distills what mattered, merges duplicates, and resolves contradictions. Watch — two memories just became one. Qwen-max proposes. Deterministic code disposes. Every decision is on the ledger.

## [01:20 – 01:35] FORGETTING

**Screen / Director Notes:**
- [Page: Main `/` Session workspace / Conductor pane]
- **Visual Action:**
  - Click the **Conductor** action to *"Advance Clock +3 Days"*.
  - Maintain a WIDE shot focused entirely on the Constellation canvas.
  - Watch the older, unreinforced fact nodes (e.g., incidental questions about shipping zones) visibly dim from active color to a faint, dark-moth opacity.
  - **Slow zoom-in** on the fading nodes. Let the visual breathe for 2 seconds of stillness.

> Now, three days pass. Watch the brain. Memories she hasn't touched decay along a forgetting curve — because a memory that never forgets isn't memory. It's a landfill.

## [01:35 – 02:10] RECALL — THE PAYOFF

**Screen / Director Notes:**
- [Page: Main `/` Session workspace, Session 2 starting]
- **Visual Action:**
  - Open Session 2.
  - ZOOM immediately on the **Context Budget Meter** at the bottom as it dynamically fills to show `425 / 1,200 tokens`.
  - Pan up to the Chat Pane as the assistant's opening message streams.
  - Highlight the first sentence of the assistant's reply, where it unprompted references the webhook retry concern in a gentle, low-pressure tone.

> Lena returns. Reverie doesn't reload her transcript — it retrieves under a budget. Twelve hundred tokens, scored on relevance, strength, and recency. It knows what she got wrong three days ago — she never had to say it twice.
> It even remembered how frustrated she was when her orders wouldn't sync — and changed how it responds.

**Screen / Director Notes:**
- **Visual Action:**
  - ZOOM in on the bottom of the Inspector Panel under **"Excluded Memories"**.
  - Show the items labeled: `incidental_shipping_zone_question (decayed, score: 0.12 - below threshold)`.

> And it shows its work: what it recalled, what it left out, and why.

## [02:10 – 02:30] EVALS

**Screen / Director Notes:**
- [Page: `/evals` page]
- ZOOM in on the main headline comparison: **"Reverie 4.7 vs 1.0 without memory"**.
- Scroll down and focus on the **Token Efficiency Comparison Bar Visuals**.
- **Visual Action:** Highlight the orange `reverie` token bar (flat, narrow) versus the long `full_history` token bar (skyrocketing).

> We measured it against two baselines — no memory at all, and stuffing the entire history into context. Reverie scored 4.7 on personalization versus 1.0, recalled 100 percent of planted facts, and used 68 percent fewer tokens than full history. Measured, not asserted.

## [02:30 – 02:55] CLOSE

**Screen / Director Notes:**
- [Page: `/architecture` page]
- **Visual Action:**
  - Show the main architecture card.
  - ZOOM in on the **Runtime Stack** panel, highlighting the row showing **"Qwen on Alibaba Cloud"** (with observer, assistant, judge model IDs).
  - Pull back to the main session page showing the fully-populated `Memory Constellation` brain glowing with connected nodes.
  - Fade to black with the logo.

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
