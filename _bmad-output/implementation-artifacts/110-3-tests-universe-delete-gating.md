# Story 110.3: Tests for Universe Delete-Button Gating

Status: Approved

**Story Key:** `110-3-tests-universe-delete-gating`
**Epic:** 110 — Restrict Universe Delete Button to Truly Unused Symbols Under "All Accounts" Filter Only
**Source:** [_bmad-output/planning-artifacts/epics-2026-05-23.md](../planning-artifacts/epics-2026-05-23.md) (Story 110.3)
**Type:** Test
**Depends on:** Story 110.2
**Enables:** none
**Requirements covered:** R4, R5, R6

## Story

As a developer,
I want unit tests for the delete-button visibility expression and an E2E test that asserts the button is shown or hidden correctly under each filter mode and per-symbol usage,
So that any future change that loosens or breaks this gating is caught before it ships.

## Epic Context

Story 110.2 implements the gating (server-derived `deletable` + active-account-filter check). This story locks in regression coverage with unit + cross-browser Playwright E2E tests.

## Acceptance Criteria

1. **AC1 — Unit test covers four input permutations.**
   **Given** the unit test for the Universe row component,
   **When** the test sets the inputs to (a) specific-account filter,
   (b) All Accounts + symbol used in `trades`,
   (c) All Accounts + symbol used in `divDeposits`,
   (d) All Accounts + symbol used in neither,
   **Then** the test asserts the delete button is rendered only in case (d).

2. **AC2 — E2E asserts visibility per row per filter mode.**
   **Given** the Playwright E2E test,
   **When** the test seeds the same four conditions and visits the Universe
   screen,
   **Then** the test asserts the rendered button visibility matches the
   expectation per row.

3. **AC3 — Tests pass on both browsers.**
   **Given** the new tests are committed,
   **When** `pnpm e2e:dms-material:chromium` and `pnpm e2e:dms-material:firefox`
   run,
   **Then** both pass.

4. **AC4 — Tests not skipped; included in `pnpm all`.**
   **Given** `pnpm all` runs,
   **Then** the new tests pass and are not skipped (no `.skip`, `xit`, or
   unconditional `test.skip(true, …)`).

## Tasks / Subtasks

