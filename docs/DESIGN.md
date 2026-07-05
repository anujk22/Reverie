# Reverie Design Specification

Source: Fable 5 PRD, sections 0, 4, 5.9, 9, 10, 11, and 14.

This document preserves the frontend and product design contract from the PRD. It
is not a redesign and it is not a status report. Treat it as the reference for
M5 and M6 implementation.

## Design Laws

### Every Capability Has A Pixel

The core product law is that every backend capability must be visible on screen.
If the system does something clever and the UI does not show it happening, the
feature does not exist.

When backend sophistication conflicts with visible feedback, visible feedback
wins. The demo is the product.

### Event-Truthful UI

Memory is event-sourced, and the UI must animate from real events. The
Constellation must replay the memory event log on load and update from the live
SSE stream. It must never fake state transitions for theater.

### Deployment Before Decoration

No real visual work begins until a stub is live on Alibaba ECS. The PRD explicitly
orders the work so M0 deployment proof comes before the Constellation and design
system. Current placeholder screens are allowed before this gate; the full design
belongs to M5 and M6.

### Frontend Self-Review

After every frontend milestone, render and inspect screenshots of every screen at:

- `1440x900`
- `390x844`

Compare those screenshots against this design spec and the banned-patterns list.
If a screen reads as "a dashboard with buttons and text," it fails and must be
iterated before the milestone is marked done.

## Product Shape

Reverie is a split-screen tutoring app.

Left side: the conversation with Maya, a Calculus I student.

Right side: the Constellation, a live map of everything Reverie knows about her.
Memories form, glow, connect, strengthen, fade, merge, and get overwritten in
real time as the tutoring session and dream cycle run.

Surrounding screens:

- Session: conversation, live Constellation, and Context Budget Meter.
- Dream: the consolidation cycle as a live process.
- Memory Inspector: engram details, provenance, and lifecycle history.
- Evals: proof that memory improves tutoring versus baselines.
- Conductor: hidden demo route for scripted playback and clock control.
- Architecture: app-styled architecture card for the demo close.

## Aesthetic Thesis

Reverie is a quiet observatory at night.

It watches a mind and maps it like a night sky. The interface is dark, still,
and precise. The only living, luminous thing is memory itself.

All boldness is spent on one signature element: the Constellation. Everything
around it must be disciplined, editorial, and typographically confident.

The product should feel like:

- quiet, not empty
- precise, not clinical
- luminous, not flashy
- editorial, not dashboard-like
- alive, not busy

## Technology Choices

These frontend choices are fixed by the PRD:

| Area | Choice | Purpose |
| --- | --- | --- |
| App | Next.js 14+, App Router, TypeScript | Reliable implementation path |
| Styling | Tailwind CSS | Token-driven layout and surfaces |
| Motion | Framer Motion | High-quality state transitions |
| Constellation | HTML5 Canvas + d3-force | Custom visual control, no generic graph-library look |
| Charts | Recharts | Eval charts styled to the design tokens |
| Realtime | Server-Sent Events | Backend-to-frontend memory and dream events |

## Design Tokens

Everything must derive from these tokens. Do not introduce alternate palettes or
ad hoc visual systems.

### Colors

| Token | Hex | Use |
| --- | --- | --- |
| `void` | `#070B14` | App background |
| `field` | `#0D1424` | Panels and cards |
| `field-2` | `#131C31` | Raised surfaces and hover states |
| `hairline` | `#1E2A44` | One-pixel borders only |
| `starlight` | `#E9EDF6` | Primary text |
| `dim` | `#8A94AD` | Secondary text and labels |
| `faint` | `#4A5674` | Tertiary text, disabled state, archive belt |
| `ember-amber` | `#E8A33D` | Primary accent, semantic memory, glow, primary actions |
| `amber-glow` | `#FFD9A0` | Node cores and pulse highlights |
| `sage-teal` | `#3FBFAD` | Mastery engrams and success states |
| `coral` | `#E5534B` | Misconception engrams and contradiction flashes |
| `moth` | `#B9A7E8` | Preference and affect node tint only |

`moth` is restricted. It may tint preference and affect nodes, but must never be
used for backgrounds or gradients.

### Engram Color Rules

| Engram type | Color |
| --- | --- |
| `misconception` | `coral` |
| `mastery` | `sage-teal` |
| `preference` | `moth` |
| `affect` | `moth` |
| `goal` | `ember-amber` |
| `fact` | `ember-amber` |
| `strategy_outcome` | `ember-amber` |

