# Story 55.1: Write Failing E2E Test for Duplicate Universe Symbols

Status: Approved

## Story

As a developer,
I want a Playwright e2e test that demonstrates duplicate symbols appearing in the Universe list
when sorted by "Avg Purch Yield % descending",
so that I have a reproducible red test to guide the fix in Story 55.2.

## Acceptance Criteria

1. **Given** the Universe screen is sorted by "Avg Purch Yield %" descending,
   **When** all visible rows are inspected,
   **Then** at least one symbol appears more than once — and the test currently **FAILS** (confirms the bug exists).

2. **Given** the test is committed,
   **When** `pnpm run e2e:dms-material:chromium` runs,
   **Then** the new test fails.

3. **Given** all other existing tests are unmodified,
   **When** the test suite runs,
   **Then** all previously passing tests continue to pass.

## Definition of Done

- [ ] Playwright test file `universe-duplicate-symbols.spec.ts` created in `apps/dms-material-e2e/src/`
- [ ] Test seeds data that will trigger duplicates, sorts by Avg Purch Yield % descending, and asserts no duplicate symbols exist (assertion currently fails)
- [ ] Test is currently **red**
- [ ] `pnpm all` passes

## Tasks / Subtasks

- [ ] **Task 1: Reproduce duplicate symbols manually via Playwright MCP server**
  - [ ] Open Universe screen
  - [ ] Sort by "Avg Purch Yield %" descending
  - [ ] Observe duplicate symbols — confirm the bug is live and note which symbol(s) duplicate

- [ ] **Task 2: Understand data conditions that trigger duplicates**
  - [ ] Check if any symbol with multiple open lots (multiple trades rows) reliably causes duplicates
  - [ ] Determine minimum seed data needed to reproduce consistently (a symbol with ≥ 2 trades rows in the same account)

- [ ] **Task 3: Create `universe-duplicate-symbols.spec.ts`**
  - [ ] Seed at least one symbol with multiple open lots so duplicates will appear
  - [ ] Sort Universe by "Avg Purch Yield %" descending
  - [ ] Collect all visible symbol values from the table
  - [ ] Assert that the Set of symbols has the same length as the array (no duplicates) — this will currently **fail**

- [ ] **Task 4: Verify test is red**
  - [ ] Run `pnpm run e2e:dms-material:chromium --grep "duplicate symbols"` and confirm failure

## Dev Notes

### Key Files

| File | Purpose |
|------|---------|
| `apps/dms-material-e2e/src/helpers/seed-universe-e2e-data.helper.ts` | Seeding helper — use to create symbols with multiple trade lots |
| `apps/dms-material-e2e/src/universe-multi-column-sort-rows.spec.ts` | Reference for asserting row content |
| `apps/server/src/app/routes/universe/index.ts` | Backend endpoint that likely produces duplicates |

### Reproducing trigger condition

A universe symbol that has more than one row in the `trades` table for the same account will
likely cause the Prisma query to return multiple rows (one per trade join). The test seed should
create a symbol with at least 2 `trades` rows.

### Symbol cell selector

The Universe table renders symbols in a specific column cell. Check
`universe-screen-e2e.spec.ts` for the selector used to read symbol values from rows.
