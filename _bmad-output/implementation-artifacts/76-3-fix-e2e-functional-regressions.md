# Story 76.3: Fix Functional Regressions Exposed by E2E Tests

Status: Approved

## Story

As a developer,
I want all E2E tests classified as functional regressions in Story 76.1 to be fixed by
correcting the application code that causes them to fail,
so that the full E2E suite passes reliably on both Chromium and Firefox with no known
functional defects.

## Acceptance Criteria

1. **Given** the list of class-B functional regression tests from Story 76.1,
   **When** the developer applies the targeted production code fix for each failing assertion
   (guided by the root-cause documentation in Story 76.1),
   **Then** each previously-failing class-B test now passes when run in isolation.

2. **Given** all class-B fixes applied,
   **When** `pnpm e2e:dms-material:chromium` is run (full suite, after Story 76.2 isolation
   fixes are also in place),
   **Then** all 5 previously failing Chromium tests now pass.

3. **Given** all class-B fixes applied,
   **When** `pnpm e2e:dms-material:firefox` is run (full suite),
   **Then** all 6 previously failing Firefox tests now pass.

4. **Given** the production code changes,
   **When** `pnpm all` runs,
   **Then** all unit tests and E2E tests continue to pass with no regressions.

5. **Given** Story 76.1 found zero class-B failures (all failures were isolation-only),
   **When** this story is reached,
   **Then** it is marked as N/A in Dev Notes with confirmation that both full-suite runs already
   pass after Story 76.2, and `pnpm all` passes.

## Tasks / Subtasks

