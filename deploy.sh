#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DEPLOY_HOST:-}" ]]; then
  echo "Set DEPLOY_HOST to the ECS SSH target, for example ubuntu@1.2.3.4"
  exit 1
fi

rsync -az --delete \
  --exclude ".git" \
  --exclude "frontend/node_modules" \
  --exclude "backend/.venv" \
  --exclude "data/*.db" \
  ./ "$DEPLOY_HOST:~/reverie/"

ssh "$DEPLOY_HOST" "cd ~/reverie && docker compose up --build -d"
