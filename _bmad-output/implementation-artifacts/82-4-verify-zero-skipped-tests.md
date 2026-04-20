# Story 82.4: Final Verification — Zero Skipped Tests Across the Entire Suite

Status: Approved

## Story

As a developer,
I want a final verification pass that confirms no `.skip` annotations remain and `pnpm all` exits with status 0,
so that the epic is conclusively closed and future CI runs will alert us if new skips are introduced.

## Acceptance Criteria

1. **Given** all work from Stories 82.1, 82.2, and 82.3 is complete,
   **When** developer re-runs the grep from Story 82.1 across all `*.spec.ts` and `*.test.ts` files (excluding `@atdd`-exempt files),
   **Then** output is empty — zero `.skip`, `xit`, `xdescribe`, `test.skip`, `it.skip`, or `describe.skip` annotations remain.

2. **Given** a clean grep result,
   **When** `pnpm all` runs,
   **Then** all tests pass with exit code 0 and console output shows zero skipped tests.

3. **Given** the team wants to prevent future accidental skips from silently entering the codebase,
   **When** developer evaluates the available lint and CI options,
   **Then** a concrete prevention recommendation is documented in Dev Notes (implementation is optional for this story but must be documented).

## Tasks / Subtasks

- [ ] Confirm Stories 82.2 and 82.3 are marked done before beginning this story (AC: #1)

- [ ] Run the final inventory grep (AC: #1)
  - [ ] Execute the grep command from Key Commands below
  - [ ] Identify any remaining skip annotations not already noted as `@atdd`-exempt or `TODO(E82)` deferred
  - [ ] If any non-deferred, non-`@atdd` skips are found: trace back to Story 82.2 (unit) or 82.3 (E2E) for resolution — do not close this story until resolved

- [ ] Verify @atdd exemption for any remaining results (AC: #1)
  - [ ] For each grep result, check whether the file contains `// @atdd`
  - [ ] If `@atdd` is present: the skip is legitimately exempt — record as confirmed exempt in Completion Notes
  - [ ] If `@atdd` is absent and the line has `// TODO(E82)`: record as a known deferred item
  - [ ] If neither: the skip must be resolved before this story is done

- [ ] Run `pnpm all` and confirm clean exit (AC: #2)
  - [ ] `pnpm all`
  - [ ] Confirm exit code 0
  - [ ] Confirm no "skipped" count in Vitest output for unit tests
  - [ ] Confirm no "skipped" count in Playwright output for E2E tests

- [ ] Document the optional prevention recommendation (AC: #3)
  - [ ] Evaluate `vitest/no-disabled-tests: 'error'` in `eslint.config.mjs` (with `@atdd` override preserved)
  - [ ] Evaluate a CI grep script that fails if non-`@atdd` skipped tests are found
  - [ ] Record recommendation and trade-offs in Dev Notes
  - [ ] Optionally implement the chosen approach — if implemented, run `pnpm all` to confirm it does not break the `@atdd` override

## Dev Notes

### Prerequisite Checklist

Before running this story, confirm the following are all true:

- [ ] Story 82.2 (unit tests) is marked Done
- [ ] Story 82.3 (E2E tests) is marked Done
- [ ] No outstanding `TODO(E82)` items that were deferred are now resolvable

### Final Verification Grep

```bash
grep -rn "\.skip\|xit\b\|xdescribe\b\|test\.skip\|it\.skip\|describe\.skip" \
  apps/ \
  --include="*.spec.ts" \
  --include="*.test.ts"
```

**Expected result when epic is complete:** zero output lines (or only lines in `@atdd`-exempt files or documented `TODO(E82)` deferrals).

### @atdd Exemption Verification

```bash
# Confirm a specific file is @atdd-exempt
grep "@atdd" apps/path/to/file.spec.ts

# List all @atdd-exempt files
grep -rl "@atdd" apps/ --include="*.spec.ts" --include="*.test.ts"
```

If a remaining skip result falls in a file returned by this command, it is legitimately exempt and must not be changed.

### Interpreting Vitest Skip Count

Look for the `skipped` line in Vitest output:

```
✓  XX tests passed
   0 skipped
```

A non-zero "skipped" count after this story means at least one skip was missed in Story 82.2.

### Interpreting Playwright Skip Count

Look for the summary line in Playwright output:

```
XX passed (XXs)
0 skipped
```

A non-zero "skipped" count means at least one E2E skip was missed in Story 82.3.

### Prevention Recommendation Options

Two options are available. Document one or both as the team recommendation in Completion Notes:

#### Option 1 — Lint Rule Escalation

Upgrade `vitest/no-disabled-tests` from `warn` to `error` in `eslint.config.mjs`. The `@atdd` override already exists as an `off` rule for `@atdd` files. After this change, any new non-exempt skip will fail the lint step of `pnpm all` before it ever reaches the test runner.

```js
// eslint.config.mjs — change warn → error
'vitest/no-disabled-tests': 'error',
```

Trade-off: Developers must remember to add `// @atdd` to intentional ATDD scaffolding files, or the lint step will reject them. This is already the established convention so the risk is low.

#### Option 2 — CI Grep Guard Script

Add a CI step (or a `pnpm` script) that runs the grep and exits non-zero if any non-`@atdd` skips are found:

```bash
#!/usr/bin/env bash
# scripts/check-no-skipped-tests.sh
set -euo pipefail

RESULTS=$(grep -rn "\.skip\|xit\b\|xdescribe\b\|test\.skip\|it\.skip\|describe\.skip" \
  apps/ \
  --include="*.spec.ts" \
  --include="*.test.ts" || true)

# Filter out @atdd-exempt lines
NON_ATDD=$(echo "$RESULTS" | while IFS= read -r line; do
  file=$(echo "$line" | cut -d: -f1)
  if ! grep -q "@atdd" "$file" 2>/dev/null; then
    echo "$line"
  fi
done)

if [ -n "$NON_ATDD" ]; then
  echo "ERROR: Non-exempt skipped tests found:"
  echo "$NON_ATDD"
  exit 1
fi

echo "OK: No non-exempt skipped tests found."
```

Trade-off: Requires maintaining the script separately from the lint configuration. Simpler to understand for new contributors who may not know the ESLint rule.

### Key Commands

| Purpose | Command |
|---------|---------|
| Final verification grep | `grep -rn "\.skip\|xit\b\|xdescribe\b\|test\.skip\|it\.skip\|describe\.skip" apps/ --include="*.spec.ts" --include="*.test.ts"` |
| List @atdd exempt files | `grep -rl "@atdd" apps/ --include="*.spec.ts" --include="*.test.ts"` |
| Full quality gate | `pnpm all` |
| Run E2E on Chromium | `pnpm e2e:dms-material:chromium` |
| Run E2E on Firefox | `pnpm e2e:dms-material:firefox` |

### Key Files

| File | Purpose |
|------|---------|
| `eslint.config.mjs` | ESLint config — `vitest/no-disabled-tests` rule and `@atdd` override |
| `apps/dms-material/src/**/*.spec.ts` | Angular frontend unit tests |
| `apps/server/src/**/*.spec.ts` | Fastify backend unit tests |
| `apps/dms-material-e2e/src/*.spec.ts` | Playwright E2E tests |

## Dev Agent Record

### Agent Model Used

_TBD_

### Debug Log References

### Completion Notes List

### File List
