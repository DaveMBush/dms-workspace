# Story 60.3: Add Scrolling Regression Prevention Tests

Status: Approved

## Story

As a developer,
I want a comprehensive Playwright test suite covering all known scrolling failure modes on the
Universe screen,
so that any future regression is caught immediately in CI rather than discovered in the next sprint.

## Acceptance Criteria

1. **Given** the regression-prevention suite runs against the Universe screen,
   **When** the screen loads and the user scrolls in various patterns,
   **Then** all test cases pass (no blank rows, no position jumps, no stutter).

2. **Given** the suite covers the failure modes from Epics 29, 31, 44, and 60,
   **When** a future change re-introduces any of those defects,
   **Then** at least one test in the suite fails, surfacing the regression before it ships.

3. **Given** all changes are applied,
   **When** `pnpm all` runs,
   **Then** all tests pass with no regressions.

## Definition of Done

- [ ] Playwright tests added for: fast scroll to bottom, fast scroll to top, repeated scroll oscillation, scroll after filter change, scroll after sort change
- [ ] Tests include comments referencing the root-cause notes from Story 60.2 so future maintainers understand the intent of each test case
- [ ] All new tests pass green
- [ ] `pnpm run e2e:dms-material:chromium` passes
- [ ] `pnpm all` passes

## Tasks / Subtasks

- [ ] **Task 1: Review Story 60.1 and 60.2 outcomes**
  - [ ] Read the Dev Agent Records from both stories
  - [ ] Identify which scrolling patterns triggered the jank (to write targeted tests)

- [ ] **Task 2: Extend `universe-scrolling-regression.spec.ts`**
  - [ ] Add test: fast scroll to the bottom of the Universe list — assert all visible rows are populated
  - [ ] Add test: fast scroll to the top after being at the bottom — assert all visible rows are populated
  - [ ] Add test: repeated scroll oscillation (bottom, top, bottom, top) — assert no blank rows after final settle
  - [ ] Add test: change sort order, then scroll — assert rows remain populated
  - [ ] Add test: apply account filter, then scroll — assert rows remain populated

- [ ] **Task 3: Add descriptive comments**
  - [ ] Each test case should have a comment block explaining: which prior epic introduced this failure mode, what the root cause was, and why this test guards against it

- [ ] **Task 4: Confirm all tests pass**
  - [ ] Run `pnpm run e2e:dms-material:chromium` — all tests green
  - [ ] Run `pnpm all` — no regressions

## Dev Notes

### Key Files

| File | Purpose |
| ---- | ------- |
| `apps/dms-material-e2e/src/universe-scrolling-regression.spec.ts` | Extend this file from Story 60.1 |
| Story 60.2 Dev Agent Record | Source of root-cause explanations to cite in test comments |

### Test Pattern

```ts
test('rows are populated after fast scroll to bottom', async ({ page }) => {
  // Guard against Epic 29/31/44/60 regression: CDK itemSize mismatch causes blank
  // rows at bottom of viewport during fast scroll. See Story 60.2 Dev Notes.
  await page.goto('/universe');
  // scroll to bottom
  // assert visible rows have non-empty symbol text
});
```

Each test should independently seed data so it does not depend on prior test state.

## Dev Agent Record

_To be filled in by the implementing agent._
