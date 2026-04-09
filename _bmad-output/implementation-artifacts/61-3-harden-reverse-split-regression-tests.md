# Story 61.3: Harden Reverse-Split Import with Comprehensive Regression Tests

Status: Approved

> **Scope note:** OXLC (CUSIP `691543102`) is the **concrete failing example** used in the E2E
> regression tests, but the **unit tests must validate symbol-agnostic behaviour** using
> generic/invented tickers and CUSIPs. The goal is to guard against regressions in the general
> fix from Story 61.2, not to hard-code OXLC assumptions into the test suite.

## Story

As a developer,
I want comprehensive E2E and unit tests covering both CUSIP-symbol and ticker-symbol lot-adjustment
paths for reverse splits,
so that any regression introduced by future import changes is caught immediately.

## Acceptance Criteria

1. **Given** a reverse split is imported for a symbol whose lots are stored under a CUSIP,
   **When** the test suite runs,
   **Then** the test covers the CUSIP-to-ticker resolution path and fails if that path breaks.

2. **Given** a reverse split is imported for a symbol whose lots are stored under a ticker (the
   happy path established by Epic 57),
   **When** the test suite runs,
   **Then** the existing MSTY / ULTY / OXLC (ticker) tests still pass.

3. **Given** all regression tests are green,
   **When** `pnpm all` runs,
   **Then** all tests pass with no regressions.

## Definition of Done

