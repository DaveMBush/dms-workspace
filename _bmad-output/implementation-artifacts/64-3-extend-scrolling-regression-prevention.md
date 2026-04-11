# Story 64.3: Extend Scrolling Regression Prevention Suite

Status: Approved

## Story

As a developer,
I want the Playwright regression-prevention suite for Universe scrolling extended to cover any new
failure modes found in this round,
so that a future regression is caught immediately in CI rather than discovered in the next sprint.

## Acceptance Criteria

1. **Given** the regression-prevention suite runs against the Universe screen,
   **When** the screen loads and the user scrolls in multiple patterns,
   **Then** all test cases pass with no blank rows, no position jumps, and no stutter.

2. **Given** the suite now covers failure modes from Epics 29, 31, 44, 60, and 64,
   **When** a future change re-introduces any of those defects,
   **Then** at least one test in the suite fails before the change ships.

3. **Given** all changes are applied,
   **When** `pnpm all` runs,
   **Then** all tests pass with no regressions.

## Definition of Done

- [ ] Playwright tests added for any new failure mode discovered in Story 64.1 that is not already covered by the suite from Epic 60 Story 60.3
- [ ] Existing tests from Story 60.3 continue to pass (no regressions)
- [ ] All new tests pass green
- [ ] `pnpm run e2e:dms-material:chromium` passes
- [ ] `pnpm all` passes

## Tasks / Subtasks