- [ ] **Task 1 — Unit test for `shouldShowDeleteButton`** (AC: #1)
  - [ ] Add or extend the spec next to
        [apps/dms-material/src/app/global/global-universe/global-universe.component.ts](../../apps/dms-material/src/app/global/global-universe/global-universe.component.ts)
        (sibling file `global-universe.component.spec.ts`).
  - [ ] Construct fixture rows with the `deletable: boolean` field as set by the
        server (per Story 110.2 contract).
  - [ ] Configure the active-account-filter signal for each case (a)–(d) and
        assert `shouldShowDeleteButton(row)` returns the expected boolean.
        Equivalent: assert the rendered `[data-testid="'delete-symbol-' + i"]`
        button is present/absent via `TestBed` + component fixture
        `query(By.css('[data-testid^="delete-symbol-"]'))`.

- [ ] **Task 2 — E2E test for both filter modes** (AC: #2, #3)
  - [ ] Add a Playwright spec under
        [apps/dms-material-e2e/src/](../../apps/dms-material-e2e/src/) following
        existing conventions there.
  - [ ] Seed (via the existing E2E seed mechanism) four `universe` rows:
    - `SYM_TRADES` — has one or more `trades` row (any account).
    - `SYM_DIVS` — has zero trades and one or more `divDeposits` row (any
      account).
    - `SYM_BOTH` — has at least one row in each (optional extra to spot-check).
    - `SYM_UNUSED` — has zero `trades` and zero `divDeposits`.
  - [ ] Test 1: Select **a specific account** in the account filter. Assert
        **no** `[data-testid^="delete-symbol-"]` elements exist on any row.
  - [ ] Test 2: Select **All Accounts**. Assert the delete button is visible
        **only** on the row for `SYM_UNUSED`, hidden on `SYM_TRADES`, `SYM_DIVS`,
        `SYM_BOTH`.
  - [ ] Run on both Chromium and Firefox project matrices.

- [ ] **Task 3 — Confirm tests are not skipped** (AC: #4)
  - [ ] Run `bash scripts/check-no-skipped-tests.sh` and confirm green.

- [ ] **Task 4 — Quality gate** (AC: #3, #4)
  - [ ] Run `pnpm e2e:dms-material:chromium`, `pnpm e2e:dms-material:firefox`,
        and `pnpm all`. Record all three results in Dev Notes.

## Dev Notes

### Architecture & Code Pointers

- **Component under test:**
  [apps/dms-material/src/app/global/global-universe/global-universe.component.ts](../../apps/dms-material/src/app/global/global-universe/global-universe.component.ts)
  `shouldShowDeleteButton` (rewritten in Story 110.2).
- **Template selector:**
  [apps/dms-material/src/app/global/global-universe/global-universe.component.html](../../apps/dms-material/src/app/global/global-universe/global-universe.component.html)
  lines 302–311 — buttons have `data-testid="'delete-symbol-' + i"` (template
  expression resolves to `delete-symbol-0`, `delete-symbol-1`, …). Use
  `[data-testid^="delete-symbol-"]` for "any delete button" assertions.
- **E2E app:** [apps/dms-material-e2e/](../../apps/dms-material-e2e/).
- **Test data design** — see table:

  | Case | Row symbol  | `trades` rows | `divDeposits` rows | Filter         | Button expected |
  |------|-------------|---------------|---------------------|----------------|-----------------|
  | a    | SYM_UNUSED  | 0             | 0                   | Specific acct  | Hidden (R4)     |
  | b    | SYM_TRADES  | ≥ 1           | 0                   | All Accounts   | Hidden (R5)     |
  | c    | SYM_DIVS    | 0             | ≥ 1                 | All Accounts   | Hidden (R5)     |
  | d    | SYM_UNUSED  | 0             | 0                   | All Accounts   | **Visible**     |

### Testing Standards

- Tests must not be `.skip` / `xit` / unconditional `test.skip(true, …)`.
  Conditional `test.skip(envCondition, reason)` is allowed only when the skip
  condition is genuinely environmental — not the case here.
- Cross-browser is mandatory: Playwright projects matrix must include both
  `chromium` and `firefox`.
- Do not weaken assertions to make them pass (NFR5).

### Project Structure Notes

- Skipped-test guard: [scripts/check-no-skipped-tests.sh](../../scripts/check-no-skipped-tests.sh).
- Project conventions per [_bmad-output/project-context.md](../project-context.md).

### References

- Epic source: [_bmad-output/planning-artifacts/epics-2026-05-23.md](../planning-artifacts/epics-2026-05-23.md) — Story 110.3 section
- Story 110.2 implementation: [110-2-implement-universe-delete-gating.md](./110-2-implement-universe-delete-gating.md)
- Component: [apps/dms-material/src/app/global/global-universe/global-universe.component.ts](../../apps/dms-material/src/app/global/global-universe/global-universe.component.ts)
- Template: [apps/dms-material/src/app/global/global-universe/global-universe.component.html](../../apps/dms-material/src/app/global/global-universe/global-universe.component.html)
- E2E app: [apps/dms-material-e2e/](../../apps/dms-material-e2e/)

## Definition of Done

- [ ] Unit test covers all four input permutations
- [ ] E2E test asserts rendered button visibility per row per filter mode
- [ ] Tests pass on both Chromium and Firefox
- [ ] Tests not skipped; included in `pnpm all`
- [ ] `pnpm all` passes

## Dev Agent Record

### Agent Model Used

_To be filled by dev agent._

### Debug Log References

_To be filled by dev agent._

### Completion Notes List

_To be filled by dev agent._

### File List

_To be filled by dev agent._
