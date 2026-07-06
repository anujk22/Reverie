# Deploying Reverie on Alibaba ECS

M0 requires a public `/api/health` endpoint running on Alibaba Cloud ECS.

1. Provision an Ubuntu 22.04 ECS instance. The target may be free-tier sized
   (`1 vCPU / 1 GB` or `2 vCPU / 2 GB`); deployment is designed not to build
   on the instance.
2. Open inbound ports 22, 80, and optionally 443.
3. Install Docker and the Docker Compose plugin.
4. Copy `.env.example` to `.env` and set `DASHSCOPE_API_KEY`.
5. From this repo, run:

```bash
DEPLOY_HOST=ubuntu@YOUR_ECS_IP ./deploy.sh
```

`deploy.sh` builds `linux/amd64` Docker images locally on the dev Mac, saves
them to `/tmp/reverie-images.tar`, ships that tarball to ECS, loads the images
there, creates/enables a 2 GB swap file as insurance, and starts the stack with
`docker compose up -d --no-build`. The ECS instance only runs containers; it
does not compile Python or Next.js.

6. Verify:

```bash
curl http://YOUR_ECS_IP/api/health
```

The M5 unlock gate is met when that public health endpoint is served from the
ECS Docker stack and returns `ok` plus live DashScope model ids.

## M0 Recording Checklist

- Browser at `http://YOUR_ECS_IP/api/health` showing `ok`, model ids, and DashScope reachability.
- Alibaba Cloud console showing the running instance and region.
- Terminal on the instance showing `docker compose ps`.
- One live chat turn in the deployed app.

## ECS Status - Honest Note

Verification is currently blocked by Alibaba Cloud ECS account access, not by the app build.

- Timeline: `<PLACEHOLDER: add Anuj screenshot/date of identity verification issue>`
- Ticket references: `<PLACEHOLDER: hackathon Discord or Alibaba support ticket>`
- Fallback of record: include a permalink to `backend/app/llm.py` proving DashScope OpenAI-compatible usage, plus a live local recording that shows model-call token logs and `/api/health`.
- Execution plan: when access lands, run `DEPLOY_HOST=ubuntu@YOUR_ECS_IP ./deploy.sh`; the stack is already configured for Docker Compose, Nginx, FastAPI, Next.js, SQLite volume persistence, and Qwen environment variables.
