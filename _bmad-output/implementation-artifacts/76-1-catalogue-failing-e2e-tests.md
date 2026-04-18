# Story 76.1: Reproduce and Catalogue All Failing Chromium and Firefox E2E Tests

Status: Approved

## Story

As a developer,
I want a complete catalogue of every failing E2E test — including whether each test fails in
isolation or only when run as part of the full suite — so that Story 76.2 and Story 76.3 can
apply targeted fixes without guessing.

## Acceptance Criteria

1. **Given** the Playwright E2E suite is available and the dev server is running,
   **When** the developer runs `pnpm e2e:dms-material:chromium` (full suite),
   **Then** the names of all 5 failing tests are recorded in Dev Notes, including the spec file,
   test description, and the error message or assertion failure shown in the Playwright output.

2. **Given** the 5 Chromium failures are catalogued,
   **When** each failing test is run in isolation using
   `pnpm nx run dms-material-e2e:e2e --project=chromium --grep "<test name>"`,
   **Then** each test is classified as either: **(A) passes in isolation** (isolation failure) or
   **(B) fails in isolation** (functional regression), and this classification is recorded in Dev
   Notes for each test.

3. **Given** the developer runs `pnpm e2e:dms-material:firefox` (full suite),
   **When** the output is reviewed,
   **Then** the names of all 6 failing tests are recorded in Dev Notes, with the same
   pass-in-isolation / fail-in-isolation classification applied to each.

4. **Given** any test is found to be an isolation failure (class A),
   **When** the developer inspects the spec files that run immediately before the failing test,
   **Then** the specific state left behind by prior tests (database rows, localStorage entries,
   server-side session data) that causes the subsequent test to fail is identified and documented
   in Dev Notes.

5. **Given** any test is found to be a functional regression (class B),
   **When** the developer uses the Playwright MCP server to reproduce the failure in the browser,
   **Then** the failing assertion, the actual vs. expected value, and the suspected application
   code location are documented in Dev Notes.

6. **Given** no production code is changed in this story,
   **When** `pnpm all` runs,
   **Then** all previously passing tests continue to pass.

## Tasks / Subtasks

