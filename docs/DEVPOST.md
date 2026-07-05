# Devpost Description Draft

Reverie is a memory engine wearing a tutoring skin.

Most AI tutors have amnesia: they answer the current turn, but they do not build
a durable model of the learner. Reverie makes that memory lifecycle visible. It
extracts typed observations from a session, dreams between sessions to consolidate
and reconcile them, forgets stale memories through decay, and recalls only the
highest-value memories that fit a fixed token budget.

The engine contains zero calculus knowledge. Calculus is only the demo subject,
held in the tutor prompt and the scripted Maya turns. The same memory machinery
works for another subject without architectural change, which is covered by the
Spanish-conjugation tests in `backend/tests/test_dedupe.py`.

Built with Next.js, FastAPI, SQLite, Qwen on Alibaba Cloud, `qwen-plus`, and
`text-embedding-v4`.
