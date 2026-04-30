# Story 89.3: E2E Verification — CEF Symbol Added is Flagged Expired

Status: in-progress

## Story

As Dave,
I want end-to-end Playwright tests that confirm a CEF symbol added manually appears in the
universe with `expired: true`,
So that a regression in either add path will be caught automatically.

## Acceptance Criteria

1. **Given** a known CEF ticker (e.g., PDI),
   **When** it is added via the "Add Symbol" UI,
   **Then** the universe API response for that symbol includes `expired: true` and
   `is_closed_end_fund: true`.

2. **Given** the Playwright test suite,
   **When** `pnpm e2e:dms-material:chromium` and `pnpm e2e:dms-material:firefox` run,
   **Then** both pass, including the new CEF-expired assertions.

## Tasks / Subtasks

- [x] Task 1: Write the E2E test (Playwright MCP server)

  - [x] Use the Playwright MCP server to navigate to the Universe screen and trigger
        "Add Symbol" for a known CEF (e.g., PDI)
  - [x] After the add completes, intercept or call the universe GET API and assert the
        newly-added row has `expired: true` and `is_closed_end_fund: true`
  - [x] Alternatively, assert via the UI if an "Expired" indicator is visible on the row

- [ ] Task 2: Run the full E2E suite

  - [ ] `pnpm e2e:dms-material:chromium` — must pass
  - [ ] `pnpm e2e:dms-material:firefox` — must pass

- [ ] Task 3: Run `pnpm all`
  - [ ] Confirm all unit and E2E tests pass

## Dev Notes

### Playwright MCP Usage

Use the Playwright MCP server to:

1. Launch the app in test mode
2. Navigate to the Universe / Add Symbol flow
3. Submit the add-symbol form with a known CEF ticker
4. Assert the API response or UI indicator reflects `expired: true`

If cefconnect.com is unavailable during testing, mock the `lookupCefConnectSymbol` call to
return a CEF response (as done in the existing `cef-classification.function.spec.ts`). Check
whether the existing E2E tests already mock external HTTP calls.

### Existing Related Tests

- `apps/server/src/app/routes/universe/add-symbol/add-symbol.function.spec.ts` — unit tests
  for the manual-add path (updated in Story 89.1)
- `apps/server/src/app/routes/import/fidelity-data-mapper.function.spec.ts` — CSV import
  unit tests (Story 89.2 may add a spec to the helper file)
- `apps/dms-material-e2e/` — E2E test root; place new test here following existing patterns

## Dev Agent Record

### Implementation Plan

Implemented `apps/dms-material-e2e/src/cef-expired-on-add.spec.ts` following the patterns
established in `cef-classification-symbol-add.spec.ts`:

1. `cleanupTestData()` — removes PDI from universe (and any linked trades) before/after tests
2. `seedTestData()` — ensures required risk groups (Equities, Income, Tax Free Income) exist
3. Helper `typeSymbolAndSelectAutocomplete()` — mocks `/api/symbol/search` for deterministic autocomplete
4. Helper `selectRiskGroupInDialog()` — selects risk group from Material dropdown
5. Main test registers a `waitForResponse` on `/api/universe/add` **before** clicking submit
   to avoid race conditions, then asserts `expired: true` and `is_closed_end_fund: true` on
   the captured response body

PDI (PIMCO Dynamic Income Fund) is a live CEF on cefconnect.com — the test relies on the
same real-API approach as the existing `cef-classification-symbol-add.spec.ts`.

### Completion Notes

- Task 1 ✅: `cef-expired-on-add.spec.ts` created under `apps/dms-material-e2e/src/`
- Tasks 2 & 3: Awaiting E2E suite execution by parent workflow

## File List

- apps/dms-material-e2e/src/cef-expired-on-add.spec.ts (new)

## Change Log

- 2026-04-30: Task 1 complete — wrote E2E test `cef-expired-on-add.spec.ts` asserting
  `expired: true` and `is_closed_end_fund: true` on the `/api/universe/add` response
  when a known CEF (PDI) is added via the Add Symbol UI
