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

| Purpose | Command |
|---|---|
| Run full Chromium suite | `pnpm e2e:dms-material:chromium` |
| Run full Firefox suite | `pnpm e2e:dms-material:firefox` |
| Run single test in isolation (Chromium) | `pnpm nx run dms-material-e2e:e2e --project=chromium --grep "<test description>"` |
| Run single test in isolation (Firefox) | `pnpm nx run dms-material-e2e:e2e --project=firefox --grep "<test description>"` |
| Run single spec file (Chromium) | `pnpm nx run dms-material-e2e:e2e --project=chromium -- --grep-file apps/dms-material-e2e/src/<spec>.spec.ts` |
| Run all tests (unit + e2e) | `pnpm all` |
| Show last git diff (verify no prod code changed) | `git diff --name-only` |
| Check health of backend server | `curl http://localhost:3001/api/health` |

> **`--grep` tip:** The value must match the full test description string exactly as written in
> `test('...')`. Wrap in quotes and escape any special characters. For suites that use
> `test.describe('outer', () => test('inner'))`, use the combined string: `outer inner`.

---

### Key Files

| File | Purpose |
|---|---|
| `apps/dms-material-e2e/playwright.config.ts` | Playwright configuration — browsers, timeouts, retries, webServer, baseURL |
| `apps/dms-material-e2e/src/*.spec.ts` | All E2E spec files (~70 files, alphabetical order) |
| `apps/dms-material-e2e/src/helpers/shared-prisma-client.helper.ts` | Prisma client instance shared across test helpers for direct DB access |
| `apps/dms-material-e2e/src/helpers/seed-*.helper.ts` | Seed helpers — create test data in the shared SQLite DB before tests |
| `apps/dms-material-e2e/src/helpers/login.helper.ts` | Login helper used in `beforeAll` by many specs |
| `apps/dms-material-e2e/src/helpers/shared-create-universe-records.helper.ts` | Shared universe record creation (used across multiple spec suites) |
| `apps/dms-material-e2e/src/helpers/shared-risk-groups.helper.ts` | Shared risk group helpers |
| `apps/dms-material-e2e/src/system-integration.spec.ts` | **Excluded** from chromium/firefox projects — only runs in `integration` project |
| `apps/dms-material-e2e/test-database.db` | Shared SQLite database used by all E2E tests (source of isolation failures) |
| `_bmad-output/implementation-artifacts/42-1-fix-failing-chromium-e2e-tests.md` | Epic 42 Chromium story — cross-reference for overlap |
| `_bmad-output/implementation-artifacts/42-2-fix-failing-firefox-e2e-tests.md` | Epic 42 Firefox story — cross-reference for overlap |
| `_bmad-output/implementation-artifacts/sprint-status.yaml` | Sprint tracker — Epic 42 stories are `ready-for-dev` |

---

### Architecture Context

#### Test Execution Model

- **Serial execution:** `workers: 1`, `fullyParallel: false` — tests run one-at-a-time in a
  single worker process. This means test ordering matters: a spec that leaves dirty state in the
  database or localStorage will corrupt the next spec in execution order.
- **Spec execution order:** Playwright runs specs in the order they are discovered, which for
  this project is effectively **alphabetical by file name** within `apps/dms-material-e2e/src/`.
  To find which spec runs *before* a failing spec, sort the spec filenames alphabetically.
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

| Class | Behaviour | Root Cause Category | Fix Epic |
|---|---|---|---|
| **A — Isolation failure** | Passes when run alone with `--grep`; fails in full suite | Dirty shared state from a prior spec (DB rows, localStorage, session cookie) | Story 76.2 |
| **B — Functional regression** | Fails when run alone with `--grep` | Application code bug — UI assertion mismatch, API error, missing data | Story 76.3 |

**Decision algorithm:**
1. Run the test in isolation using `--grep`.
2. If it **passes** → class A. Identify which preceding spec leaves dirty state.
3. If it **fails** → class B. Use Playwright MCP server to reproduce visually.
4. Edge case: if it fails in isolation *intermittently*, classify as A (flaky due to timing) and
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

> **Fill in during task execution.** Add one entry per failing test (5 expected).

**Test 1:**
- Spec file: *(TBD)*
- Test description: *(TBD)*
- Error message: *(TBD)*
- Isolation result (pass/fail): *(TBD)*
- Classification: *(A / B)*
- Root cause notes: *(TBD)*

**Test 2:**
- Spec file: *(TBD)*
- Test description: *(TBD)*
- Error message: *(TBD)*
- Isolation result (pass/fail): *(TBD)*
- Classification: *(A / B)*
- Root cause notes: *(TBD)*

**Test 3:**
- Spec file: *(TBD)*
- Test description: *(TBD)*
- Error message: *(TBD)*
- Isolation result (pass/fail): *(TBD)*
- Classification: *(A / B)*
- Root cause notes: *(TBD)*

**Test 4:**
- Spec file: *(TBD)*
- Test description: *(TBD)*
- Error message: *(TBD)*
- Isolation result (pass/fail): *(TBD)*
- Classification: *(A / B)*
- Root cause notes: *(TBD)*

**Test 5:**
- Spec file: *(TBD)*
- Test description: *(TBD)*
- Error message: *(TBD)*
- Isolation result (pass/fail): *(TBD)*
- Classification: *(A / B)*
- Root cause notes: *(TBD)*

---

### Firefox Failure Catalogue

> **Fill in during task execution.** Add one entry per failing test (6 expected).

**Test 1:**
- Spec file: *(TBD)*
- Test description: *(TBD)*
- Error message: *(TBD)*
- Also fails in Chromium? *(Yes / No)*
- Isolation result (pass/fail): *(TBD)*
- Classification: *(A / B)*
- Root cause notes: *(TBD)*

**Test 2:**
- Spec file: *(TBD)*
- Test description: *(TBD)*
- Error message: *(TBD)*
- Also fails in Chromium? *(Yes / No)*
- Isolation result (pass/fail): *(TBD)*
- Classification: *(A / B)*
- Root cause notes: *(TBD)*

**Test 3:**
- Spec file: *(TBD)*
- Test description: *(TBD)*
- Error message: *(TBD)*
- Also fails in Chromium? *(Yes / No)*
- Isolation result (pass/fail): *(TBD)*
- Classification: *(A / B)*
- Root cause notes: *(TBD)*

**Test 4:**
- Spec file: *(TBD)*
- Test description: *(TBD)*
- Error message: *(TBD)*
- Also fails in Chromium? *(Yes / No)*
- Isolation result (pass/fail): *(TBD)*
- Classification: *(A / B)*
- Root cause notes: *(TBD)*

**Test 5:**
- Spec file: *(TBD)*
- Test description: *(TBD)*
- Error message: *(TBD)*
- Also fails in Chromium? *(Yes / No)*
- Isolation result (pass/fail): *(TBD)*
- Classification: *(A / B)*
- Root cause notes: *(TBD)*

**Test 6:**
- Spec file: *(TBD)*
- Test description: *(TBD)*
- Error message: *(TBD)*
- Also fails in Chromium? *(Yes / No)*
- Isolation result (pass/fail): *(TBD)*
- Classification: *(A / B)*
- Root cause notes: *(TBD)*

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

**Overlap summary:** *(TBD — fill in after running both suites)*

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
