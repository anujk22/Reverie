# Devpost Description Draft

Reverie is a visible memory engine: extraction with provenance receipts, dream consolidation, Ebbinghaus decay, and budgeted retrieval are all watchable in real time.

## Inspiration

Memory is the missing layer for any AI that serves the same human twice: a learner across weeks, a patient across visits, a customer across tickets. Context windows aren't memory; they are cost. Reverie makes memory a first-class, inspectable, budgeted system.

## What It Does

The demo scenario is the hardest memory workload we could give it: one person, under pressure, returning across multiple support sessions. Lena Park is moving her store onto the platform before a sale date. She brings a clear misconception about webhook retries, a preference for exact steps with real values, frustration from a failed order sync, and a stale shipping-zone question that should fade. Reverie extracts typed memories with exact transcript receipts, dreams over them between sessions, lets stale memories decay, and retrieves only the highest-value memories that fit a fixed budget. It remembers not just what the user got wrong but how they felt, and adapts.

The engine contains zero domain knowledge. Swap one script file and the same engine remembers a customer across support tickets, a patient across visits, an engineer across a codebase. The test suite proves it.

Reverie uses multi-model Qwen orchestration: `qwen-flash` for the high-frequency observer, `qwen-plus` for assistant conversation, `qwen-max` for dream/judge work, and `text-embedding-v4` for retrieval. The backend is FastAPI and SQLite; the frontend is Next.js with a live canvas mind map, Dream view, Conductor, and Evals dashboard.

The eval harness compares three conditions across identical scripted sessions: no memory, full transcript history, and Reverie. Live eval numbers are written to `EVALS.md`; mock runs are labeled `real_run=false` and never become claims.

Track: MemoryAgent.
