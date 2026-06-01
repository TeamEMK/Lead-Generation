#!/usr/bin/env bash
set -e
export MallocStackLogging=0

ROOT="$(cd "$(dirname "$0")" && pwd)"

cleanup() {
  echo ""
  echo "Stopping..."
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null
}
trap cleanup EXIT INT TERM

echo "Starting backend..."
cd "$ROOT/backend" && npm run dev &
BACKEND_PID=$!

echo "Starting frontend..."
cd "$ROOT/frontend" && npm run dev &
FRONTEND_PID=$!

echo ""
echo "Backend  → http://localhost:5001"
echo "Frontend → http://localhost:3000"
echo "Press Ctrl+C to stop."

wait
