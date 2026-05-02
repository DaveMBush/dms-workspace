#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
DIST_DIR="$WORKSPACE_ROOT/dist/electron-dist"
SMOKE_PORT="${DMS_SMOKE_PORT:-3000}"

# Locate the AppImage produced by electron:package
APPIMAGE="$(find "$DIST_DIR" -name '*.AppImage' | head -1)"
if [[ -z "$APPIMAGE" ]]; then
  echo "ERROR: No AppImage found in $DIST_DIR" >&2
  exit 1
fi

chmod +x "$APPIMAGE"

# Temporary user-data directory so the smoke test does not touch the dev database
USERDATA="$(mktemp -d)"
APPIMAGE_PID=""

cleanup() {
  if [[ -n "$APPIMAGE_PID" ]]; then
    kill "$APPIMAGE_PID" 2>/dev/null || true
  fi
  rm -rf "$USERDATA"
}
trap cleanup EXIT

# The packaged app needs a plain Node binary to fork the server process.
# Use an explicit override or fall back to whatever `node` resolves to on PATH.
export DMS_NODE_EXEC_PATH="${DMS_NODE_EXEC_PATH:-$(which node)}"

# Tell the Electron main process to use the fixed smoke-test port so the
# health-check URL below is deterministic (see apps/electron/src/main.ts).
export DMS_SMOKE_PORT="$SMOKE_PORT"

echo "Launching AppImage: $APPIMAGE"

# On headless CI (no display server), wrap the launch with xvfb-run.
# On developer machines with DISPLAY set, launch directly.
if [[ -z "${DISPLAY:-}" ]]; then
  xvfb-run --auto-servernum \
    "$APPIMAGE" --no-sandbox --user-data-dir="$USERDATA" &
else
  "$APPIMAGE" --no-sandbox --user-data-dir="$USERDATA" &
fi
APPIMAGE_PID=$!

# Poll the health endpoint until the app becomes ready or the timeout expires.
HEALTH_URL="http://localhost:${SMOKE_PORT}/api/health"
TIMEOUT=30
ELAPSED=0

echo "Polling $HEALTH_URL (timeout ${TIMEOUT}s) ..."
until curl -sf "$HEALTH_URL" > /dev/null 2>&1; do
  sleep 1
  ELAPSED=$((ELAPSED + 1))
  if [[ $ELAPSED -ge $TIMEOUT ]]; then
    echo "ERROR: App did not become healthy within ${TIMEOUT}s" >&2
    exit 1
  fi
done

echo "Smoke test PASSED: app is healthy at $HEALTH_URL"
exit 0
