#!/usr/bin/env bash
# Bundle Size Analysis Script
# Compares production bundle sizes between DMS (PrimeNG) and DMS-Material
# Usage: bash scripts/bundle-size-analysis.sh

set -euo pipefail

echo "=== DMS-Material Bundle Size Analysis ==="
echo ""

# Build production bundles
echo "Building DMS (PrimeNG) production bundle..."
pnpm nx run dms:build:production 2>/dev/null || echo "WARN: DMS build failed (may not be configured)"

echo ""
echo "Building DMS-Material production bundle..."
pnpm nx run dms-material:build:production 2>/dev/null || pnpm nx run dms-material:build 2>/dev/null

echo ""
echo "=== Bundle Size Results ==="
echo ""

# DMS bundle sizes
if [ -d "dist/apps/dms/browser" ]; then
  echo "--- DMS (PrimeNG) ---"
  DMS_TOTAL=0
  for f in dist/apps/dms/browser/*.js; do
    SIZE=$(wc -c < "$f")
    DMS_TOTAL=$((DMS_TOTAL + SIZE))
    echo "  $(basename "$f"): $((SIZE / 1024)) KB"
  done
  echo "  TOTAL JS: $((DMS_TOTAL / 1024)) KB"
else
  echo "--- DMS (PrimeNG) --- (not built)"
  DMS_TOTAL=0
fi

echo ""

# DMS-Material bundle sizes
if [ -d "dist/apps/dms-material/browser" ]; then
  echo "--- DMS-Material ---"
  MAT_TOTAL=0
  for f in dist/apps/dms-material/browser/*.js; do
    SIZE=$(wc -c < "$f")
    MAT_TOTAL=$((MAT_TOTAL + SIZE))
    echo "  $(basename "$f"): $((SIZE / 1024)) KB"
  done
  echo "  TOTAL JS: $((MAT_TOTAL / 1024)) KB"
else
  echo "--- DMS-Material --- (not built)"
  MAT_TOTAL=0
fi

echo ""

# Comparison
if [ "$DMS_TOTAL" -gt 0 ] && [ "$MAT_TOTAL" -gt 0 ]; then
  DELTA=$((MAT_TOTAL - DMS_TOTAL))
  if [ "$DMS_TOTAL" -gt 0 ]; then
    PERCENT=$((DELTA * 100 / DMS_TOTAL))
  else
    PERCENT=0
  fi
  echo "=== Comparison ==="
  echo "  Delta: $((DELTA / 1024)) KB ($PERCENT%)"
  if [ "$PERCENT" -le 10 ] && [ "$PERCENT" -ge -10 ]; then
    echo "  PASS: Within 10% target"
  else
    echo "  WARN: Outside 10% target"
  fi
fi

echo ""
echo "=== Analysis Complete ==="
