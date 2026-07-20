#!/usr/bin/env bash
set -euo pipefail

SCRIPT_PATH="${BASH_SOURCE[0]}"
case "$SCRIPT_PATH" in
  */*) ROOT_DIR="${SCRIPT_PATH%/*}" ;;
  *) ROOT_DIR="." ;;
esac
ROOT_DIR="$(cd "$ROOT_DIR" && pwd)"
cd "$ROOT_DIR"

backend_pid=""
frontend_pid=""
backend_log="/tmp/reverie-film-backend-$RANDOM.log"
frontend_log="/tmp/reverie-film-frontend-$RANDOM.log"

cleanup() {
  trap - INT TERM EXIT
  if [[ -n "$frontend_pid" ]] && kill -0 "$frontend_pid" 2>/dev/null; then
    kill "$frontend_pid" 2>/dev/null || true
  fi
  if [[ -n "$backend_pid" ]] && kill -0 "$backend_pid" 2>/dev/null; then
    kill "$backend_pid" 2>/dev/null || true
  fi
  if [[ -n "$frontend_pid" ]]; then
    wait "$frontend_pid" 2>/dev/null || true
  fi
  if [[ -n "$backend_pid" ]]; then
    wait "$backend_pid" 2>/dev/null || true
  fi
}
trap cleanup INT TERM EXIT

port_blocked=0
for port in 8000 3000; do
  pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "$pids" ]]; then
    echo "Port $port is already listening. PID(s):"
    echo "$pids"
    lsof -nP -iTCP:"$port" -sTCP:LISTEN || true
    port_blocked=1
  fi
done
if [[ "$port_blocked" -ne 0 ]]; then
  exit 1
fi

if [[ -z "${DASHSCOPE_API_KEY:-}" && -f "$HOME/.reverie_dashscope_key" ]]; then
  IFS= read -r DASHSCOPE_API_KEY < "$HOME/.reverie_dashscope_key" || true
fi
if [[ -z "${DASHSCOPE_API_KEY:-}" ]]; then
  echo "DASHSCOPE_API_KEY is required for film mode. Set it in the environment or ~/.reverie_dashscope_key." >&2
  echo "Refusing to start: film.sh never falls back to MOCK." >&2
  exit 1
fi
export DASHSCOPE_API_KEY
export MOCK_LLM=false
export DEMO_MODE=true
export CONTEXT_BUDGET_TOKENS="${CONTEXT_BUDGET_TOKENS:-1200}"
unset NEXT_PUBLIC_API_BASE

PYTHONPATH=backend backend/.venv311/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 >"$backend_log" 2>&1 &
backend_pid=$!

if ! (cd frontend && npm run build); then
  echo "Frontend production build failed." >&2
  exit 1
fi

mkdir -p frontend/.next/standalone/.next/static frontend/.next/standalone/public
cp -R frontend/.next/static/. frontend/.next/standalone/.next/static/
cp -R frontend/public/. frontend/.next/standalone/public/

(cd frontend/.next/standalone && HOSTNAME=127.0.0.1 PORT=3000 node server.js >"$frontend_log" 2>&1) &
frontend_pid=$!

health_body=""
for _ in {1..90}; do
  if ! kill -0 "$backend_pid" 2>/dev/null; then
    echo "Backend exited before /api/health became ready. Log: $backend_log" >&2
    exit 1
  fi
  if health_body="$(curl -fsS http://localhost:8000/api/health 2>/dev/null)"; then
    break
  fi
  sleep 1
done
if [[ -z "$health_body" ]]; then
  echo "Backend did not become healthy at http://localhost:8000/api/health. Log: $backend_log" >&2
  exit 1
fi
if [[ "$health_body" == *'"mock":true'* || "$health_body" != *'"mock":false'* ]]; then
  echo "Backend health is mock or ambiguous; refusing to film." >&2
  echo "$health_body" >&2
  exit 1
fi

frontend_ready=0
for _ in {1..60}; do
  if ! kill -0 "$frontend_pid" 2>/dev/null; then
    echo "Frontend exited before http://localhost:3000 became ready. Log: $frontend_log" >&2
    exit 1
  fi
  if curl -fsS http://localhost:3000/ >/dev/null 2>&1; then
    frontend_ready=1
    break
  fi
  sleep 1
done
if [[ "$frontend_ready" -ne 1 ]]; then
  echo "Frontend did not become ready at http://localhost:3000. Log: $frontend_log" >&2
  exit 1
fi

cat <<'INSTRUCTIONS'
Reverie film mode is ready.

Open:
  http://localhost:3000/?film=1

Film mode loads PAUSED at beat 1/12. Start your screen recording, then click the play button in the FILM chip.

Stop:
  Ctrl+C
INSTRUCTIONS

wait "$backend_pid" "$frontend_pid"
