# Alibaba Cloud Deployment Proof

Reverie was fully deployed and running on Alibaba Cloud Elastic Compute Service
(ECS) in the **US (Silicon Valley)** region during the submission period. The
evidence was captured on July 18, 2026, before the ECS instance was released.
The historical deployment is no longer online, and this repository does not
claim a currently live public endpoint.

## 1. Qwen Cloud API proof in production code

The canonical source link is:

**[`backend/app/config.py` — Qwen Cloud endpoint and per-role model routing](https://github.com/anujk22/Reverie/blob/main/backend/app/config.py)**

That production file defines the international DashScope OpenAI-compatible base
URL directly:

```text
https://dashscope-intl.aliyuncs.com/compatible-mode/v1
```

[`backend/app/llm.py`](../backend/app/llm.py) passes the configured base URL and
environment-provided API key to `AsyncOpenAI`. The API key is never hardcoded or
committed. The deployed roles were:

- `qwen-plus` for assistant responses
- `qwen-flash` for memory observation and extraction
- `qwen-max` for dream consolidation and evaluation judging
- `text-embedding-v4` for semantic retrieval

## 2. Original Alibaba Cloud deployment evidence

The original visual evidence is attached directly to the **Proof of Deployment
on Alibaba Cloud** field in the Devpost submission, as requested by the
organizers:

- An Alibaba Cloud Workbench capture shows the backend, frontend, and Nginx
  containers running on ECS. Its health response shows database availability,
  DashScope reachability, `mock: false`, and the configured Qwen and embedding
  model IDs.
- An Alibaba Cloud ECS Console capture shows the instance in **Running** status
  in the US (Silicon Valley) region, together with its host and CPU activity.

The displayed public IP belonged to the released submission instance and is no
longer active. The screenshots are submission evidence rather than application
source assets; they are therefore supplied through Devpost instead of duplicated
in this repository.

## Deployment topology

The ECS host ran Docker Compose with:

- Nginx as the public reverse proxy
- Next.js as the frontend server
- FastAPI as the backend and memory engine
- SQLite as the persistent memory ledger
- live Qwen Cloud access through Alibaba Cloud Model Studio (DashScope)

The repeatable procedure is documented in [`DEPLOY.md`](./DEPLOY.md), the stack is
defined in [`docker-compose.yml`](../docker-compose.yml), and the deployment
automation is in [`deploy.sh`](../deploy.sh). The full system architecture is in
[`ARCHITECTURE.md`](./ARCHITECTURE.md).

## Evidence boundary

The Devpost attachments are original captures of the real deployment. They are
not local-run screenshots or reconstructed mockups. No API key, password,
private key, or other credential is included.
