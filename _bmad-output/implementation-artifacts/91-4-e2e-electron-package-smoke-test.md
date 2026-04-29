# Story 91.4: End-to-End Packaging and Install Smoke Test

Status: Approved

## Story

As Dave,
I want a smoke-test script that builds the package, launches the AppImage, and verifies the
UI loads correctly,
So that packaging regressions are caught before a release.

## Acceptance Criteria

1. **Given** the `electron:package` target produces an AppImage on Linux,
   **When** the AppImage is launched via the smoke-test script,
   **Then** the Electron window opens, the Angular UI becomes reachable (HTTP 200 on the
   root route), and the database migration step completes without error.

2. **Given** the smoke-test script is run on the developer machine after packaging,
   **When** it exits,
   **Then** it exits 0 on success and prints any migration or server errors to stdout.

3. **Given** `pnpm all` runs after this story,
   **Then** all tests pass.

## Tasks / Subtasks

- [ ] Task 1: Write `apps/electron/scripts/smoke-test.sh`
  - [ ] Step 1: Find the AppImage in `dist/electron-dist/` (glob for `*.AppImage`)
  - [ ] Step 2: Launch the AppImage with `DISPLAY=:99` (or xvfb-run) and `--no-sandbox`
  - [ ] Step 3: Poll `http://localhost:<dynamic-port>/api/health` until it returns 200
        or a 30-second timeout expires
  - [ ] Step 4: Assert HTTP 200 — exit 0 on success, exit 1 on failure
  - [ ] Step 5: Kill the AppImage process

- [ ] Task 2: Add `smoke-test` Nx target to `apps/electron/project.json`
  - [ ] Command: `bash apps/electron/scripts/smoke-test.sh`
  - [ ] `dependsOn`: `["electron:package"]`

- [ ] Task 3: Document the smoke-test in `apps/electron/README.md`
  - [ ] Add a "Packaging & Smoke Test" section describing how to run
        `pnpm nx run electron:smoke-test`

- [ ] Task 4: Run `pnpm all` — confirm all tests pass

## Dev Notes

### Smoke-Test Script Outline

```bash
#!/usr/bin/env bash
set -euo pipefail

APPIMAGE=$(find dist/electron-dist -name '*.AppImage' | head -1)
if [[ -z "$APPIMAGE" ]]; then
  echo "ERROR: No AppImage found in dist/electron-dist/" >&2
  exit 1
fi

chmod +x "$APPIMAGE"

# Launch in the background; use a temp userData dir so it doesn't touch the dev DB
USERDATA=$(mktemp -d)
"$APPIMAGE" --no-sandbox --user-data-dir="$USERDATA" &
APPIMAGE_PID=$!

# Poll health endpoint (the port is dynamic; read it from a temp file or use the default)
# Adjust port detection based on how the packaged app exposes its port.
HEALTH_URL="http://localhost:3000/api/health"
TIMEOUT=30
ELAPSED=0
until curl -sf "$HEALTH_URL" > /dev/null 2>&1; do
  sleep 1
  ELAPSED=$((ELAPSED + 1))
  if [[ $ELAPSED -ge $TIMEOUT ]]; then
    echo "ERROR: App did not become healthy within ${TIMEOUT}s" >&2
    kill "$APPIMAGE_PID" 2>/dev/null || true
    rm -rf "$USERDATA"
    exit 1
  fi
done

echo "Smoke test PASSED: app is healthy at $HEALTH_URL"
kill "$APPIMAGE_PID" 2>/dev/null || true
rm -rf "$USERDATA"
exit 0
```

Note: The dynamic port (from `apps/electron/src/utils/port.ts`) may require reading a
temp file or socket written by the packaged app. Story 91.3 sets `DATABASE_URL` before
forking; if the packaged app also writes the chosen port to a temp file, the smoke test
can read it. Alternatively, configure the packaged app to use a fixed port in smoke-test
mode. Document the chosen approach in the Dev Notes of this story file.

### xvfb for CI

On headless CI (no display), wrap the AppImage launch with `xvfb-run`:

```bash
xvfb-run --auto-servernum "$APPIMAGE" --no-sandbox ...
```

This is optional for local developer machines with a display server.
