# Story 87.1: Reproduce Scrolling Failures on All Affected Screens Using Playwright

Status: Approved

## Story

As a developer,
I want to observe and document the exact scrolling failure mode on each affected screen using
the Playwright MCP server against the live application,
so that Story 87.2 can make a targeted fix rather than guessing at a root cause that has been
misidentified five times before.

## Acceptance Criteria

1. **Given** the application is running (`pnpm start:server` + `pnpm start:dms-material`,
   port 4301),
   **When** the Playwright MCP server navigates to the Universe screen and performs rapid
   scrolling (quick scroll to bottom, quick scroll to top, repeated oscillation),
   **Then** the exact symptom — blank rows, missing symbols, position data disappearing —
   is captured and documented in Dev Notes with the scroll position and data state at which
   it occurs.

2. **Given** the Playwright MCP server navigates to the Open Positions screen,
   **When** the user scrolls down through the positions list,
   **Then** the exact failure mode (symbol not visible, positions all empty) is captured and
   documented, noting whether it is the same root cause as Universe or a different one.

3. **Given** the Playwright MCP server navigates to Sold Positions and Dividend Deposits,
   **When** the user scrolls through each screen,
   **Then** failure modes on both screens are documented — or it is confirmed that they pass
   without issue (negative result is a valid and important finding).

4. **Given** the five prior fix attempts (Epics 29, 31, 44, 60, 64),
   **When** the developer reviews the story notes from those epics,
   **Then** each prior root cause is listed in Dev Notes alongside the current observation,
   with a note on whether the current failure is the same pattern or a new one.

5. **Given** the existing Playwright scrolling regression E2E tests from Epics 60 and 64
   (`universe-scrolling-regression.spec.ts` and related spec files),
   **When** the developer runs those tests against the current codebase,
   **Then** the developer documents whether the tests are currently passing or failing, and
   if they are **passing** (yet the bug is observable on live data), the developer documents
   exactly why the existing tests failed to catch the regression — e.g. insufficient data
   volume, wrong scroll pattern, test database too small, timing differences — and records
   this as a required fix for Story 87.3.

6. **Given** the investigation is complete,
   **When** writing new failing regression tests,
   **Then** the new tests must reproduce the failure in a way that the existing tests do not —
   otherwise the gap in the existing test suite is itself the bug that must be fixed.

7. **Given** the investigation is complete,
   **When** the developer writes a Playwright E2E test that replicates each confirmed failure
   mode (one test per affected screen),
   **Then** each new test currently **fails** (confirming the regressions are captured).

8. **Given** the failing tests are committed,
   **When** `pnpm all` is run,
   **Then** all previously passing tests continue to pass and the new tests fail as expected
   (new tests use `test.describe.skip()` for CI but are still committed; or alternatively they
   are committed as failing to signal they are regressions — use `test.fail()` annotation per
   Playwright convention).

## Tasks / Subtasks