Status overrides type hue. Superseded and archived memories desaturate toward
`faint`.

### Typography

| Role | Face | Use |
| --- | --- | --- |
| Display | Fraunces, Google Fonts, optical size axis on | H1, H2, session titles, big eval numbers |
| Body/UI | Inter | 14-16px UI and body copy |
| Data | JetBrains Mono | Scores, token counts, timestamps, confidence values, strengths |

Display settings:

- Fraunces weight: 550-620.
- Tight leading for large display text.
- Slight negative tracking on display text.

Scale:

- `12`
- `14`
- `16`
- `20`
- `28`
- `40`
- `64`

Eyebrow labels:

- 11px Inter.
- Uppercase.
- `0.08em` letter spacing.
- `dim` color.

Every number in the app must be rendered in JetBrains Mono.

### Spacing, Shape, Depth

- Use an 8px spacing grid.
- Cards use 8px radius.
- Controls use 6px radius.
- Chips and nodes use full radius.
- Borders are one pixel only.
- No heavy borders.
- No shadows.
- Depth comes from field layering, hairlines, and memory glow.
- Glow belongs only to memory elements.

Memory glow:

```css
box-shadow: 0 0 24px rgba(232, 163, 61, 0.25);
```

Scale the glow by memory strength.

### Motion

Default motion:

- Framer Motion easing: `[0.22, 1, 0.36, 1]`
- Default duration: 300-500ms.

Constellation ambient motion:

- Slow node drift.
- Position noise: plus or minus 2px over 6s.
- Strength-proportional glow breathing.
- Glow cycle: 4s.
- The effect should feel alive, not busy.

Major state moments:

- Fusion.
- Contradiction.
- Dream stages.
- Use choreographed 600-900ms sequences.

Reduced motion:

- Disable ambient drift.
- Keep state changes as fades.

## App Shell

Use a left rail, not a top navbar.

Shell requirements:

- 64px left rail.
- Icon-only navigation.
- Routes: Session, Dream, Evals.
- Tooltips on hover.
- Fraunces wordmark "Reverie" at the top, rotated or stacked.
- Student chip "Maya C." at the bottom.
- Content area fills all remaining space.
- No top navbar.
- No footer.

If the simulated clock offset is active, show a dim mono chip in the shell with
the simulated date. This is an honesty cue for the demo.

## Screen: Session

The Session screen is the hero screen. Most frontend build time belongs here.

Desktop layout at `>=1280px`:

- Two columns.
- Left column: 44%.
- Right column: 56%.

Structural sketch:

```text
+----+--------------------------+----------------------------------+
|rail| SESSION 2 - CHAIN RULE   |             canvas               |
|    | eyebrow: JULY 5 - 14 MIN |        THE CONSTELLATION         |
|    |                          |       stars, drift, glow         |
|    | conversation stream      |                                  |
|    | student <-> tutor        |       outer dim archive belt     |
|    |                          |----------------------------------|
|    | composer             Enter| CONTEXT BUDGET 1054 / 1200      |
+----+--------------------------+----------------------------------+
```

### Conversation

Do not use avatars. Do not use bubbles with tails.

Student messages:

- Right-aligned.
- `field-2` rounded blocks.

Tutor messages:

- Left-aligned.
- No container.
- Starlight text directly on the void.
- 2px `ember-amber` left rule.
- Stream token by token.

Timestamps:

- Mono.
- Visible on hover only.

Memory-used chips:

- When a tutor reply uses specific engrams, show a subtle row of tiny node chips
  below the reply.
- Example copy: `drawing on: chain-rule misconception - worked-examples preference`.
- Hovering a chip pulses the corresponding Constellation star.

This hover-link between conversation text and the sky is a signature
micro-interaction. It must be built.

### Constellation

The Constellation is a custom canvas rendering backed by d3-force layout. d3
computes positions; the app owns rendering.

Physics:

- Charge: `-80`.
- Link strength: `0.3`.
- Collision radius by node radius.
- Gentle center force.
- Compute positions in a worker-like `requestAnimationFrame` loop.
- Render at `devicePixelRatio`.

Node rules:

- Radius: 4-14px by importance.
- Core color: `amber-glow` or type hue.
- Halo opacity: memory strength.
- Provisional memories: 40% opacity plus dashed halo ring.
- Archived memories: 15% opacity in the archive belt.

Link rules:

