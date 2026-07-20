# Deploying Reverie on Alibaba Cloud ECS

This document preserves the repeatable deployment procedure used for Reverie's
Alibaba Cloud ECS deployment. The submission instance was released after evidence
capture, so no currently live public endpoint is claimed. The deployment record
is preserved in
[`ALIBABA_DEPLOYMENT_PROOF.md`](./ALIBABA_DEPLOYMENT_PROOF.md); the original ECS
Console and Workbench screenshots are attached directly to the Devpost proof
field.

## Deployment Procedure

### ECS prerequisites

Provision an Ubuntu 22.04 ECS instance with enough disk and memory for the
prebuilt Docker images. Open inbound ports 22 and 80; open 443 only if TLS is
configured. Install Docker Engine, the Docker Compose plugin, `rsync`, and
`scp` access for the deployment user.

The deployment script builds `linux/amd64` images locally, ships them to ECS,
loads them, and starts the stack without compiling on the instance.

### Environment setup

On the ECS instance, create `.env` from `.env.example` and set the live
`DASHSCOPE_API_KEY`. Never put that value in a screenshot, commit, or public
document. For a live deployment, keep `MOCK_LLM=false` and confirm the health
response says `"mock": false`.

### Deploy command

From the repository root on the build machine:

```bash
DEPLOY_HOST="ubuntu@$ECS_HOST" ./deploy.sh
```

`deploy.sh` uses Docker Buildx, `docker save`, `rsync`, `scp`, and SSH. It does
not copy `.env`, databases, virtual environments, or private keys.
Set `ECS_HOST` in the shell to the target IP address or hostname before running
the command; do not write it into the repository.

### Local verification on ECS

Run these commands from the deployed repository directory on the ECS instance:

```bash
docker compose ps
curl -s http://localhost/api/health | python3 -m json.tool
```

The health response must contain:

```json
{
  "ok": true,
  "db": true,
  "dashscope_reachable": true,
  "mock": false,
  "model_ids": {
    "chat": "qwen-plus",
    "observer": "qwen-flash",
    "dream": "qwen-max",
    "embed": "text-embedding-v4",
    "judge": "qwen-max"
  }
}
```

From an external machine, use the same process-only `ECS_HOST` value:

```bash
curl -s "http://$ECS_HOST/api/health" | python3 -m json.tool
```

### Troubleshooting

- If the containers are not `Up`, run `docker compose logs --tail=100` and
  inspect the failing service without displaying `.env`.
- If `mock` is `true`, check the live key and `MOCK_LLM`; do not present that
  run as deployment proof.
- If `dashscope_reachable` is `false`, check the endpoint, key permissions,
  ECS egress, and the configured Qwen model IDs.
- If the public endpoint fails but localhost works, check the ECS security
  group and port 80/Nginx configuration.

## Evidence boundary

The repository contains the required production code using the Qwen Cloud
endpoint. Original visual evidence captured while the ECS instance was running
is attached directly to the Devpost proof field. Those captures show the Alibaba
Cloud ECS Console, Workbench, running Docker containers, database health,
DashScope reachability, `mock: false`, and the configured Qwen model IDs. The
instance identifiers and public IP shown in the captures belong to the released
historical instance.
