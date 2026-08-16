#!/usr/bin/env bash
# Build Storybook static output and serve it with http-server in the background.
# Designed for Playwright webServer: the build runs first, then http-server
# stays alive as a long-running process that Playwright can health-check.

set -euo pipefail

PORT="${1:-6006}"
OUTPUT_DIR="dist/storybook/dms-material"

echo "▶ Building Storybook static output..."
pnpm nx run dms-material:build-storybook --silent || pnpm nx run dms-material:build-storybook

echo "▶ Serving Storybook on port ${PORT}..."
npx http-server "${OUTPUT_DIR}" -p "${PORT}" -s -c-1