- [x] Unit tests in `apps/server/src/app/routes/import/` cover: CUSIP-as-symbol lot adjustment (ratio derivation + quantity/price update), ticker-as-symbol lot adjustment (regression guard), unresolvable CUSIP warning path
- [x] E2E tests in `apps/dms-material-e2e/src/` cover at least: OXLC CUSIP lots (new, driving the fix from Story 61.1/61.2), OXLC ticker lots (regression guard from prior epics), MSTY/ULTY ticker lots (regression guard from Epic 57.3)
- [x] All new and updated tests pass green
- [x] `pnpm run e2e:dms-material:chromium` passes (confirmed via CI on PR #993)
- [x] `pnpm all` passes (confirmed via CI on PR #993)

## Tasks / Subtasks

- [x] **Task 1: Audit existing split test coverage**
  - [x] Read `apps/server/src/app/routes/import/adjust-lots-for-split.function.spec.ts` (if it exists)
  - [x] Read `apps/dms-material-e2e/src/split-import-e2e.spec.ts`
  - [x] List any gaps in coverage (CUSIP-as-symbol path, unresolvable CUSIP, etc.)
    - All gaps addressed: CUSIP-as-symbol, concrete OXLC+CUSIP guard, unresolvable CUSIP, generic symbol-agnostic guard all added in Story 61-2

- [x] **Task 2: Extend unit tests** _(completed in Story 61-2, PR #993)_
  - [x] Add unit test (generic): lot adjustment where an arbitrary CUSIP resolves to an arbitrary
        ticker — adjusts correctly (validates no OXLC-specific logic in the fix)
        → `adjust-lots-for-split.function.spec.ts`: "adjusts lots stored under CUSIP universe when ticker is passed (generic: FAKE / 000000001)"
  - [x] Add unit test (concrete): lot adjustment where CUSIP `691543102` resolves to `OXLC` —
        adjusts correctly (OXLC regression guard)
        → `adjust-lots-for-split.function.spec.ts`: "adjusts OXLC lots stored under CUSIP 691543102 (regression guard)"
  - [x] Add unit test: lot adjustment where symbol is a ticker (no change to existing behaviour)
        → `adjust-lots-for-split.function.spec.ts`: "ticker-only lots (no CUSIP aliases) still adjusted correctly — non-regression"
  - [x] Add unit test: lot adjustment where CUSIP is unresolvable → warning emitted, lots unchanged
        → `adjust-lots-for-split.function.spec.ts`: "logs CUSIP warning and returns 0 when called with a CUSIP symbol instead of ticker"

- [x] **Task 3: Extend E2E tests** _(all E2E coverage confirmed in main)_
  - [x] Ensure Story 61.1 test (`oxlc-reverse-split.spec.ts`) is part of the regression suite
        → `apps/dms-material-e2e/src/oxlc-reverse-split.spec.ts` merged via PR #991 (Story 61-1)
  - [x] Add or confirm E2E test: OXLC ticker lots (not CUSIP-based) — guards against regression where ticker path breaks
        → `split-import-e2e.spec.ts` lines 65–325 cover OXLC ticker lots (1530 shares → 306)
  - [x] Add or confirm E2E test: MSTY 1-for-5 ticker lots — guards against Epic 57.3 regression
        → `split-import-e2e.spec.ts` lines 229,270,320 cover MSTY 1-for-5 (400 → 80 shares)
  - [x] Add or confirm E2E test: ULTY 1-for-10 ticker lots — guards against Epic 57.3 regression
        → `split-import-e2e.spec.ts` lines 229,279,322 cover ULTY 1-for-10 (1000 → 100 shares)

- [x] **Task 4: Confirm all tests pass**
  - [x] Run `pnpm run e2e:dms-material:chromium` — all tests green (confirmed via CI on PR #993)
  - [x] Run `pnpm all` — no regressions (confirmed via CI: `nx affected -t lint build test --parallel=1` ✅)

## Dev Notes

### Key Files

| File                                                                     | Purpose                                     |
| ------------------------------------------------------------------------ | ------------------------------------------- |
| `apps/server/src/app/routes/import/`                                     | Unit test files for split import functions  |
| `apps/dms-material-e2e/src/split-import-e2e.spec.ts`                     | Existing split E2E test (reference)         |
| `apps/dms-material-e2e/src/oxlc-reverse-split.spec.ts`                   | New CUSIP-based split E2E test (Story 61.1) |
| `apps/dms-material-e2e/src/helpers/seed-split-import-e2e-data.helper.ts` | Seeder helpers                              |

### Coverage Matrix

| Scenario                               | Unit test  | E2E test        | Status               |
| -------------------------------------- | ---------- | --------------- | -------------------- |
| Ticker lots — MSTY 1-for-5             | Epic 57.3  | Epic 57.3       | Should already exist |
| Ticker lots — ULTY 1-for-10            | Epic 57.3  | Epic 57.3       | Should already exist |
| Ticker lots — OXLC 1-for-5             | Epic 57.3  | Epic 57.3       | Should already exist |
| CUSIP lots — OXLC 1-for-5 (concrete)   | Story 61.2 | Story 61.1      | New in this epic     |
| CUSIP lots — generic ticker/CUSIP pair | Story 61.2 | N/A (unit only) | New in this epic     |
| Unresolvable CUSIP — warning           | Story 61.2 | N/A             | New in this epic     |

> The "generic ticker/CUSIP pair" unit test is the critical guard that the fix is symbol-agnostic.
> It should use invented values (e.g., ticker `FAKE`, CUSIP `000000001`) to prove no OXLC-specific
> code path was introduced.

Confirm each row in the matrix is covered before marking done.

## Dev Agent Record

### Coverage Matrix — All Rows Confirmed

| Scenario                               | Unit test                                             | E2E test                        | Status  |
| -------------------------------------- | ----------------------------------------------------- | ------------------------------- | ------- |
| Ticker lots — MSTY 1-for-5             | Epic 57.3 (existing)                                  | `split-import-e2e.spec.ts` ✅   | ✅ Done |
| Ticker lots — ULTY 1-for-10            | Epic 57.3 (existing)                                  | `split-import-e2e.spec.ts` ✅   | ✅ Done |
| Ticker lots — OXLC 1-for-5             | `adjust-lots-for-split...spec.ts` non-regr.           | `split-import-e2e.spec.ts` ✅   | ✅ Done |
| CUSIP lots — OXLC 1-for-5 (concrete)   | `adjust-lots-for-split...spec.ts` ✅                  | `oxlc-reverse-split.spec.ts` ✅ | ✅ Done |
| CUSIP lots — generic ticker/CUSIP pair | `adjust-lots-for-split...spec.ts` (FAKE/000000001) ✅ | N/A (unit only)                 | ✅ Done |
| Unresolvable CUSIP — warning           | `adjust-lots-for-split...spec.ts` ✅                  | N/A                             | ✅ Done |

### Implementation Summary

All coverage was introduced across Stories 61-1 and 61-2. This story confirms no gaps remain.

- **Story 61-1 (PR #991)**: Added `oxlc-reverse-split.spec.ts` E2E + database fixture + seeder entry for CUSIP-stored OXLC lots
- **Story 61-2 (PR #993)**: Fixed CUSIP-alias resolution in `adjustLotsForSplit` and `calculateSplitRatio`; extracted `resolveCusipUniverseIds` helper; added 4 CUSIP unit tests to `adjust-lots-for-split.function.spec.ts` and 3 to `calculate-split-ratio.function.spec.ts`

### No Code Changes Required

All acceptance criteria were satisfied by code already merged. This PR marks the story complete.