- Episodic provenance links are faint hairline strands.
- Show provenance links only for hovered or selected nodes to avoid a hairball.
- Superseded-to-successor links appear as fading strands.
- Semantic clusters gather loosely by shared `subject_tags`.
- Use extra weak links between nodes with the same tag.

Archive belt:

- Dim ring near the canvas edge.
- Archived stars drift outward to it over 2s.
- Archived stars remain visible at 15% opacity.
- Forgetting must be visible.

Hover:

- Node scales to 1.3x.
- Tooltip shows type eyebrow, content, strength, and confidence.
- Strength and confidence are mono.

Click:

- Opens the Memory Inspector.

New engram:

- Star materializes from the direction of the conversation panel.
- 600ms scale and glow-in.
- Toast appears bottom-left.
- Toast eyebrow: `NEW MEMORY`.
- Toast body: one line of memory content.

Empty state before Session 1:

- Nearly black sky.
- Faint static stars.
- Centered Fraunces italic line:

```text
Reverie hasn't met Maya yet. Everything she teaches it will appear here.
```

The empty state should feel like an invitation, not a void.

### Context Budget Meter

The meter sits below the Constellation and is collapsible.

Header:

```text
WORKING MEMORY - 1054 / 1200 TOKENS
```

Header is mono.

Bar:

- Horizontal stacked segments.
- One segment per selected engram.
- Segment color follows engram type.
- Segment width is proportional to token count.

Hover behavior:

- Hovering a segment opens a score breakdown popover.
- Example: `sim .34 - strength .28 - recency .09 - prior .10 = .81`.
- The corresponding star pulses.

Excluded memories:

- Beneath the bar, show the top two excluded memories.
- Use dim text.
- Include concrete reasons.
- Example: `excluded: budget exhausted (needed 91 tokens, 40 left)`.

This meter is the visible answer to the "limited context window" rubric line. It
must be on screen at all times.

## Screen: Memory Inspector

The inspector is a right-side drawer over the Constellation.

Desktop width:

- 420px.

Mobile behavior:

- Bottom sheet.

Header:

- Type eyebrow in the type hue.
- Status chip.

Content:

- The memory sentence is the emotional object.
- Set it large in Fraunces.
- Treat it as a belief about a person, not a database row.

Stats row:

- Mono.
- Include confidence, strength, recall count, and birth date.
- Example: `confidence 0.72 - strength 0.83 - recalled x3 - born Jul 4`.

Provenance:

- Quoted utterance excerpts.
- Use `field-2` blocks.
- Add hairline left rule.
- Include session/date label.
- Example: `said Jul 4, Session 1`.
- Click jumps or scrolls the conversation to that message when same-session.

Lifecycle:

- Vertical event timeline.
- Include events such as observed, consolidated, reinforced, superseded,
  decayed, and archived.
- Timestamps are mono.

Superseded state:

- Show a banner strand linking to the successor.
- Copy pattern: `overwritten by ...`.
- Clicking navigates to the successor memory.

## Screen: Dream

Use a centered column.

Column width:

- Max 720px.

Idle state:

- Show the latest Dream Report card.

Running state:

- Triggered by session end or Conductor.
- Show a stage list:
  - Replay
  - Distill
  - Deduplicate
  - Reconcile
  - Decay
  - Report

Each stage row:

- Eyebrow stage name.
- Live status.
- Hairline spinner while running.
- `sage-teal` check when complete.
- Mono count that ticks live.
- Example: `3 memories confirmed - 1 revised - 1 rejected`.

Above the stages:

- Slim horizontal mini-constellation.
- It must show live merge and dimming events during the dream.

Top copy:

```text
Reverie is dreaming about Session 1.
```

Use Fraunces.

Completion state:

- Dream Report card.
- Include per-stage counts, duration, and tokens.
- All numeric data is mono.

Session-screen compact dream state:

- Composer disabled.
- Composer replaced by a breathing amber line and `Dreaming...`.
- This lets the demo stay on the split view when needed.

## Screen: Evals

Headline:

```text
Does memory make it better? Proof.
```

Use Fraunces.

Legend:

| Condition | Visual tone |
| --- | --- |
| No memory | faint |
| Full history | dim |
| Reverie | ember-amber |

Charts:

- Use Recharts.
- Style charts to the design tokens.
- Hairline grid.
- Mono axes.

Required charts:

1. Personalization score per session.
   - Grouped bars.
   - Scale: 1-5.