- [ ] Set up and verify E2E environment is running (AC: #1, #3)

  - [ ] Confirm dev server is up: `curl http://localhost:3001/api/health`
  - [ ] Confirm frontend is serving: `curl http://localhost:4301`
  - [ ] Confirm Storybook is serving: `curl http://localhost:6006`
  - [ ] If any server is not running, start them per the webServer config in `playwright.config.ts`
        (Playwright auto-starts them if `reuseExistingServer: true` — just run the e2e command directly)

- [ ] Run full Chromium suite and catalogue all 5 failures (AC: #1)

  - [ ] Run: `pnpm e2e:dms-material:chromium`
  - [ ] For each failure, record in Dev Notes (Chromium Failure Catalogue section below):
    - [ ] Spec file path (relative to `apps/dms-material-e2e/src/`)
    - [ ] Full test description string (as it appears in `test('...'` or `it('...'`)
    - [ ] Error message / assertion failure verbatim from Playwright output
    - [ ] Whether it failed on first attempt or only after retries (retry count visible in output)

- [ ] Classify each Chromium failure as A (isolation) or B (functional regression) (AC: #2)

  - [ ] For each of the 5 Chromium failures, run in isolation:
        `pnpm nx run dms-material-e2e:e2e --project=chromium --grep "<exact test description>"`
  - [ ] Record result (pass = class A, fail = class B) in Dev Notes
  - [ ] For class-A tests: identify which spec files precede the failing test in execution order
    - [ ] Check the alphabetical/registration order that Playwright executes specs
    - [ ] Inspect `beforeAll`/`afterAll` hooks in preceding spec files for incomplete teardown
    - [ ] Identify specific leftover state: DB rows not deleted, localStorage not cleared, sessions
    - [ ] Document the upstream spec(s) and the leaked state in Dev Notes
  - [ ] For class-B tests: use Playwright MCP server to reproduce visually
    - [ ] Launch browser via Playwright MCP, navigate to the relevant screen
    - [ ] Document the failing assertion (expected vs. actual), screenshot or trace if helpful
    - [ ] Identify suspected application code file and function/component name

- [ ] Run full Firefox suite and catalogue all 6 failures (AC: #3)

  - [ ] Run: `pnpm e2e:dms-material:firefox`
  - [ ] For each failure, record in Dev Notes (Firefox Failure Catalogue section below):
    - [ ] Spec file path, full test description, error message verbatim
    - [ ] Whether it is a duplicate of a Chromium failure or Firefox-specific

- [ ] Classify each Firefox failure as A (isolation) or B (functional regression) (AC: #3, #4, #5)

  - [ ] For each of the 6 Firefox failures, run in isolation:
        `pnpm nx run dms-material-e2e:e2e --project=firefox --grep "<exact test description>"`
  - [ ] Record classification in Dev Notes
  - [ ] Apply same class-A / class-B analysis as Chromium (upstream state leak or functional bug)
  - [ ] For Firefox-specific class-B failures: note whether they relate to the known
        `localhost` → `127.0.0.1` IPv4 baseURL difference

- [ ] Cross-reference with Epic 42 (AC: #1, #3)

  - [ ] Read `_bmad-output/implementation-artifacts/42-1-fix-failing-chromium-e2e-tests.md`
  - [ ] Read `_bmad-output/implementation-artifacts/42-2-fix-failing-firefox-e2e-tests.md`
  - [ ] For each of the 11 failures (5 Chromium + 6 Firefox), note in Dev Notes:
    - [ ] Whether the same test name appears in Epic 42 stories
    - [ ] Whether Epic 42 proposed a fix that was applied but has since regressed
    - [ ] Whether Epic 42 stories are still `ready-for-dev` (check `sprint-status.yaml`)
  - [ ] Record overlap summary in Dev Notes

- [ ] Verify no production code was changed (AC: #6)
  - [ ] Run: `git diff --name-only` — confirm only Dev Notes / story files are staged or changed
  - [ ] Run: `pnpm all` — confirm all previously passing tests still pass

## Dev Notes

> **This section is the primary deliverable of Story 76.1.** Fill in each sub-section as you
> work through the tasks. Story 76.2 (isolation fixes) and Story 76.3 (functional fixes) will be
> created from this completed catalogue.

---

### Key Commands

| Purpose                                          | Command                                                                                                       |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| Run full Chromium suite                          | `pnpm e2e:dms-material:chromium`                                                                              |
| Run full Firefox suite                           | `pnpm e2e:dms-material:firefox`                                                                               |
| Run single test in isolation (Chromium)          | `pnpm nx run dms-material-e2e:e2e --project=chromium --grep "<test description>"`                             |
| Run single test in isolation (Firefox)           | `pnpm nx run dms-material-e2e:e2e --project=firefox --grep "<test description>"`                              |
| Run single spec file (Chromium)                  | `pnpm nx run dms-material-e2e:e2e --project=chromium -- --grep-file apps/dms-material-e2e/src/<spec>.spec.ts` |
| Run all tests (unit + e2e)                       | `pnpm all`                                                                                                    |
| Show last git diff (verify no prod code changed) | `git diff --name-only`                                                                                        |
| Check health of backend server                   | `curl http://localhost:3001/api/health`                                                                       |

> **`--grep` tip:** The value must match the full test description string exactly as written in
> `test('...')`. Wrap in quotes and escape any special characters. For suites that use
> `test.describe('outer', () => test('inner'))`, use the combined string: `outer inner`.

---

### Key Files

| File                                                                           | Purpose                                                                          |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `apps/dms-material-e2e/playwright.config.ts`                                   | Playwright configuration — browsers, timeouts, retries, webServer, baseURL       |
| `apps/dms-material-e2e/src/*.spec.ts`                                          | All E2E spec files (~70 files, alphabetical order)                               |
| `apps/dms-material-e2e/src/helpers/shared-prisma-client.helper.ts`             | Prisma client instance shared across test helpers for direct DB access           |
| `apps/dms-material-e2e/src/helpers/seed-*.helper.ts`                           | Seed helpers — create test data in the shared SQLite DB before tests             |
| `apps/dms-material-e2e/src/helpers/login.helper.ts`                            | Login helper used in `beforeAll` by many specs                                   |
| `apps/dms-material-e2e/src/helpers/shared-create-universe-records.helper.ts`   | Shared universe record creation (used across multiple spec suites)               |
| `apps/dms-material-e2e/src/helpers/shared-risk-groups.helper.ts`               | Shared risk group helpers                                                        |
| `apps/dms-material-e2e/src/system-integration.spec.ts`                         | **Excluded** from chromium/firefox projects — only runs in `integration` project |
| `apps/dms-material-e2e/test-database.db`                                       | Shared SQLite database used by all E2E tests (source of isolation failures)      |
| `_bmad-output/implementation-artifacts/42-1-fix-failing-chromium-e2e-tests.md` | Epic 42 Chromium story — cross-reference for overlap                             |
| `_bmad-output/implementation-artifacts/42-2-fix-failing-firefox-e2e-tests.md`  | Epic 42 Firefox story — cross-reference for overlap                              |
| `_bmad-output/implementation-artifacts/sprint-status.yaml`                     | Sprint tracker — Epic 42 stories are `ready-for-dev`                             |

---

### Architecture Context

#### Test Execution Model

- **Serial execution:** `workers: 1`, `fullyParallel: false` — tests run one-at-a-time in a
  single worker process. This means test ordering matters: a spec that leaves dirty state in the
  database or localStorage will corrupt the next spec in execution order.
- **Spec execution order:** Playwright runs specs in the order they are discovered, which for
  this project is effectively **alphabetical by file name** within `apps/dms-material-e2e/src/`.
  To find which spec runs _before_ a failing spec, sort the spec filenames alphabetically.
- **Retries:** `retries: 2` locally, `retries: 3` in CI. A test that fails on attempt 1 but
  passes on attempt 2 is flaky-but-not-broken; a test that exhausts all retries is a true failure.
  The Playwright output shows `(retry N/M)` for retried tests.

#### Shared SQLite Database

- **Path:** `apps/dms-material-e2e/test-database.db`
- All E2E tests use this single database file. There is no test isolation at the DB level —
  data created by one spec persists until that spec's `afterAll` deletes it.
- **Common isolation failure pattern:** A spec's `afterAll` fails or is skipped (e.g., due to
  a crash mid-test), leaving seed data in the DB. The next spec's `beforeAll` then finds
  unexpected rows and fails an assertion or uniqueness constraint.
- **How to inspect:** Use `shared-prisma-client.helper.ts` to query the DB directly in a
  one-off script, or use `npx prisma studio --schema prisma/schema.prisma` to browse visually.

#### Browser Differences (Firefox vs. Chromium)

- Firefox on Linux resolves `localhost` to `::1` (IPv6), but the dev server only binds to
  IPv4 (`0.0.0.0`). The playwright config overrides `baseURL` to `http://127.0.0.1:4301` for
  the Firefox project — this is intentional.
- Firefox-specific failures that are class B (functional regression) and not present in Chromium
  are likely caused by CSS layout differences, timing differences in animations, or Web API
  compatibility gaps. Document which browser(s) are affected for each failure.

#### WebServer Auto-Start

The `playwright.config.ts` `webServer` section defines three servers:

1. Backend: `pnpm nx run server:e2e-server` → `http://localhost:3001/api/health`
2. Frontend: `pnpm nx run dms-material:serve-e2e` → `http://localhost:4301`
3. Storybook: `pnpm nx run dms-material:storybook --port 6006` → `http://localhost:6006`

All have `reuseExistingServer: true` — if already running, Playwright reuses them. If not
running, Playwright starts them automatically before the first test. Startup timeout is 120s each.

#### Playwright Trace Viewer

`trace: 'on-first-retry'` is set globally. On the first retry of a failing test, Playwright
records a full trace (network, console, DOM snapshots). Traces are saved to
`apps/dms-material-e2e/test-results/`. Use `npx playwright show-trace <path>` to inspect.

---

### Failure Classification Guide

| Class                         | Behaviour                                                | Root Cause Category                                                          | Fix Epic   |
| ----------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------- | ---------- |
| **A — Isolation failure**     | Passes when run alone with `--grep`; fails in full suite | Dirty shared state from a prior spec (DB rows, localStorage, session cookie) | Story 76.2 |
| **B — Functional regression** | Fails when run alone with `--grep`                       | Application code bug — UI assertion mismatch, API error, missing data        | Story 76.3 |

**Decision algorithm:**

1. Run the test in isolation using `--grep`.
2. If it **passes** → class A. Identify which preceding spec leaves dirty state.
3. If it **fails** → class B. Use Playwright MCP server to reproduce visually.
4. Edge case: if it fails in isolation _intermittently_, classify as A (flaky due to timing) and
   note the non-deterministic behaviour.

**For class-A diagnosis — what to look for:**

- Missing `await seedHelper.cleanup()` in an `afterAll` of a preceding spec
- `afterAll` runs but only partially deletes records (e.g., deletes positions but not accounts)
- `beforeAll` in the failing spec asserts a "clean" DB state (zero rows) but finds leftover data
- localStorage or sessionStorage set by a preceding spec and not cleared
- Auth cookie / session data not invalidated after a logout flow

**For class-B diagnosis — what to document:**

- The exact Playwright assertion: `expect(locator).toHaveText(...)` with expected vs. actual
- The URL / route where the failure occurs
- The component or API endpoint suspected (use `grep_search` across `apps/` source if needed)
- Whether the failure is reproducible 100% of the time or intermittent

---

### Chromium Failure Catalogue

> **Run date:** 2026-04-18. Full suite: 650 passed, **6 failed**, 7 flaky, 130 skipped (28.6 min).
> Story expected 5 failures; actual is 6 (the Fidelity Import test was not in the original count).

**Test 1:**

- Spec file: `account-table-sort.spec.ts:90:9`
- Test description: `Account Tables - Sorting (Story 37.1 - Failing Tests) › Open Positions table sort › clicking Buy Date header sorts Open Positions rows by buy date ascending (EXPECTED TO FAIL)`
- Error message: `Expected to fail, but passed.`
- Failed on all 3 attempts (attempt 1 + 2 retries)
- Isolation result: **Fail** (reproduced in batch isolation run — 6 failed, 1.3 min)
- Classification: **B** (functional regression)
- Root cause notes: Test is wrapped with `test.fail()` expecting the sort to be broken, but the underlying sort logic now works correctly. The `test.fail()` annotation is stale — the test assertion passes, which causes the `test.fail()` wrapper to report failure. Fix: remove the `test.fail()` annotation (Story 76.3).

**Test 2:**

- Spec file: `account-table-sort.spec.ts:157:9`
- Test description: `Account Tables - Sorting (Story 37.1 - Failing Tests) › Closed Positions table sort › clicking Sell Date header sorts Closed Positions rows by sell date ascending (EXPECTED TO FAIL)`
- Error message: `Expected to fail, but passed.`
- Failed on all 3 attempts (attempt 1 + 2 retries)
- Isolation result: **Fail**
- Classification: **B** (functional regression)
- Root cause notes: Same as Test 1 — stale `test.fail()` annotation. The sell date sort now works correctly. Note: a third test in the same file (`account-table-sort.spec.ts:223` — Dividend Deposits Amount sort) is also marked `test.fail()` but still fails as expected, confirming that sort is not yet fixed.

**Test 3:**

- Spec file: `fidelity-import.spec.ts:288:9`
- Test description: `Fidelity Import E2E › Partial Success › should report errors for invalid rows while importing valid ones`
- Error message:
  ```text
  Error: expect(received).toBeGreaterThan(expected)
  Expected: > 0
  Received:   0
    at fidelity-import.spec.ts:311:42
  ```
  Line 310 asserts `responseBody.imported > 0` (passes), line 311 asserts `responseBody.errors.length > 0` (fails — errors array is empty).
- Failed on all 3 attempts
- Isolation result: **Fail**
- Classification: **B** (functional regression)
- Root cause notes: The Fidelity import API endpoint accepts all rows without rejecting invalid ones — `responseBody.errors` is an empty array. The test expects partial success (some imported, some errors). Suspected application code: the server-side import validation logic in `apps/server/` Fidelity import route.

**Test 4:**

- Spec file: `storybook-snapshots.spec.ts:27:7`
- Test description: `Storybook Dual-Theme Snapshots › BaseTable - Default`
- Error message:
  ```text
  Error: expect(page).toHaveScreenshot(expected) failed
  431 pixels (ratio 0.01 of all image pixels) are different.
  Snapshot: shared-basetable--default-light.png
    at helpers/storybook-theme-snapshot.ts:23
  ```
  Comparison against stored snapshot `shared-basetable--default-light-chromium-linux.png`.
- Failed on all 3 attempts (stable screenshot — "captured a stable screenshot" in logs)
- Isolation result: **Fail**
- Classification: **B** (functional regression)
- Root cause notes: Visual regression in the BaseTable component's light theme rendering. 431 pixels differ (0.01 ratio). The snapshot at `apps/dms-material-e2e/src/storybook-snapshots.spec.ts-snapshots/shared-basetable--default-light-chromium-linux.png` no longer matches the current render. **Playwright MCP browser reproduction** (Rule 7): navigating to `http://localhost:6006/iframe.html?id=shared-basetable--default&viewMode=story` reveals the component **completely crashes** with `TypeError: Cannot read properties of undefined (reading 'selector')` in the `storybook-addon-themes` code path (`computesTemplateFromComponent`). The Storybook page shows the error overlay instead of the BaseTable component. This is more severe than a cosmetic pixel diff — the component fails to render entirely. The crash occurs in the `@storybook/addon-themes` integration, suggesting a compatibility issue between the BaseTable story decorator and the theme addon. Fix: either fix the decorator/theme integration or update the snapshot (Story 76.3).

**Test 5:**

- Spec file: `universe-resort-on-edit.spec.ts:23:7`
- Test description: `Universe Re-sort After Cell Edit › BUG(72-1): row re-sorts after cell edit`
- Error message:
  ```text
  Error: expect(received).not.toBe(expected) // Object.is equality
  Expected: not "TESTIN1"
    at universe-resort-on-edit.spec.ts:60:40
  ```
  Test edits a date to far in the future, expects the first row's symbol to change (row should re-sort to bottom), but the first row still shows "TESTIN1".
- Failed on all 3 attempts
- Isolation result: **Fail**
- Classification: **B** (functional regression)
- Root cause notes: Known Bug 72-1 — after editing a cell value that affects sort order, the row does not automatically re-sort to its new position. The universe grid fails to trigger a re-sort after inline cell edit. Suspected code: `global-universe.component.ts` or the editable cell update handler.

**Test 6:**

- Spec file: `universe-symbol-sort-empty-rows.spec.ts:85:7`
- Test description: `Universe Screen - Empty Rows on Symbol Sort Bug (Story 56.1) › first visible rows have non-empty symbol cells immediately on load with Symbol ascending sort (currently FAILS — confirms bug)`
- Error message:
  ```text
  Error: Expected first visible symbol cell to be non-empty but got: ""
  expect(received).not.toBe(expected) // Object.is equality
  Expected: not ""
    at universe-symbol-sort-empty-rows.spec.ts:127:13
  ```
- Failed on all 3 attempts
- Isolation result: **Fail**
- Classification: **B** (functional regression)
- Root cause notes: Known Story 56.1 bug — on initial page load with Symbol ascending sort active, the first visible rows display empty symbol cells. The CDK virtual scroll data source emits placeholder/empty rows before the actual data loads. Suspected code: `global-universe.component.ts` `filteredData$` observable — placeholder rows not populated before rendering.

#### Chromium Flaky Tests (7 — failed once then passed on retry)

These tests are **not** counted as failures since they pass on retry, but they indicate timing-sensitive bugs related to the blank-row / lazy-load regression:

| #   | Spec file                                | Line | Test description                                                                                       | Error                                             |
| --- | ---------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| F1  | `universe-lazy-load-deep-scroll.spec.ts` | 227  | should have no blank symbol cells after incremental deep scroll across three lazy-load page boundaries | Timeout 20000ms on `assertVisibleSymbolsNonEmpty` |
| F2  | `universe-lazy-load-deep-scroll.spec.ts` | 408  | _(deep scroll boundary test)_                                                                          | Timeout 20000ms on `assertVisibleSymbolsNonEmpty` |
| F3  | `universe-lazy-load-deep-scroll.spec.ts` | 480  | should have no blank symbol cells after applying symbol filter and scrolling to bottom                 | Timeout 20000ms on `assertVisibleSymbolsNonEmpty` |
| F4  | `universe-scrolling-regression.spec.ts`  | 125  | should have no blank symbol cells after fast scroll to bottom                                          | Timeout 10000ms on `assertVisibleSymbolsNonEmpty` |
| F5  | `universe-scrolling-regression.spec.ts`  | 200  | should have no blank symbol cells after sort change then fast scroll                                   | Timeout 10000ms on `assertVisibleSymbolsNonEmpty` |
| F6  | `universe-scrolling-regression.spec.ts`  | 256  | should have no blank symbol cells after symbol filter change then fast scroll                          | Timeout 10000ms on `assertVisibleSymbolsNonEmpty` |
| F7  | `universe-scrolling-regression.spec.ts`  | 292  | should have no blank symbol cells after multiple rapid sort toggles then fast scroll                   | Timeout 10000ms on `assertVisibleSymbolsNonEmpty` |

All 7 share the same root cause: the `assertVisibleSymbolsNonEmpty` polling helper times out because blank symbol cells persist longer than the timeout. This is the CDK virtual scroll / `filteredData$` / `excludeLoadingRows` regression documented in Epics 60 and 64.

---

### Firefox Failure Catalogue

> **Run date:** 2026-04-18. Full suite: 654 passed, **7 failed**, 2 flaky, 130 skipped (33.7 min).
> Story expected 6 failures; actual is 7. The extra failure is `universe-scrolling-regression.spec.ts:125`
> which was only flaky in Chromium but hard-fails in Firefox.

**Test 1:**

- Spec file: `account-table-sort.spec.ts:90:9`
- Test description: `Account Tables - Sorting (Story 37.1 - Failing Tests) › Open Positions table sort › clicking Buy Date header sorts Open Positions rows by buy date ascending (EXPECTED TO FAIL)`
- Error message: `Expected to fail, but passed.`
- Also fails in Chromium? **Yes** (Chromium Test 1 — identical)
- Isolation result: **Fail**
- Classification: **B** (functional regression)
- Root cause notes: Same as Chromium Test 1 — stale `test.fail()` annotation.

**Test 2:**

- Spec file: `account-table-sort.spec.ts:157:9`
- Test description: `Account Tables - Sorting (Story 37.1 - Failing Tests) › Closed Positions table sort › clicking Sell Date header sorts Closed Positions rows by sell date ascending (EXPECTED TO FAIL)`
- Error message: `Expected to fail, but passed.`
- Also fails in Chromium? **Yes** (Chromium Test 2 — identical)
- Isolation result: **Fail**
- Classification: **B** (functional regression)
- Root cause notes: Same as Chromium Test 2 — stale `test.fail()` annotation.

**Test 3:**

- Spec file: `fidelity-import.spec.ts:288:9`
- Test description: `Fidelity Import E2E › Partial Success › should report errors for invalid rows while importing valid ones`
- Error message: `expect(received).toBeGreaterThan(expected) Expected: > 0 Received: 0` at line 311
- Also fails in Chromium? **Yes** (Chromium Test 3 — identical)
- Isolation result: **Fail**
- Classification: **B** (functional regression)
- Root cause notes: Same as Chromium Test 3 — server import validation not rejecting invalid rows.

**Test 4:**

- Spec file: `storybook-snapshots.spec.ts:27:7`
- Test description: `Storybook Dual-Theme Snapshots › BaseTable - Default`
- Error message: `expect(page).toHaveScreenshot(expected) failed` — pixel diff against stored snapshot
- Also fails in Chromium? **Yes** (Chromium Test 4 — identical mechanism, different browser snapshot)
- Isolation result: **Fail**
- Classification: **B** (functional regression)
- Root cause notes: Same as Chromium Test 4 — visual regression in BaseTable component. Firefox may use a separate snapshot file (`-firefox-linux.png`).

**Test 5:**

- Spec file: `universe-resort-on-edit.spec.ts:23:7`
- Test description: `Universe Re-sort After Cell Edit › BUG(72-1): row re-sorts after cell edit`
- Error message: `expect(received).not.toBe(expected) Expected: not "TESTIN1"` at line 60
- Also fails in Chromium? **Yes** (Chromium Test 5 — identical)
- Isolation result: **Fail**
- Classification: **B** (functional regression)
- Root cause notes: Same as Chromium Test 5 — Bug 72-1, row doesn't re-sort after cell edit.

**Test 6:**

- Spec file: `universe-symbol-sort-empty-rows.spec.ts:85:7`
- Test description: `Universe Screen - Empty Rows on Symbol Sort Bug (Story 56.1) › first visible rows have non-empty symbol cells immediately on load with Symbol ascending sort (currently FAILS — confirms bug)`
- Error message: `Expected first visible symbol cell to be non-empty but got: "" — expect(received).not.toBe(expected) Expected: not ""` at line 127
- Also fails in Chromium? **Yes** (Chromium Test 6 — identical)
- Isolation result: **Fail**
- Classification: **B** (functional regression)
- Root cause notes: Same as Chromium Test 6 — Story 56.1 bug, empty symbol cells on initial load.

**Test 7 (Firefox-specific hard failure):**

- Spec file: `universe-scrolling-regression.spec.ts:125:7`
- Test description: `Universe Scrolling Regression — blank rows on fast scroll › should have no blank symbol cells after fast scroll to bottom`
- Error message:
  ```text
  Error: Timeout 10000ms exceeded while waiting on the predicate
    at assertVisibleSymbolsNonEmpty (universe-scrolling-regression.spec.ts:56:3)
    at universe-scrolling-regression.spec.ts:139:5
  ```
  "Visible rows have empty symbol cells after fast scroll to bottom. This indicates the CDK virtual scroll blank-row regression from Epic 60 is active."
- Also fails in Chromium? **Flaky** in Chromium (Chromium flaky F4 — fails on first attempt but passes on retry); **hard fail** in Firefox full suite (all 3 attempts failed)
- Isolation result: **Flaky** in Firefox isolation (failed once, passed on retry)
- Classification: **A** (flaky due to timing — per decision algorithm: intermittent isolation failure = class A)
- Root cause notes: CDK virtual scroll blank-row regression from Epic 60. The `assertVisibleSymbolsNonEmpty` helper polls for blank cells to disappear within 10s but they persist. Firefox is slower than Chromium at rendering after fast scroll, making this a hard failure in the full suite (where system load is higher) but flaky in isolation. Suspected code: `enrich-universe-with-risk-groups.function.ts` isLoading filter, `global-universe.component.ts` `filteredData$`. Not a Firefox-specific browser compatibility issue — same root cause as Chromium flaky tests.

#### Firefox Flaky Tests (2 — failed once then passed on retry)

| #   | Spec file                                | Line | Test description                                                                                       | Also flaky in Chromium? |
| --- | ---------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------ | ----------------------- |
| FF1 | `universe-lazy-load-deep-scroll.spec.ts` | 227  | should have no blank symbol cells after incremental deep scroll across three lazy-load page boundaries | Yes (Chromium F1)       |
| FF2 | `universe-lazy-load-deep-scroll.spec.ts` | 480  | should have no blank symbol cells after applying symbol filter and scrolling to bottom                 | Yes (Chromium F3)       |

Same `assertVisibleSymbolsNonEmpty` timeout root cause as the Chromium flaky tests.

---

### Epic 42 Cross-Reference

> **Fill in during task execution.** Compare the 11 failures above against Epic 42 stories.

Epic 42 stories are currently `ready-for-dev` in `sprint-status.yaml`:

- `42-1-fix-failing-chromium-e2e-tests` → `ready-for-dev`
- `42-2-fix-failing-firefox-e2e-tests` → `ready-for-dev`

Epic 42 stories did **not** prescribe specific test names — they only captured the failing count
at the time they were written. Cross-referencing means checking whether the failures in this Epic
76 run are the **same tests** that were failing when Epic 42 was created, or whether they are
different tests that have since emerged.

**Overlap summary:**

- **Stories 42.1 and 42.2 status:** Both are `Approved` / `ready-for-dev` in `sprint-status.yaml`. Neither story has been started — their Dev Agent Record sections are empty.
- **No specific test names were prescribed** in Epic 42 stories. They only captured failing counts at the time they were written and directed the developer to run the suite and fix all failures.
- **No previously-applied fixes have regressed.** Since Epic 42 was never executed, there are no "fixed then regressed" tests.
- **All 13 failures (6 Chromium + 7 Firefox) are candidates for Epic 42 fixes.** The failures found here are exactly the work Epic 42 was designed to address.
- **Recommendation:** Epic 42 stories (42.1, 42.2) should be superseded by the more granular Stories 76.2 and 76.3 which will have the full classification and root-cause context from this catalogue. Alternatively, Epic 42 stories can reference this catalogue as their investigation phase.

**Summary of unique failures across both browsers:**

| #   | Spec file                                    | Browsers affected                 | Classification   | Root cause category                                  |
| --- | -------------------------------------------- | --------------------------------- | ---------------- | ---------------------------------------------------- |
| 1   | `account-table-sort.spec.ts:90`              | Chromium + Firefox                | B                | Stale `test.fail()` — underlying sort now works      |
| 2   | `account-table-sort.spec.ts:157`             | Chromium + Firefox                | B                | Stale `test.fail()` — underlying sort now works      |
| 3   | `fidelity-import.spec.ts:288`                | Chromium + Firefox                | B                | Server import validation not rejecting invalid rows  |
| 4   | `storybook-snapshots.spec.ts:27`             | Chromium + Firefox                | B                | Visual regression — BaseTable snapshot mismatch      |
| 5   | `universe-resort-on-edit.spec.ts:23`         | Chromium + Firefox                | B                | Bug 72-1 — row doesn't re-sort after cell edit       |
| 6   | `universe-symbol-sort-empty-rows.spec.ts:85` | Chromium + Firefox                | B                | Story 56.1 — empty symbol cells on initial load      |
| 7   | `universe-scrolling-regression.spec.ts:125`  | Flaky Chromium, Hard-fail Firefox | A (flaky timing) | CDK virtual scroll blank-row regression (Epic 60/64) |

**Key finding: One class-A failure (Firefox-specific flaky timing in Test 7).** All other failures are class B (functional regression). There are no test-ordering or shared-state contamination issues — every non-flaky failure is a genuine application bug.

---

### Rules

1. **No production code changes in this story.** This story is catalogue-only. Do not modify
   any file in `apps/dms-material/`, `apps/server/`, `prisma/`, or any non-test TypeScript file.
2. **Do not modify test files.** Tests are the source of truth. Do not alter spec files or
   helpers to make failures disappear.
3. **Do not fix failures.** Even if the root cause is obvious, do not apply fixes here.
   Document the root cause so Story 76.2 or 76.3 can apply the fix with full context.
4. **Run tests with retries intact.** Do not use `--retries=0`. Run tests as configured so you
   see the real failure behaviour including retry attempts.
5. **Use `--grep` exactly as shown.** The test description must match the string in the spec
   file exactly. If the test is nested inside `test.describe`, concatenate: `"describe text test text"`.
6. **Document verbatim error messages.** Copy-paste error output from Playwright — do not
   paraphrase. Story 76.2 / 76.3 authors need exact assertion messages to target fixes.
7. **Use Playwright MCP server for at least one class-B failure.** Launch the browser, navigate
   to the failing screen, and capture a screenshot or trace link in Dev Notes.

---

### References

- [Source: `.github/epic descriptions/epics-2026-04-17.md`] — Epic 76 metadata and story 76.1 definition
- [Source: `apps/dms-material-e2e/playwright.config.ts`] — Playwright configuration
- [Cross-ref: `_bmad-output/implementation-artifacts/42-1-fix-failing-chromium-e2e-tests.md`]
- [Cross-ref: `_bmad-output/implementation-artifacts/42-2-fix-failing-firefox-e2e-tests.md`]
- [Cross-ref: `_bmad-output/implementation-artifacts/sprint-status.yaml`] — Epic 42 status

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
