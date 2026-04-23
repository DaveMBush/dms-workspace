# Story 87.2: Fix Scrolling Across All Affected Screens

Status: Approved

## Story

As Dave,
I want Universe, Open Positions, Sold Positions, and Dividend Deposits to all scroll smoothly
without blank rows, missing symbols, or empty position data at any scroll position,
so that I can review my portfolio without scrolling defects interrupting my workflow.

## Acceptance Criteria

1. **Given** the Universe screen has more rows than the viewport,
   **When** the user scrolls quickly to the bottom and back to the top,
   **Then** all rows are populated with data and no blank cells or missing symbols appear.

2. **Given** the Open Positions screen has enough positions to trigger virtual scrolling,
   **When** the user scrolls down through the list,
   **Then** all symbols are visible and all position data (quantity, buy price, etc.) is
   populated at every scroll position.

3. **Given** the Sold Positions and Dividend Deposits screens have enough rows to require
   scrolling,
   **When** the user scrolls through each screen,
   **Then** all rows render correctly at every scroll position.

4. **Given** the fix is applied,
   **When** the Playwright MCP server is used against the **live application** (port 4301,
   real production-scale data, logged in as Dave),
   **Then** the MCP server confirms that the failure mode documented in Story 87.1 is no
   longer reproducible — blank rows, missing symbols, or empty position data cannot be
   triggered using the same scroll sequence that reliably reproduced the bug in Story 87.1.
   **This step is mandatory and cannot be skipped, even if all E2E tests pass.**

5. **Given** the live-data Playwright MCP verification from AC #4 passes,
   **When** the developer attempts the scroll sequence 3 additional times to confirm
   consistency (not a fluke),
   **Then** the failure mode does not reappear on any of the 3 additional attempts across
   all four affected screens.

6. **Given** the fix is applied and the failing E2E tests from Story 87.1 are run,
   **When** `pnpm all` executes,
   **Then** all previously failing tests now pass.

7. **Given** the fix is implemented,
   **When** a code reviewer inspects the change,
   **Then** the implementation includes a comment referencing all six prior attempts
   (Epics 29, 31, 44, 60, 64, and 87) and explaining the structural constraint — CDK
   virtual scroll, SmartNgRX/SmartSignals `isLoading` state, or zone-less change detection —
   that makes this area recurrence-prone.

## Tasks / Subtasks

