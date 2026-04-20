# Story 82.3: Unskip and Fix E2E Tests

Status: Approved

## Story

As a developer,
I want all category-B skipped E2E tests to be unskipped and fixed so they pass, and all category-A skipped E2E tests to be deleted,
so that the E2E suite provides complete coverage with no intentionally skipped tests.

## Acceptance Criteria

1. **Given** category-B skipped E2E tests from Story 82.1,
   **When** developer removes the `.skip` annotation and runs each test using the Playwright MCP server,
   **Then** any failures are diagnosed and fixed so each test passes on both Chromium and Firefox.

2. **Given** category-A skipped E2E tests (duplicates) from Story 82.1,
   **When** developer deletes these tests,
   **Then** coverage for the same UI scenario is still provided by remaining passing E2E tests.

3. **Given** all category-A tests deleted and all category-B tests unskipped and fixed,
   **When** `pnpm e2e:dms-material:chromium` runs,
   **Then** all tests pass with zero skipped tests reported.

4. **Given** all category-A tests deleted and all category-B tests unskipped and fixed,
   **When** `pnpm e2e:dms-material:firefox` runs,
   **Then** all tests pass with zero skipped tests reported.

5. **Given** `pnpm all` runs after all E2E changes,
   **When** the full quality gate executes,
   **Then** all unit and E2E tests pass with exit code 0.

## Tasks / Subtasks

