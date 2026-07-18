# Alibaba Cloud Deployment Proof

## Status

**NOT READY — visual deployment evidence is pending.** Deployment screenshots are
submitted separately through Devpost and are not stored in this repository.

Do not describe ECS deployment as verified until the two redacted screenshots in
[`proof/README.md`](./proof/README.md) have been captured and reviewed:

- `docs/proof/alibaba-ecs-running.png`
- `docs/proof/alibaba-workbench-health.png`

The deployment procedure is complete and inspectable in
[`DEPLOY.md`](./DEPLOY.md); the evidence status remains pending manual capture.

## Alibaba Cloud services and APIs in code

| Where | What |
| --- | --- |
| [`backend/app/llm.py`](../backend/app/llm.py) | Every model call goes through Alibaba Cloud Model Studio (DashScope) via its OpenAI-compatible endpoint — `qwen-plus` (chat), `qwen-flash` (observer), `qwen-max` (dream/judge), `text-embedding-v4` (embeddings) |
| [`backend/app/config.py`](../backend/app/config.py) | DashScope endpoint configuration (`https://dashscope-intl.aliyuncs.com/compatible-mode/v1`) and per-role model routing |
| [`docker-compose.yml`](../docker-compose.yml) | Deployment configuration passing the DashScope credentials and Qwen model IDs to the backend |
| [`deploy.sh`](../deploy.sh) | ECS deployment procedure (build, ship, run on the instance) |
| [`backend/scripts/env_check.py`](../backend/scripts/env_check.py) | Verifies DashScope connectivity and model availability |

No API keys or secrets are committed to this repository.
