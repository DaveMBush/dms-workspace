#!/usr/bin/env bash
# scripts/check-no-skipped-tests.sh
#
# CI guard: fails if any non-exempt skipped tests exist in the codebase.
#
# A skip annotation is "exempt" if one of these is true:
#   1. The file contains "// @atdd" (ATDD scaffolding — intentionally deferred)
#   2. The file contains "eslint-disable vitest/no-disabled-tests"
#      (documented unit-test deferral from Epic 82)
#   3. One of the two lines immediately before the skip contains "TODO(E82)"
#      (documented E2E deferral from Epic 82)
#
# Usage:
#   bash scripts/check-no-skipped-tests.sh
#
# Exit codes:
#   0 — no unapproved skipped tests found
#   1 — one or more unapproved skipped tests found
#
set -euo pipefail

RESULTS=$(grep -rn "\.skip\|xit\b\|xdescribe\b\|test\.skip\|it\.skip\|describe\.skip" \
  apps/ \
  --include="*.spec.ts" \
  --include="*.test.ts" || true)

if [ -z "$RESULTS" ]; then
  echo "OK: No skipped tests found."
  exit 0
fi

NON_EXEMPT=""

while IFS= read -r line; do
  [ -z "$line" ] && continue

  file=$(echo "$line" | cut -d: -f1)
  linenum=$(echo "$line" | cut -d: -f2)
  content=$(echo "$line" | cut -d: -f3-)

  # Filter 1a: Skip comment-only lines (// ... or * ...)
  trimmed=$(echo "$content" | sed 's/^[[:space:]]*//')
  if echo "$trimmed" | grep -qE '^(//)|(^\*)'; then
    continue
  fi

  # Filter 1b: Must be an actual test-runner skip call, not a property access.
  # Real skip calls: test.skip(, it.skip(, describe.skip(, test.describe.skip(,
  #                  describe.skipIf(, xit(, xdescribe(
  # False positives: expect(obj.skip).toBe(), .skip-link in CSS selectors
  if ! echo "$content" | grep -qE \
    '(test|it|describe)(\.describe)?\.skip(If)?[[:space:]]*[(\;]|^[[:space:]]*(xit|xdescribe)[[:space:]]*[(\;]'; then
    continue
  fi

  # Filter 2: @atdd-exempt files
  if grep -q "// @atdd" "$file" 2>/dev/null; then
    continue
  fi

  # Filter 3: Files with eslint-disable for vitest/no-disabled-tests
  # (unit test files with documented Epic 82 deferrals)
  if grep -q "eslint-disable.*vitest/no-disabled-tests" "$file" 2>/dev/null; then
    continue
  fi

  # Filter 4: One of the two lines immediately before the skip has a TODO(E82) comment.
  # E2E (Playwright) files use this pattern for documented deferrals.
  if [ "$linenum" -gt 1 ]; then
    prev1_linenum=$((linenum - 1))
    prev2_linenum=$((linenum - 2))
    prev1_line=$(sed -n "${prev1_linenum}p" "$file" 2>/dev/null || true)
    prev2_line=$(sed -n "${prev2_linenum}p" "$file" 2>/dev/null || true)
    if echo "$prev1_line$prev2_line" | grep -q "TODO(E82)"; then
      continue
    fi
  fi

  NON_EXEMPT="${NON_EXEMPT}${line}"$'\n'
done <<< "$RESULTS"

if [ -n "$NON_EXEMPT" ]; then
  printf "ERROR: Unapproved skipped tests found (not documented with TODO(E82) and not @atdd-exempt):\n\n"
  printf "%s\n" "$NON_EXEMPT"
  printf "To fix: either remove the .skip annotation, or add a 'TODO(E82)' comment within\n"
  printf "2 lines before the skip explaining why, AND for unit tests add an\n"
  printf "'eslint-disable vitest/no-disabled-tests' comment at the top of the file.\n"
  exit 1
fi

echo "OK: All skipped tests are either @atdd-exempt or have documented TODO(E82) deferrals."
exit 0
