#!/usr/bin/env bash
set -euo pipefail

REMOTE_DIR="${REMOTE_DIR:-~/reverie}"
PLATFORM="${PLATFORM:-linux/amd64}"
IMAGE_TAR="${IMAGE_TAR:-/tmp/reverie-images.tar}"

if [[ -z "${DEPLOY_HOST:-}" ]]; then
  echo "Set DEPLOY_HOST to the ECS SSH target, for example ubuntu@1.2.3.4"
  exit 1
fi

echo "Building linux images locally for $PLATFORM..."
docker buildx build --platform "$PLATFORM" -t reverie-backend:latest --load ./backend
docker buildx build --platform "$PLATFORM" --build-arg NEXT_PUBLIC_API_BASE=/ -t reverie-frontend:latest --load ./frontend
docker save -o "$IMAGE_TAR" reverie-backend:latest reverie-frontend:latest

echo "Syncing deploy files..."
rsync -az --delete \
  --exclude ".git" \
  --exclude ".env" \
  --exclude "frontend/node_modules" \
  --exclude "frontend/.next" \
  --exclude "backend/.venv*" \
  --exclude "data/*.db" \
  ./ "$DEPLOY_HOST:$REMOTE_DIR/"

echo "Shipping prebuilt images..."
scp "$IMAGE_TAR" "$DEPLOY_HOST:/tmp/reverie-images.tar"

ssh "$DEPLOY_HOST" "
  set -euo pipefail
  if [ ! -f /swapfile ]; then
    sudo fallocate -l 2G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
  elif ! swapon --show=NAME | grep -qx /swapfile; then
    sudo swapon /swapfile
  fi
  docker load -i /tmp/reverie-images.tar
  cd $REMOTE_DIR
  docker compose up -d --no-build
"
