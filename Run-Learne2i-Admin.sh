#!/usr/bin/env bash
# Learne2i Admin Portal launcher (macOS / Linux)
#
# Requires the .NET backend to be running on http://localhost:5180.
# Start it with the main project's Run-Learne2i.sh first.
#
# Default login: admin@learne2i.co.in / change-me-immediately

set -e
APP_PORT=5181
API_PORT=5180

cd "$(dirname "$0")"

echo
echo " =========================================================="
echo "   Learne2i Admin Portal  (Vite + React + TS)"
echo " =========================================================="
echo
echo " Admin port : $APP_PORT"
echo " Backend    : http://localhost:$API_PORT  (must already be running)"
echo
echo " Default login : admin@learne2i.co.in / change-me-immediately"
echo " =========================================================="
echo

# 1) Node.js
echo "[1/5] Checking Node.js..."
if ! command -v node >/dev/null 2>&1; then
  echo "  X  Node.js was not found. Install Node 18+ then re-run this script."
  exit 1
fi
echo "  found Node $(node -v)."

# 2) Backend reachable
echo
echo "[2/5] Checking backend on :$API_PORT..."
if ! curl -fs -m 3 "http://localhost:$API_PORT/api/health" >/dev/null; then
  echo "  X  Backend is not reachable on http://localhost:$API_PORT."
  echo "     Start the main project first: bash ../Learne2i-SmartSolve/Run-Learne2i.sh"
  exit 1
fi
echo "  backend is reachable."

# 3) npm install
echo
echo "[3/5] Checking npm dependencies..."
if [ ! -d node_modules ]; then
  echo "  node_modules not found - running npm install (one-time, ~30s)..."
  npm install --no-audit --no-fund
else
  echo "  node_modules present, skipping install."
fi

# 4) Skip production build (dev mode is enough)
echo
echo "[4/5] Skipping production build (dev mode is enough)."

# 5) Start dev server
echo
echo "[5/5] Starting Vite dev server on :$APP_PORT..."
echo
echo " =========================================================="
echo "   Open http://localhost:$APP_PORT/login in your browser."
echo "   Press Ctrl+C in this window to stop the server."
echo " =========================================================="
echo

# Open browser (mac)
( sleep 3 && open "http://localhost:$APP_PORT/login" ) &

npm run dev
