# Alibaba Cloud Deployment Proof

**Proof recording (backend running on Alibaba Cloud ECS):** https://youtu.be/JRWeV3wfYt4

The backend was deployed to an Alibaba Cloud ECS instance using
[`deploy.sh`](../deploy.sh), which builds the Docker images and brings the
stack up on the instance over SSH. The recording shows the ECS console with
the running instance and the backend answering on the instance's public IP at
`/api/health` ([`backend/app/main.py`](../backend/app/main.py), `GET /api/health`).
The instance is not kept running continuously between judging sessions.

## Alibaba Cloud services and APIs in code

| Where | What |
| --- | --- |
| [`backend/app/llm.py`](../backend/app/llm.py) | Every model call goes through Alibaba Cloud Model Studio (DashScope) via its OpenAI-compatible endpoint — `qwen-plus` (chat), `qwen-flash` (observer), `qwen-max` (dream/judge), `text-embedding-v4` (embeddings) |
| [`backend/app/config.py`](../backend/app/config.py) | DashScope endpoint configuration (`https://dashscope-intl.aliyuncs.com/compatible-mode/v1`) and per-role model routing |
| [`docker-compose.yml`](../docker-compose.yml) | Deployment configuration passing the DashScope credentials and Qwen model IDs to the backend |
| [`deploy.sh`](../deploy.sh) | ECS deployment script (build, ship, run on the instance) |
| [`backend/scripts/env_check.py`](../backend/scripts/env_check.py) | Verifies DashScope connectivity and model availability |

No API keys or secrets are committed to this repository.