- [ ] Read Story 76.1 Dev Agent Record and extract class-B functional regression failures (AC: #1)
  - [ ] Open `_bmad-output/implementation-artifacts/76-1-catalogue-failing-e2e-tests.md`
  - [ ] Read the **Chromium Failure Catalogue** section and collect every entry where
        Classification = **B**
  - [ ] Read the **Firefox Failure Catalogue** section and collect every entry where
        Classification = **B** (including Firefox-specific class-B entries)
  - [ ] Build a working list of class-B failures: spec file, test description, root cause notes,
        suspected application code location
  - [ ] **N/A path:** If zero class-B failures are found in both catalogues, proceed to the N/A
        path task below and skip all fix tasks

- [ ] **N/A path (conditional — only if zero class-B failures found)** (AC: #5)
  - [ ] Add a note at the top of the Dev Agent Record: _"Story 76.3 N/A — Story 76.1 found zero
        class-B functional regression failures. All failures were isolation issues fixed in
        Story 76.2."_
  - [ ] Run `pnpm e2e:dms-material:chromium` and confirm it exits with status 0
  - [ ] Run `pnpm e2e:dms-material:firefox` and confirm it exits with status 0
  - [ ] Run `pnpm all` and confirm it passes
  - [ ] Record all three outcomes in Dev Agent Record Completion Notes
  - [ ] Mark all remaining tasks as N/A and complete this story

- [ ] For each class-B failure — reproduce and fix (AC: #1, #2, #3)
  *(Repeat the subtask block below for every class-B failure found in Story 76.1. The count is
  unknown until Story 76.1's Dev Agent Record is read. Create one sub-block per failure.)*

  **[Class-B Failure #N — placeholder; replace with actual test description from Story 76.1]**
  - [ ] Read the root cause documented in Story 76.1's Dev Agent Record for this test
  - [ ] Use Playwright MCP server to reproduce the failure visually in the browser:
    - [ ] Launch browser via the Playwright MCP tool
    - [ ] Navigate to the route / screen where the assertion fails
    - [ ] Reproduce the failing user interaction step-by-step
    - [ ] Confirm the visual failure matches the recorded assertion error
  - [ ] Identify the production code file(s) responsible (use `grep_search` across
        `apps/dms-material/` and `apps/server/` if needed)
  - [ ] Apply the minimal fix at the root cause in the production code (see Angular 21 conventions
        below — do NOT modify any E2E spec file)
  - [ ] Run the individual test in isolation to confirm it passes:
        `pnpm nx run dms-material-e2e:e2e --project=chromium --grep "<exact test description>"`
        (use `--project=firefox` for Firefox-specific failures)
  - [ ] If the same test also fails in Firefox, verify it passes under Firefox in isolation:
        `pnpm nx run dms-material-e2e:e2e --project=firefox --grep "<exact test description>"`
  - [ ] Run `pnpm all` to confirm no regressions introduced by this fix

- [ ] Verify Chromium full suite passes (AC: #2)
  - [ ] Run: `pnpm e2e:dms-material:chromium`
  - [ ] Confirm all 5 previously failing Chromium tests now pass (class-A fixed by Story 76.2
        + class-B fixed by this story)
  - [ ] Confirm no previously passing tests have regressed
  - [ ] Record full suite pass/fail counts and exit status in Dev Agent Record

- [ ] Verify Firefox full suite passes (AC: #3)
  - [ ] Run: `pnpm e2e:dms-material:firefox`
  - [ ] Confirm all 6 previously failing Firefox tests now pass
  - [ ] Confirm no previously passing tests have regressed
  - [ ] Record full suite pass/fail counts and exit status in Dev Agent Record

- [ ] Final `pnpm all` regression check (AC: #4)
  - [ ] Run: `pnpm all`
  - [ ] Confirm all unit tests, Chromium E2E tests, and Firefox E2E tests pass
  - [ ] Record outcome in Dev Agent Record

## Dev Notes

### This is the Final Story in Epic 76

Story 76.3 is the **last story** in Epic 76. When this story is marked complete:
- `pnpm e2e:dms-material:chromium` must exit with **status 0** (all tests pass)
- `pnpm e2e:dms-material:firefox` must exit with **status 0** (all tests pass)
- `pnpm all` must exit with **status 0** (no unit or E2E regressions)

Do not mark this story complete until all three conditions are confirmed.

---

### Input: Story 76.1 Class-B Failure List

**This story's entire scope is determined by Story 76.1.** Before writing any fix, read the
completed Dev Agent Record in:

```
_bmad-output/implementation-artifacts/76-1-catalogue-failing-e2e-tests.md
```

Focus on:
- **Chromium Failure Catalogue** — entries with `Classification: B`
- **Firefox Failure Catalogue** — entries with `Classification: B`
- The **Root cause notes** and **suspected application code location** for each class-B entry

> **Prerequisite:** Story 76.1 must be fully executed (no TBD entries remain in the catalogues)
> and Story 76.2 must be complete before starting this story. If either predecessor story is
> incomplete, do NOT proceed.

---

### N/A Path

If the Story 76.1 Dev Agent Record shows **zero class-B failures** in both the Chromium and
Firefox catalogues, this story is N/A:

1. Add a note to the Dev Agent Record Completion Notes: _"Story 76.3 N/A — Story 76.1 found
   zero class-B functional regression failures. No production code fixes are required. All
   failures were isolation issues resolved in Story 76.2."_
2. Run `pnpm e2e:dms-material:chromium` and confirm it exits with status 0.
3. Run `pnpm e2e:dms-material:firefox` and confirm it exits with status 0.
4. Run `pnpm all` and confirm it passes.
5. Mark this story complete.

This is a valid and expected outcome. Do not invent work to do.

---

### Fix Workflow (5-Step Sequence — Apply to Each Class-B Failure)

For each class-B failure from Story 76.1's Dev Agent Record, follow these steps **in order**:

1. **Read the root cause** — Open Story 76.1 and locate the class-B entry. Read the documented
   failing assertion (expected vs. actual), the URL/route, and the suspected application code
   location.

2. **Reproduce visually with Playwright MCP** — Use the Playwright MCP server tool to open a
   browser, navigate to the failing screen, and reproduce the failure step-by-step. Confirm the
   visual failure matches the recorded assertion error. Do not skip this step — visual
   reproduction prevents fixing the wrong thing.

3. **Identify the production code root cause** — Locate the component, service, API route, or
   data layer responsible. Use `grep_search` across `apps/dms-material/src/` (frontend) or
   `apps/server/src/` (backend) to find the relevant file. Do not guess; trace the data flow from
   the UI assertion back to the source.

4. **Apply the minimal fix** — Change only the code necessary to fix the root cause. Do not
   refactor, rename, or "improve" adjacent code. Follow Angular 21 conventions (see below). Do
   **not** modify any file under `apps/dms-material-e2e/`.

5. **Verify in isolation, then in full suite** — Run the individual test in isolation with
   `--grep` to confirm it passes. Then run the full Chromium or Firefox suite to confirm no
   regressions. Finally run `pnpm all` for the complete regression check.

---

### Angular 21 Conventions — Production Code Fixes

All frontend production code in `apps/dms-material/src/` follows these conventions. Violations
will cause unexpected rendering or reactivity bugs:

#### Zoneless Change Detection
- This is a **zoneless Angular application** — `Zone.js` is not loaded.
- Do **not** rely on `setTimeout`, `setInterval`, or DOM events triggering automatic change
  detection. Use Angular's reactive primitives instead.
- Any async operation that updates UI state must go through a signal, `AsyncPipe`, or
  `markForCheck()` / `detectChanges()` via `ChangeDetectorRef` where signals are not yet in use.

#### Signals-First Reactivity
- Prefer `signal()`, `computed()`, and `effect()` from `@angular/core` for state management.
- When updating signal state in response to user interaction or async data, use `signal.set()` or
  `signal.update()` — not direct mutation.
- If a component uses `input()` signal inputs (Angular 17+), do not assign to them directly.
  They are read-only from the component's perspective.

#### OnPush Change Detection Strategy
- All components use `ChangeDetectionStrategy.OnPush`.
- Only signal mutations and `@Input` reference changes trigger re-renders.
- If a fix involves updating mutable object properties in place (e.g., array push, object
  property assignment), the component will **not** re-render unless you replace the reference
  or use a signal.

#### Standalone Components
- Components are standalone (no `NgModule` declarations). When creating or modifying a component,
  ensure all dependencies are listed in its `imports` array.

#### RxJS Usage
- Where RxJS observables are used (services, HTTP calls), prefer `toSignal()` to bridge into
  the signal graph rather than subscribing imperatively in the component.
- Do not add new subscriptions without corresponding `takeUntilDestroyed()` or `unsubscribe()`
  teardown.

---

### Key Rules

1. **Playwright MCP server is required for visual reproduction.** Do not attempt a fix from the
   error message alone. Always reproduce visually first.
2. **Minimal fix principle.** Change only the code responsible for the failing assertion. Do not
   refactor surrounding code, rename variables, add comments, or "clean up" unrelated areas.
3. **No E2E spec file modifications.** Do not change any file under
   `apps/dms-material-e2e/src/`. All production code changes are in `apps/dms-material/src/`
   (frontend) or `apps/server/src/` (backend).
4. **No assertion weakening.** If the fix requires changing a test assertion to match a different
   (weaker) expected value, that is not a fix — it is a cover-up. The production behaviour must
   match the original assertion.
5. **No `test.skip()` or `test.fixme()`.** Tests must be fixed, not disabled.
6. **Verify in isolation before the full suite.** Always confirm each individual test passes
   in isolation with `--grep` before running the full suite to avoid confusing failures.
7. **Run `pnpm all` after each fix.** Each production code change must not break unit tests or
   other E2E tests. Run `pnpm all` after every fix before moving to the next class-B failure.

---

### Key Commands

| Purpose | Command |
|---|---|
| Run full Chromium suite | `pnpm e2e:dms-material:chromium` |
| Run full Firefox suite | `pnpm e2e:dms-material:firefox` |
| Run single test in isolation (Chromium) | `pnpm nx run dms-material-e2e:e2e --project=chromium --grep "<test description>"` |
| Run single test in isolation (Firefox) | `pnpm nx run dms-material-e2e:e2e --project=firefox --grep "<test description>"` |
| Run all tests (unit + e2e) | `pnpm all` |
| Show last git diff (verify changed files) | `git diff --name-only` |
| Check backend health | `curl http://localhost:3001/api/health` |
| Open Playwright trace viewer | `npx playwright show-trace apps/dms-material-e2e/test-results/<trace>.zip` |

> **`--grep` tip:** The value must exactly match the full test description string as written in
> `test('...')`. For suites using `test.describe('outer', () => test('inner'))`, use the
> combined string: `outer inner`. Wrap in quotes and escape special characters as needed.

---

### Key File Locations

| Area | Path |
|---|---|
| **Frontend source** | `apps/dms-material/src/` |
| **Backend source** | `apps/server/src/` |
| **E2E spec files** | `apps/dms-material-e2e/src/*.spec.ts` |
| **E2E helpers** | `apps/dms-material-e2e/src/helpers/` |
| **Playwright config** | `apps/dms-material-e2e/playwright.config.ts` |
| **Shared Prisma client (E2E)** | `apps/dms-material-e2e/src/helpers/shared-prisma-client.helper.ts` |
| **Test database** | `apps/dms-material-e2e/test-database.db` |
| **Story 76.1 (class-B source)** | `_bmad-output/implementation-artifacts/76-1-catalogue-failing-e2e-tests.md` |
| **Story 76.2 (isolation fixes)** | `_bmad-output/implementation-artifacts/76-2-fix-e2e-test-isolation.md` |
| **Playwright test results / traces** | `apps/dms-material-e2e/test-results/` |

---

### Architecture: Test Execution Model (Reference)

- **Serial execution:** `workers: 1`, `fullyParallel: false` — tests run one-at-a-time in a
  single worker process.
- **Retries:** `retries: 2` locally, `retries: 3` in CI. A test that exhausts all retries is a
  true failure.
- **Spec order:** Playwright runs specs in effectively alphabetical order by filename within
  `apps/dms-material-e2e/src/`.
- **WebServer auto-start:** `playwright.config.ts` will auto-start backend, frontend, and
  Storybook if not already running (`reuseExistingServer: true`). Running the E2E command
  directly is sufficient.
- **Trace viewer:** `trace: 'on-first-retry'` — traces saved to `test-results/`. Use
  `npx playwright show-trace <path>` to inspect DOM snapshots, network calls, and console logs
  at the point of failure.

---

### Cross-Reference: Epic 42

Epic 42 (`42-1-fix-failing-chromium-e2e-tests.md`, `42-2-fix-failing-firefox-e2e-tests.md`)
attempted previous fixes for overlapping failures. Per Story 76.1 analysis, those stories are
`ready-for-dev` (not yet applied). If Story 76.1's class-B root cause notes reference an Epic 42
diagnosis:
- Do **not** blindly apply the Epic 42 proposed fix without re-verifying with Playwright MCP.
- The codebase may have changed since Epic 42 was written. Verify the root cause is still valid.
- If the Epic 42 fix is still correct, apply it. If not, apply the correct minimal fix instead.

## Dev Agent Record

### Agent Model Used

*(Fill in when executing this story)*

### Debug Log References

*(Fill in references to Playwright traces, console logs, or browser screenshots captured during
visual reproduction of each class-B failure.)*

### Completion Notes List

*(Fill in after execution. For each class-B failure fixed, record:*
*- Test description*
*- Production file(s) changed*
*- Nature of the fix (1–2 sentences)*
*- Isolation verification: passed (browser, command used)*
*- Full suite verification: passed)*

*(If N/A path was taken, record: "Story 76.3 N/A — zero class-B failures. Chromium full suite:
PASSED. Firefox full suite: PASSED. pnpm all: PASSED.")*

### File List

*(Fill in after execution — list all production files modified, with the relative path from the
workspace root. E2E spec files must NOT appear in this list.)*