2. Recall precision per session.
   - Lines.
3. Tokens per session.
   - Bars.
   - Reverie should read flat and low.
   - Full-history should read as climbing.

Below charts:

- Run metadata.
- `Run evals` button.
- Live progress.

Headline stats:

- Render huge in Fraunces.
- Example: `+2.1 personalization by Session 3 at 0.4x the tokens`.

Data honesty:

- Eval numbers must come from real runs.
- If live evals are slow on camera, Conductor may load pre-baked real eval
  results, but numbers must not be synthetic or hand-edited.

## Screen: Conductor

Route:

- `/conductor`
- Only available when `DEMO_MODE=true`.

The Conductor is exempt from full polish but must remain dark and not ugly.

Required controls:

- Reset demo.
- Play Session 1 script.
- End session and dream.
- Advance clock +1 day.
- Advance clock +3 days.
- Play Session 2 script.
- Run evals.
- Load pre-baked eval results.

Playback:

- Student turns auto-play with natural typing pacing.
- Typing speed: 20-35 characters per second.
- Tutor replies are live model calls.

Keyboard:

- Numeric shortcuts such as `1`, `2`, `3`, etc.
- Saf should be able to drive the demo off-screen while recording.

## Screen: Architecture

The architecture route is recorded in the demo. It must render the architecture
diagram in Reverie's own design system, not as slideware.

Requirements:

- Restyle the Mermaid architecture colors to the design tokens.
- Keep the Constellation and memory system as the visual product center.
- Include "Qwen on Alibaba Cloud" as part of the demo close.

## Capability To Pixel Contract

This table is binding. Do not ship a backend capability whose pixel is missing.

| Backend capability | Required pixel |
| --- | --- |
| Observer extracts engram live | New faint star materializes in the Constellation within 2s after exchange, with one-line toast naming it |
| Provisional engram becomes consolidated | Star solidifies during Dream with opacity and scale increase |
| Dedup merge | Two stars drift together and fuse, with a brief flash |
| Contradiction resolution | Losing star flashes coral, desaturates, shrinks, and links by strand to successor |
| Decay | Stars visibly dim between sessions; time-skip makes this dramatic |
| Archive / forgetting | Star drifts to dim outer archive belt |
| Reinforcement | Star pulses and brightens when retrieved |
| Budgeted retrieval | Context Budget Meter shows token bar, winner chips with score breakdown, and excluded list with reasons |
| Provenance | Inspector shows exact quoted utterances; click scrolls to conversation message when same-session |
| Dream pipeline stages | Dream view stage checklist progresses live with per-stage counts |
| Token accounting | Evals screen shows cost per session per condition |
| Eval improvement | Charts compare Reverie against two baselines across three sessions |

## Core User Flows

### F1: Tutoring Turn

1. Student sends a message.
2. Tutor streams a reply.
3. Observer extracts 0-3 candidate engrams in parallel.
4. Valid candidates write `engram.observed` events.
5. Constellation shows new faint stars within about 2s.

### F2: Session End To Dream

1. Student session ends.
2. Dream cycle is enqueued.
3. Dream view or compact dream indicator shows each stage.
4. Constellation updates for merges, contradictions, and decay.

### F3: Session Open With Memory

1. New session opens.
2. Budgeted retrieval assembles the memory pack.
3. Context Budget Meter shows winners and reasons.
4. Tutor opening visibly uses selected memories without sounding robotic.

### F4: Inspect

1. User clicks a node.
2. Inspector opens.
3. Inspector shows type, content, confidence, strength, access history,
   provenance quotes, and lifecycle timeline.

### F5: Prove

1. User runs or replays evals.
2. Evals screen renders the three-condition charts.
3. Token cost and personalization gains are visible.

## Demo Beat Requirements

The product must make this three-minute film effortless.

| Time | Beat | Required screen behavior |
| --- | --- | --- |
| 0:00-0:15 | Thesis | Empty-sky state with narration: "Every AI tutor has amnesia. Reverie remembers - and you can watch it think." |
| 0:15-0:50 | Session 1 | Scripted conversation auto-plays; Maya flubs chain rule; stars materialize live; hover misconception star |
| 0:50-1:20 | The Dream | End session; Dream stages tick; a merge fuses on mini-constellation; report card lands |
| 1:20-1:35 | Time skip | Conductor advances clock +1 day; stars visibly dim |
| 1:35-2:05 | Session 2 | Budget meter assembles pack; tutor opens on yesterday's struggle; Maya succeeds; coral misconception dims and is superseded by sage-teal mastery |
| 2:05-2:35 | Proof | Evals screen shows three-condition charts and huge Fraunces headline stat |
| 2:35-3:00 | Architecture and close | Architecture card, Qwen on Alibaba Cloud, final before/after memory state |