- [ ] Read the inventory from Story 82.1 — obtain the E2E test list (AC: #1, #2)
  - [ ] Identify all category-A E2E tests (duplicates to delete)
  - [ ] Identify all category-B E2E tests (unique coverage to unskip and fix)

- [ ] Ensure the dev server is running before executing any E2E tests
  - [ ] Start server: `./scripts/start-server-for-e2e.sh`

- [ ] Process category-A E2E tests — delete duplicates (AC: #2)
  - [ ] For each category-A test: confirm the same UI scenario is covered by a currently-passing E2E test
  - [ ] Remove the entire `test.skip(...)` block
  - [ ] If removal empties a `test.describe` block, remove the `describe` block too
  - [ ] Run `pnpm e2e:dms-material:chromium` to verify the remaining suite still passes

- [ ] Process category-B E2E tests — unskip and fix (AC: #1)
  - [ ] For each category-B test: remove the skip modifier (`test.skip(...)` → `test(...)`)
  - [ ] Use the Playwright MCP server to run and inspect the test visually
  - [ ] Diagnose the root cause of the failure:
    - [ ] Selector/locator change → update the Playwright locator to match current DOM
    - [ ] Database/fixture state issue → fix the `beforeAll`/`afterAll` cleanup or seed data
    - [ ] UI component removed/changed → investigate what changed and update the test interaction
    - [ ] Timing/race condition → add appropriate `waitFor` or use a more resilient locator
    - [ ] Feature not yet built → document as deferred (see Deferred Fix Protocol)
  - [ ] Run the fixed test in isolation on Chromium (see targeted run command)
  - [ ] Run the fixed test in isolation on Firefox
  - [ ] If both browsers pass: mark test as done
  - [ ] If fix is too complex: defer with `// TODO(E82): blocked — <reason>` and document in Completion Notes

- [ ] Verify zero skipped E2E tests remain (AC: #3, #4)
  - [ ] Run the verification grep (see Key Commands below)
  - [ ] Result must be empty (excluding any `@atdd`-exempt files)

- [ ] Run full E2E suite on both browsers (AC: #3, #4)
  - [ ] `pnpm e2e:dms-material:chromium`
  - [ ] `pnpm e2e:dms-material:firefox`

- [ ] Run full quality gate (AC: #5)
  - [ ] `pnpm all`
  - [ ] Confirm exit code 0

## Dev Notes

### E2E Test Scope

All Playwright specs under:

- `apps/dms-material-e2e/src/*.spec.ts`

Unit spec files (`apps/dms-material/src/**/*.spec.ts`, `apps/server/src/**/*.spec.ts`) are handled exclusively in Story 82.2.

### Playwright MCP Server Usage

Use the Playwright MCP server to visually reproduce any failure before attempting a fix. This is mandatory for category-B E2E tests — reproduce first, then fix. The visual session will reveal selector mismatches, timing issues, and data state problems far faster than reading stack traces alone.

### Targeted E2E Run (Single Test)

Run a single test in isolation to iterate quickly during fixes:

```bash
# Chromium — single spec file
pnpm nx run dms-material-e2e:e2e --project=chromium --grep "<test name>"

# Firefox — single spec file
pnpm nx run dms-material-e2e:e2e --project=firefox --grep "<test name>"

# Alternatively, using the playwright CLI directly
pnpm exec playwright test apps/dms-material-e2e/src/<file>.spec.ts --project=chromium
pnpm exec playwright test apps/dms-material-e2e/src/<file>.spec.ts --project=firefox
```

### @atdd Exemption

Tests in files that contain `// @atdd` anywhere in the file are intentionally-skipped ATDD scaffolding tests. Do **not** touch them. Verify exemption with:

```bash
grep -rl "@atdd" apps/dms-material-e2e/src/ --include="*.spec.ts"
```

### Common E2E Skip Root Causes

| Root Cause | Fix Approach |
|------------|--------------|
| Selector changed (DOM refactor) | Update Playwright locator to match current DOM structure |
| Timing / race condition | Add `await page.waitFor...` or switch to a network-idle wait |
| Database state issue | Fix `beforeAll`/`afterAll` to properly seed and clean up test data |
| UI component removed or replaced | Investigate what changed; update test interaction accordingly |
| Feature not yet built | Defer — do not delete; mark with `// TODO(E82)` |
| Filter/sort state left over from prior test | Ensure `beforeEach` resets relevant application state |

### Verifying Zero Skipped E2E Tests

```bash
grep -rn "\.skip\|xit\b\|xdescribe\b\|test\.skip\|it\.skip\|describe\.skip" \
  apps/dms-material-e2e/src/ \
  --include="*.spec.ts"
```

This command must return **zero results** (or only results in `@atdd`-exempt files) before this story is complete.

### Deferred Fix Protocol

If a category-B E2E fix requires significant new feature work or architectural change:

1. Leave the `test.skip` annotation in place — do NOT delete the test
2. Add `// TODO(E82): blocked — <one-line reason>` immediately above the `test.skip` call
3. Document the deferral in Completion Notes with: test name, file path, root cause, and why deferring
4. The story can still be marked done provided all non-deferred tests pass and deferrals are documented

### Quality Rules

- Do NOT change test assertions to match broken behaviour — find and fix the underlying cause
- Do NOT skip both browsers — both Chromium and Firefox must pass for each test
- Do NOT weaken `beforeAll`/`afterAll` setup to avoid fixing real state management issues

### Key Commands

| Purpose | Command |
|---------|---------|
| Run E2E on Chromium | `pnpm e2e:dms-material:chromium` |
| Run E2E on Firefox | `pnpm e2e:dms-material:firefox` |
| Run single test (Chromium) | `pnpm nx run dms-material-e2e:e2e --project=chromium --grep "<name>"` |
| Run single test (Firefox) | `pnpm nx run dms-material-e2e:e2e --project=firefox --grep "<name>"` |
| Verify zero skipped E2E tests | `grep -rn "\.skip\|xit\b\|xdescribe\b\|test\.skip\|it\.skip\|describe\.skip" apps/dms-material-e2e/src/ --include="*.spec.ts"` |
| Find @atdd exempt E2E files | `grep -rl "@atdd" apps/dms-material-e2e/src/ --include="*.spec.ts"` |
| Start server for E2E | `./scripts/start-server-for-e2e.sh` |
| Full quality gate | `pnpm all` |

### Key Files

| File | Purpose |
|------|---------|
| `apps/dms-material-e2e/src/*.spec.ts` | Playwright E2E test files |
| `apps/dms-material-e2e/src/helpers/login.helper.ts` | Login helper used across E2E specs |
| `scripts/start-server-for-e2e.sh` | Script to start the backend server before E2E runs |
| `eslint.config.mjs` | ESLint config — `vitest/no-disabled-tests` rule and `@atdd` override |

## Dev Agent Record

### Agent Model Used

_TBD_

### Debug Log References

### Completion Notes List

### File List