- [ ] Task 1: Review what the Story 60.3 suite already covers (AC: #1, #2)
  - [ ] Subtask 1.1: Read `universe-scrolling-regression.spec.ts` in full — list every existing test case and the Epic it guards against
  - [ ] Subtask 1.2: Read the Story 64.1 Dev Agent Record — identify whether the Round 5 root cause (`excludeLoadingRows` filter / new regression vector) introduced any failure mode NOT already exercised by an existing test
  - [ ] Subtask 1.3: Identify any gap: the sort-change test existed but was the failing one; check whether the fix in Story 64.2 makes it reliably green or if a more targeted variant is needed

- [ ] Task 2: Add new test cases for Round 5 failure modes (AC: #1, #2)
  - [ ] Subtask 2.1: If the `excludeLoadingRows` filter path is confirmed as a new regression vector in Story 64.1/64.2, add a test that specifically targets this path — e.g., a test that verifies array length stability by counting rows before and after a sort change during loading
  - [ ] Subtask 2.2: Add test: rapid multiple sort-column toggles followed by fast scroll — this exercises the scenario where sort triggers multiple consecutive `isLoading` windows; assert no blank symbol cells after final settle
  - [ ] Subtask 2.3: Add test: apply a symbol filter that returns a subset of rows, wait for results, then scroll to bottom — assert no blank rows; this guards against the filter + scroll interaction that the `excludeLoadingRows` filter previously affected
  - [ ] Subtask 2.4: Each new test case must include a comment block citing: (a) which Epic it guards against, (b) the root cause, and (c) what to look for if the test fails in the future

- [ ] Task 3: Ensure existing Story 60.3 tests are all green (AC: #1, #3)
  - [ ] Subtask 3.1: Run the full `universe-scrolling-regression.spec.ts` suite; confirm all previously-green tests remain green
  - [ ] Subtask 3.2: Confirm the sort-change test (previously flaky/failing, now fixed by 64.2) is deterministically green — if it remains flaky, increase the settle timeout or use a more reliable polling approach

- [ ] Task 4: Confirm full suite passes (AC: #3)
  - [ ] Subtask 4.1: Run `pnpm run e2e:dms-material:chromium` — confirm all scrolling regression tests pass
  - [ ] Subtask 4.2: Run `pnpm all` — confirm no regressions across the full suite

## Dev Notes

### Key Files

| File | Purpose |
|------|---------|
| `apps/dms-material-e2e/src/universe-scrolling-regression.spec.ts` | **Primary file to extend** — all new tests go here; existing tests must not be modified or removed |
| `apps/dms-material-e2e/src/helpers/seed-scroll-universe-data.helper.ts` | Seeds 60 rows (`USCRL{n}`) with cleanup; reuse `beforeAll`/`afterAll` pattern already in file |
| `apps/dms-material-e2e/src/helpers/login.helper.ts` | `login(page)` — called in `beforeEach`; do not replicate inline |
| Story 64.1 Dev Agent Record | Source of root-cause explanation to embed as test comments |
| Story 64.2 Dev Agent Record | Source of fix explanation to cite in round-5 guards |

### Architecture Context

The regression-prevention suite uses `expect.poll()` for all assertions to avoid flakiness from
timing windows. New tests must follow the same `assertVisibleSymbolsNonEmpty()` helper pattern
already established in the file — do NOT introduce fixed `waitForTimeout()` sleeps.

The existing test structure (`test.describe` + `test.beforeAll` seed + `test.afterAll` cleanup +
`test.beforeEach` login/navigate) is the correct pattern. New tests should join the existing
`test.describe` block so they share the seeded data.

### Test Coverage Map (post-Story 64.3)

| Test Scenario | Epic Guarded | Root Cause Guarded Against |
|--------------|-------------|---------------------------|
| Fast scroll to bottom | 29 / 31 / 44 / 60 / 64 | rowHeight mismatch, contain:strict, will-change, null→placeholder (60), excludeLoadingRows (64) |
| Scroll bottom → top | 29 / 31 / 44 / 60 / 64 | Re-entry of evicted rows triggering new isLoading cycle |
| Repeated oscillation (bottom ↔ top × 2) | 44 / 60 / 64 | Multiple overlapping isLoading windows destabilising CDK height |
| Sort change then fast scroll | 60 / 64 | Sort triggers mass isLoading; excludeLoadingRows removed rows; CDK height collapse |
| Symbol filter change then fast scroll | 60 / 64 | Filter triggers server round-trip; isLoading window during scroll |
| *NEW* Multiple rapid sort toggles then fast scroll | 64 | Consecutive isLoading batches from repeated sort changes; array length oscillation |
| *NEW* Subset filter + scroll to bottom | 64 | Regression where excludeLoadingRows interacted with filtered result size |

### Technical Guidance

1. **Reuse `assertVisibleSymbolsNonEmpty()` helper** — it is already in the file and handles the
   `expect.poll()` retry loop. Only extend it if a new assertion type is genuinely needed.
2. **Reuse `scrollViewportToBottom()` and `scrollViewportToTop()` helpers** — already in the file.
3. **New tests join the existing `test.describe` block** so they share the `beforeAll` seed — do
   not create a second `test.describe` with a duplicate seed.
4. **Sort toggle pattern**:
   ```ts
   const symbolHeader = page.getByRole('button', { name: 'Symbol' });
   await symbolHeader.click(); // ascending
   await page.waitForTimeout(100);
   await page.waitForLoadState('networkidle');
   await symbolHeader.click(); // descending
   await page.waitForTimeout(100);
   await page.waitForLoadState('networkidle');
   ```
5. **Symbol filter pattern**:
   ```ts
   const symbolInput = page.locator('input[placeholder="Search Symbol"]');
   await symbolInput.fill('USCRL1'); // subset of seeded rows
   await page.waitForTimeout(100);
   await page.waitForLoadState('networkidle');
   ```
6. Each test **must be independently reproducible** — do not depend on prior test scroll state;
   the `beforeEach` navigates fresh to the universe screen for each test.
7. **Comment block format** for each new test (follow existing pattern):
   ```ts
   // Regression guard for Epics 29/31/44/60/64 (CDK virtual scroll blank rows).
   // Root cause Epic 64: excludeLoadingRows filter in filteredData$ removed
   // placeholder rows from the CDK data array, re-introducing array-length
   // instability after sort/filter events. Fix (Story 64.2): removed the
   // excludeLoadingRows filter; CDK now always sees the full stable-length array.
   // This test guards against a future change that re-introduces row removal
   // from filteredData$ during isLoading windows.
   ```

### Testing Standards

- Unit tests: Vitest in same directory as source file
- E2E tests: Playwright in `apps/dms-material-e2e/src/`
- `pnpm all` must pass

### Project Structure Notes

- E2E port: `4301` (not `4200`)
- All seeded data uses `USCRL` prefix — use that prefix for filter tests
- No `import { test, expect }` needed — imported from `playwright/test` at top of file (already there)
- Named function declarations required in all callbacks per ESLint `@smarttools/no-anonymous-functions` rule

### References

- [Source: `_bmad-output/planning-artifacts/epics-2026-04-10.md`#Story 64.3]
- [Source: `_bmad-output/implementation-artifacts/60-3-scrolling-regression-prevention-tests.md`]
- [Source: `_bmad-output/implementation-artifacts/64-1-reproduce-scrolling-regression-failing-e2e.md`]
- [Source: `_bmad-output/implementation-artifacts/64-2-fix-universe-scrolling-round-5.md`]
- [Source: `apps/dms-material-e2e/src/universe-scrolling-regression.spec.ts`]

## Dev Agent Record

### Agent Model Used

_[to be filled by dev agent]_

### Debug Log References

### Completion Notes List

### File List