Demo constraints:

- Scripted session playback must have natural typing.
- Every capability-to-pixel requirement must function.
- Time skip must be visible and honest.
- The architecture card must be in-app, not a slide.
- The final demo should require zero manual DB edits.

## Responsive And Accessibility Floor

Breakpoint below `1024px`:

- Constellation becomes a top panel.
- Constellation height: 40vh.
- Conversation sits below the Constellation.
- Inspector becomes a bottom sheet.

Keyboard:

- Visible focus rings.
- Focus ring color: `ember-amber`.
- Focus ring offset: 2px.
- Inspector closes with Escape.
- Composer submits with Enter.

Screen reader support:

- Canvas nodes must have an offscreen DOM list alternative.
- New-memory toasts must use `aria-live`.

Reduced motion:

- Disable ambient node drift.
- Preserve state changes as fades.

## Banned Patterns

Any of these is an auto-fail:

- Purple or blue gradients.
- Any gradient backgrounds.
- Glassmorphism.
- Emoji anywhere in UI.
- Centered hero plus three feature cards.
- Default shadcn look.
- Borders heavier than 1px.
- More than one accent per view, except sanctioned Constellation type hues.
- Lorem ipsum.
- More than two stacked toasts.
- Spinners where skeletons fit.
- Title Case Buttons.
- Exclamation marks in UI copy.

## Milestone Scope

### M5: Design System And Session

Deliverables:

- Design system.
- Shell.
- Session screen.
- Constellation.
- Inspector.
- Context Budget Meter.

Acceptance:

- Screenshot review passes.
- Every M2 and M4 capability has its required pixel.

### M6: Dream, Evals, Architecture

Deliverables:

- Dream view.
- Evals screen.
- Architecture card.

Acceptance:

- Dream stages animate from real events.
- Charts render from real eval JSON.

### M7: Demo Proof

Deliverables:

- Eval harness.
- EVALS.md.
- Conductor.
- Demo scripts.
- Clock control.

Acceptance:

- Full eval run completes.
- Forgetting check passes.
- Full demo beat sheet is drivable from Conductor with no manual DB edits.

## Cut Order

If time compresses, cut in this order:

1. M9 handwriting stretch.
2. Evals screen, but keep the harness and EVALS.md numbers.
3. Inspector lifecycle timeline.

Never cut:

- Live Constellation events.
- Dream view.
- Context Budget Meter.
- Deployment.
- Eval numbers.

## Non-Goals

Do not build:

- Multi-student auth or accounts.
- Multi-subject support.
- Voice.
- Mobile-first layouts.
- RAG over textbooks.
- Gamification, streaks, or points.
- Admin panels.
- WebSockets.
- Kubernetes.
- Queue infrastructure.
- Fine-tuning.

## Implementation Checklist

Use this checklist before marking frontend design milestones done.

- [ ] Shell uses 64px left rail, no top navbar, no footer.
- [ ] Tokens match this file exactly.
- [ ] Fraunces, Inter, and JetBrains Mono are loaded and assigned by role.
- [ ] Every number uses JetBrains Mono.
- [ ] Session layout uses 44% / 56% columns at desktop widths.
- [ ] Conversation has no avatars and no bubble tails.
- [ ] Tutor message memory chips pulse corresponding stars on hover.
- [ ] Constellation renders from real graph state and real SSE events.
- [ ] New observed engrams become faint stars within about 2s.
- [ ] Provisional, consolidated, merged, superseded, decayed, archived, and reinforced states each have visible pixels.
- [ ] Context Budget Meter is always present and shows winner and excluded reasoning.
- [ ] Inspector shows content, stats, provenance, lifecycle, and successor link when superseded.
- [ ] Dream view shows live stages and mini-constellation.
- [ ] Evals screen uses real eval JSON only.
- [ ] Conductor can drive the demo beat sheet.
- [ ] Reduced-motion mode disables ambient drift.
- [ ] Canvas has offscreen DOM alternative.
- [ ] Screens pass `1440x900` and `390x844` screenshot review.
- [ ] No banned pattern appears on any screen.