- [ ] Task 1: Start the live application and confirm screens are accessible (AC: #1)
  - [ ] Run `pnpm start:server` (Fastify API)
  - [ ] Run `pnpm start:dms-material` (Angular dev server, port 4301)
  - [ ] Use Playwright MCP to navigate to `http://localhost:4301`
  - [ ] Log in (any valid credentials in the dev database)
  - [ ] Confirm all four screens are reachable: Universe, Open Positions, Sold Positions, Dividend Deposits

- [ ] Task 2: Reproduce scrolling failure on Universe screen (AC: #1)
  - [ ] Ensure the Universe table has enough rows for virtual scroll to activate (≥ 25 rows)
  - [ ] Use Playwright MCP to programmatically scroll the `cdk-virtual-scroll-viewport` to the bottom
  - [ ] Immediately scroll back to the top
  - [ ] Capture screenshot or accessibility snapshot at each position
  - [ ] Document: which rows are blank, at what scroll offset, and whether it's reproducible
  - [ ] Document the finding in Dev Notes under "Failure Mode — Universe"

- [ ] Task 3: Reproduce scrolling failure on Open Positions screen (AC: #2)
  - [ ] Navigate to an account with enough open positions for virtual scroll
  - [ ] Scroll down rapidly through the positions list
  - [ ] Document: any missing symbols, blank position data (quantity, buy price), scroll offset
  - [ ] Document under "Failure Mode — Open Positions"

- [ ] Task 4: Investigate Sold Positions and Dividend Deposits (AC: #3)
  - [ ] Navigate to Sold Positions and attempt scrolling
  - [ ] Navigate to Dividend Deposits and attempt scrolling
  - [ ] Document findings for both screens — either confirm failure or confirm they pass
  - [ ] Document under "Failure Mode — Sold Positions" and "Failure Mode — Dividend Deposits"

- [ ] Task 5: Review prior fix history (AC: #4)
  - [ ] Review `apps/dms-material-e2e/src/universe-scrolling-regression.spec.ts` — this file contains prior root-cause comments for Epics 29/31/44/60
  - [ ] Review `apps/dms-material/src/app/shared/components/base-table/base-table.component.ts` — look for existing comments citing prior fix epics
  - [ ] Compile a summary in Dev Notes: each prior root cause and whether the current failure matches
  - [ ] List all prior root causes: Epic 29 (rowHeight mismatch), Epic 31 (contain:strict header jump), Epic 44 (CSS transitions + CD cycles), Epic 60 (isLoading filter shrinking array), Epic 64 (follow-up to 60)

- [ ] Task 6: Run existing scroll regression tests and explain why they did not catch this (AC: #5)
  - [ ] Run `pnpm e2e:dms-material:chromium` (or equivalent) scoped to existing scroll test files
  - [ ] Check: `universe-scrolling-regression.spec.ts`, `universe-smooth-scroll.spec.ts`, `open-positions-smooth-scroll.spec.ts`, `div-deposits-smooth-scroll.spec.ts`
  - [ ] If any existing tests are **already failing**: document which ones and treat them as the captured regression — new tests may not be needed
  - [ ] If all existing tests **pass** despite the observable live-data bug: this is a test-coverage gap. Document in Dev Notes:
    - Which scroll patterns / data volumes the existing tests use
    - What the live app does differently (more rows, different timing, different data shape)
    - Exactly what is missing from the existing tests that allowed the regression to slip through
  - [ ] This analysis is **mandatory input** for Story 87.3 — record findings in Dev Notes under "Existing Test Gap Analysis"

- [ ] Task 7: Write FAILING Playwright E2E regression tests (AC: #6, #7)
  - [ ] Create `apps/dms-material-e2e/src/scrolling-regression-87.spec.ts`
  - [ ] For each screen where a failure was confirmed, write one test that:
    1. Seeds enough rows to trigger virtual scroll — **use the data volumes from live app as the target, not the minimum**
    2. Navigates to the screen
    3. Performs the scroll sequence that triggers the bug (fast bottom→top→bottom, or whatever pattern reproduced it)
    4. Asserts no blank rows (which will FAIL in current state)
  - [ ] Ensure the new tests cover the gap identified in Task 6 — they must fail where existing tests passed
  - [ ] Annotate each failing test with `test.fail()` (Playwright annotation for expected failures) OR use `test.describe.skip()` to keep CI green while signalling intent
  - [ ] Do NOT change any production code — this is investigation only

- [ ] Task 8: Full test run (AC: #8)
  - [ ] Run `pnpm all` and confirm all previously passing tests still pass
  - [ ] Confirm the new regression tests fail as expected (or are skipped/annotated)

## Dev Notes

### Application URLs

| Screen | URL |
|--------|-----|
| Universe | `http://localhost:4301/universe` (or via sidebar nav) |
| Open Positions | `http://localhost:4301/accounts/{id}/open-positions` |
| Sold Positions | `http://localhost:4301/accounts/{id}/sold-positions` |
| Dividend Deposits | `http://localhost:4301/accounts/{id}/div-deposits` |

Start commands:
```bash
pnpm start:server          # Fastify API
pnpm start:dms-material    # Angular dev server at port 4301
```

### Prior Root Causes (Epics 29–64)

From `universe-scrolling-regression.spec.ts` (top-of-file comment block):

| Epic | Root Cause |
|------|------------|
| Epic 29 | `rowHeight` mismatch between CSS and CDK viewport config — scroll height calculation wrong |
| Epic 31 | `contain:strict` on header caused jump when viewport recalculated |
| Epic 44 | CSS transition animations + change detection cycles causing CDK to recalculate mid-scroll |
| Epic 60 | `isLoading === true` rows filtered to `null` → array shrinks → CDK viewport shrinks → scroll jumps back |
| Epic 64 | Follow-up to Epic 60; confirmed same root cause, extended fix to edge cases |

Current observation may be:
- **Same as Epic 60/64** if `isLoading` filter still active in a different code path
- **New variant** if `BaseTableComponent` was refactored since Epic 64
- **Different screens** (Open Positions, Sold Positions, Dividend Deposits) use the same `BaseTableComponent` but may have separate `isLoading` filters in their own data pipelines

### Key Files for Investigation

| File | Purpose |
|------|---------|
| `apps/dms-material/src/app/shared/components/base-table/base-table.component.ts` | Shared virtual scroll component — check for `isLoading` filtering |
| `apps/dms-material/src/app/global/global-universe/global-universe.component.ts` | Universe data pipeline |
| `apps/dms-material/src/app/account-panel/open-positions/open-positions.component.ts` | Open Positions data pipeline |
| `apps/dms-material/src/app/account-panel/sold-positions/sold-positions.component.ts` | Sold Positions data pipeline |
| `apps/dms-material/src/app/account-panel/dividend-deposits/dividend-deposits.component.ts` | Dividend Deposits data pipeline |
| `apps/dms-material-e2e/src/universe-scrolling-regression.spec.ts` | Prior regression tests + root cause history |

### Existing Scroll Test Files to Review

- `apps/dms-material-e2e/src/universe-smooth-scroll.spec.ts`
- `apps/dms-material-e2e/src/universe-scrolling-regression.spec.ts`
- `apps/dms-material-e2e/src/open-positions-smooth-scroll.spec.ts`
- `apps/dms-material-e2e/src/div-deposits-smooth-scroll.spec.ts`

Read these to understand prior test patterns, seed helper usage, and what scenarios are
already covered before writing new tests.

### CDK Virtual Scroll Viewport

All four screens use `<dms-base-table>` → `BaseTableComponent` → `<cdk-virtual-scroll-viewport>`.
Selector: `cdk-virtual-scroll-viewport`
Scroll programmatically in Playwright:
```typescript
await page.locator('cdk-virtual-scroll-viewport').evaluate(
  function scrollToBottom(el) { el.scrollTop = el.scrollHeight; }
);
```

### Seed Helpers Available

| Helper | Screen |
|--------|--------|
| `seed-scroll-universe-data.helper.ts` | Universe |
| `seed-scroll-open-positions-data.helper.ts` | Open Positions |
| `seed-scroll-sold-positions-data.helper.ts` | Sold Positions |
| `seed-scroll-div-deposits-with-symbols-data.helper.ts` | Dividend Deposits |

### Key Commands

```bash
pnpm start:server              # Start API
pnpm start:dms-material        # Start Angular dev server (port 4301)
pnpm e2e:dms-material:chromium # Run E2E tests
pnpm all                       # Full lint + build + test
```

### References

- [apps/dms-material-e2e/src/universe-scrolling-regression.spec.ts](apps/dms-material-e2e/src/universe-scrolling-regression.spec.ts) — Prior regression test history and root-cause comments
- [apps/dms-material/src/app/shared/components/base-table/base-table.component.ts](apps/dms-material/src/app/shared/components/base-table/base-table.component.ts) — Shared virtual scroll component
- [apps/dms-material-e2e/src/helpers/seed-scroll-universe-data.helper.ts](apps/dms-material-e2e/src/helpers/seed-scroll-universe-data.helper.ts) — Universe seed helper
- [apps/dms-material-e2e/src/helpers/seed-scroll-open-positions-data.helper.ts](apps/dms-material-e2e/src/helpers/seed-scroll-open-positions-data.helper.ts) — Open positions seed
- [apps/dms-material-e2e/src/helpers/seed-scroll-sold-positions-data.helper.ts](apps/dms-material-e2e/src/helpers/seed-scroll-sold-positions-data.helper.ts) — Sold positions seed
- [apps/dms-material-e2e/src/helpers/seed-scroll-div-deposits-with-symbols-data.helper.ts](apps/dms-material-e2e/src/helpers/seed-scroll-div-deposits-with-symbols-data.helper.ts) — Div deposits seed
- This story is a prerequisite for Story 87.2
