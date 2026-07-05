# Deploying Reverie on Alibaba ECS

M0 requires a public `/api/health` endpoint running on Alibaba Cloud ECS.

1. Provision an Ubuntu 22.04 ECS instance with at least 2 vCPU and 4 GB RAM.
2. Open inbound ports 22, 80, and optionally 443.
3. Install Docker and the Docker Compose plugin.
4. Copy `.env.example` to `.env` and set `DASHSCOPE_API_KEY`.
5. From this repo, run:

```bash
DEPLOY_HOST=ubuntu@YOUR_ECS_IP ./deploy.sh
```

6. Verify:

```bash
curl http://YOUR_ECS_IP/api/health
```

## M0 Recording Checklist

- Browser at `http://YOUR_ECS_IP/api/health` showing `ok`, model ids, and DashScope reachability.
- Alibaba Cloud console showing the running instance and region.
- Terminal on the instance showing `docker compose ps`.
- One live chat turn in the deployed app.
