# Devpost Description Draft

Reverie is a memory engine wearing a tutoring skin.

Most AI tutors have amnesia. They answer the current turn, but they do not build a durable, inspectable model of how a learner thinks. Reverie makes that memory lifecycle visible. During a tutoring session, it extracts typed observations with provenance. Between sessions, it dreams over the evidence: confirming, revising, merging, reconciling, decaying, and archiving memories. When the learner returns, it recalls only the highest-value memories that fit a fixed context budget.

The demo subject is Calculus I, with Maya confusing chain rule and product rule. The engine itself contains zero calculus knowledge. Subject-specific material lives in the tutor prompt and scripts; the memory pipeline is typed, event-sourced, and tested with a Spanish-conjugation duplicate-guard case.

Reverie uses multi-model Qwen orchestration: `qwen-flash` for the high-frequency observer, `qwen-plus` for tutor conversation, `qwen-max` for dream/judge work, and `text-embedding-v4` for retrieval. The backend is FastAPI and SQLite; the frontend is Next.js with a live canvas mind map, Dream view, Conductor, and Evals dashboard.

The eval harness compares three conditions across identical scripted sessions: no memory, full transcript history, and Reverie. Live eval numbers are written to `EVALS.md`; mock runs are labeled `real_run=false` and never become claims.

Track: MemoryAgent.