- [ ] Task 1: Read Story 87.1 Dev Notes for exact root cause before writing any code (AC: #6)
  - [ ] Review the Dev Notes section added in Story 87.1 documenting the failure mode on each screen
  - [ ] Identify whether the root cause is in `BaseTableComponent`, an individual screen component, or the SmartNgRX `isLoading` filtering layer
  - [ ] Do NOT guess — use the documented failure mode from Story 87.1 as the specification for this fix

- [ ] Task 2: Fix `BaseTableComponent` if root cause is in the shared component (AC: #1–#4)
  - [ ] Open `apps/dms-material/src/app/shared/components/base-table/base-table.component.ts`
  - [ ] Identify the data binding or virtual scroll configuration that allows blank rows
  - [ ] **Likely fix pattern** (based on Epic 60 root cause): ensure `isLoading` rows are NOT filtered out of the array but instead rendered as placeholder rows — the array length must remain stable during in-flight SmartNgRX requests so the CDK viewport total-height does not shrink and jump
  - [ ] Add a comment block above the fix:
    ```typescript
    /**
     * SCROLLING REGRESSION HISTORY — DO NOT SIMPLIFY THIS CODE:
     * Epic 29: rowHeight mismatch → CDK scroll height wrong
     * Epic 31: contain:strict on header → jump on viewport recalc
     * Epic 44: CSS transitions + CD cycles → CDK recalc mid-scroll
     * Epic 60: isLoading filter shrinks array → CDK shrinks total height → scroll jumps
     * Epic 64: Edge case follow-up to Epic 60
     * Epic 87: [fill in root cause from Story 87.1 investigation]
     * The structural constraint: CDK virtual scroll requires a STABLE array length.
     * SmartNgRX marks rows isLoading=true during in-flight requests; filtering those
     * rows out shrinks the array and causes CDK to recalculate total height, jumping
     * the viewport. Always keep placeholder/loading rows in the array.
     */
    ```

- [ ] Task 3: Fix individual screen components if root cause is screen-specific (AC: #1–#4)
  - [ ] For each screen where a unique root cause was identified (Universe, Open Positions, Sold Positions, Dividend Deposits), apply the targeted fix
  - [ ] Each fix must include the citation comment from Task 2
  - [ ] Verify that the fix covers all four screens — either via a shared fix in `BaseTableComponent` or individual fixes in each screen component

- [ ] Task 4: Verify fix with Playwright MCP on live app — mandatory live-data confirmation (AC: #4, #5)
  - [ ] Confirm `pnpm start:server` and `pnpm start:dms-material` are running (port 4301)
  - [ ] Log in to the live application (any credentials)
  - [ ] Use the **exact scroll sequence from Story 87.1** that reliably triggered the bug on each screen
  - [ ] Perform the sequence on Universe, Open Positions, Sold Positions, and Dividend Deposits
  - [ ] Capture a Playwright MCP snapshot/screenshot after each scroll sequence and confirm:
    - No blank rows
    - No missing symbols
    - No empty position/data fields
  - [ ] Repeat the full sequence **3 more times** on any screen that previously showed the most severe failure (AC: #5)
  - [ ] **If the failure is still reproducible on live data, the story is NOT done** — return to Tasks 2/3
  - [ ] Document each verification run result in Dev Notes under "Live-Data Verification"

- [ ] Task 5: Run failing tests from Story 87.1 — confirm they pass (AC: #6)
  - [ ] Un-skip or un-annotate the tests added in Story 87.1 (`scrolling-regression-87.spec.ts`)
  - [ ] Run the tests and confirm they pass green
  - [ ] If any test still fails, return to Tasks 2/3 and refine the fix

- [ ] Task 6: Full test run (AC: #6)
  - [ ] Run `pnpm all` and confirm all tests pass

## Dev Notes

### IMPORTANT: Read Story 87.1 First

This story MUST NOT begin without reading the Dev Notes from Story 87.1. The root cause
was unknown when this story was written; Story 87.1 documents the exact failure. Do not
guess or reapply Epic 60/64 patch without confirming it matches the current regression.

### Live-Data Verification Is the Acceptance Gate

E2E tests passing is **necessary but not sufficient**. Five prior epics had E2E tests
passing while the bug was observable with real data. This story is not done until Task 4
(Playwright MCP on live data) completes without triggering the failure. Document each
verification run under "Live-Data Verification" in Dev Notes.

### Live-Data Verification (fill in during Task 4)

| Screen | Attempt 1 | Attempt 2 | Attempt 3 | Attempt 4 | Result |
|--------|-----------|-----------|-----------|-----------|--------|
| Universe | | | | | |
| Open Positions | | | | | |
| Sold Positions | | | | | |
| Dividend Deposits | | | | | |

### Prior Root Cause Summary

| Epic | Root Cause | Fix Applied |
|------|------------|-------------|
| 29 | `rowHeight` mismatch — CDK total scroll height calculated incorrectly | Fixed row height constant |
| 31 | `contain:strict` on sticky header — caused layout jump on CDK recalc | Removed contain:strict |
| 44 | CSS transitions + extra CD cycles — CDK recalculated mid-animation | Removed transitions, guarded CD |
| 60 | `isLoading=true` rows filtered → array shrinks → CDK scroll height shrinks → jump | Keep loading rows as placeholders |
| 64 | Edge case of Epic 60: filter applied in different code path | Extended Epic 60 fix |
| **87** | **TBD — see Story 87.1 Dev Notes** | TBD |

### Key Files for Fix

| File | Role |
|------|------|
| `apps/dms-material/src/app/shared/components/base-table/base-table.component.ts` | Shared CDK virtual scroll table — primary suspect |
| `apps/dms-material/src/app/global/global-universe/global-universe.component.ts` | Universe screen data pipeline |
| `apps/dms-material/src/app/account-panel/open-positions/open-positions.component.ts` | Open Positions data pipeline |
| `apps/dms-material/src/app/account-panel/sold-positions/sold-positions.component.ts` | Sold Positions data pipeline |
| `apps/dms-material/src/app/account-panel/dividend-deposits/dividend-deposits.component.ts` | Dividend Deposits data pipeline |

### CDK Virtual Scroll Constraint

The CDK `<cdk-virtual-scroll-viewport>` requires the data array length to be **stable**
between renders. If rows are filtered out (e.g. SmartNgRX `isLoading=true`), the total
scroll height shrinks, and the viewport scroll offset is reset — causing the blank-row jump.

The correct pattern is to keep loading rows in the array as placeholder objects, not to
filter them out. SmartNgRX `defaultRow` provides placeholder objects for this purpose.

### Angular Zoneless / OnPush Constraints

The app uses `provideZonelessChangeDetection()`. This means:
- Change detection is triggered only by signal updates, `ChangeDetectorRef.markForCheck()`,
  or explicit `inject(ChangeDetectorRef)` calls
- Any data update that doesn't go through signals will not trigger re-render
- If the fix involves marking rows as "ready", ensure it flows through a signal update

### Required Comment in Fix

Every file modified in this story must include the full citation comment:

```typescript
/**
 * Scrolling regression history (Epics 29, 31, 44, 60, 64, 87):
 * See base-table.component.ts for full history.
 * [brief description of this file's specific fix]
 */
```

### Key Commands

```bash
pnpm start:server                    # Start API
pnpm start:dms-material              # Start Angular dev server (port 4301)
pnpm e2e:dms-material:chromium       # Run E2E tests
pnpm nx test dms-material            # Angular unit tests
pnpm all                             # Full lint + build + test
```

### References

- [apps/dms-material/src/app/shared/components/base-table/base-table.component.ts](apps/dms-material/src/app/shared/components/base-table/base-table.component.ts) — Shared virtual scroll component
- [apps/dms-material-e2e/src/universe-scrolling-regression.spec.ts](apps/dms-material-e2e/src/universe-scrolling-regression.spec.ts) — Prior regression history and test patterns
- [apps/dms-material-e2e/src/open-positions-smooth-scroll.spec.ts](apps/dms-material-e2e/src/open-positions-smooth-scroll.spec.ts) — Open positions scroll tests
- [apps/dms-material-e2e/src/div-deposits-smooth-scroll.spec.ts](apps/dms-material-e2e/src/div-deposits-smooth-scroll.spec.ts) — Div deposits scroll tests
- Story 87.1 Dev Notes — root cause documentation (must read before implementing)
- `scrolling-regression-87.spec.ts` — failing tests created in Story 87.1 (must turn green in this story)
