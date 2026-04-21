# Story 78.1: Write Failing E2E Test for Dist/Year Weekly Acceptance

Status: Done

## Story

As a developer,
I want a Playwright E2E test that enters `52` in the Dist/Year field for a weekly symbol and asserts no validation error appears,
so that the fix in Story 78.2 has a definitive pass/fail gate.

## Acceptance Criteria

1. **Given** a symbol with frequency `weekly` in the test database,
   **When** the E2E test navigates to the symbol edit form, clears the Dist/Year field, types `52`, and blurs the field,
   **Then** Playwright asserts that no "Value must be at most 12" error is visible — and this test **FAILS** at time of writing (confirming the bug exists).

2. **Given** the same test submits the form with Dist/Year = 52,
   **When** the form is saved,
   **Then** the test asserts that the saved value is `52` and no error toast is shown — and this test also **FAILS** at time of writing.

3. **Given** the failing test is committed,
   **When** `pnpm all` runs,
   **Then** the new test fails as expected and is clearly labelled with a comment indicating it is expected to fail until Story 78.2.

## Tasks / Subtasks

- [x] Investigate the symbol edit form and Dist/Year field (AC: #1)
  - [x] Search for `distPerYear` or `dist_per_year` in `apps/dms-material/src/` to identify the
        edit form component
  - [x] Search for "Value must be at most 12" in the codebase to confirm the validation message
        text used in the UI
  - [x] Identify the route that opens the symbol edit form (likely `/universe` with an edit
        dialog)
  - [x] Identify the input's selector (role, label, test ID, etc.) by inspecting the component
        template

- [x] Inspect existing E2E specs for universe edit patterns (AC: #1)
  - [x] Search `apps/dms-material-e2e/src/` for universe edit or symbol edit tests
  - [x] Identify patterns used to: open the edit dialog, fill fields, blur fields, check
        validation messages, and submit the form
  - [x] Re-use the same helper functions and selectors

- [x] Identify or create a weekly test fixture symbol (AC: #1)
  - [x] Inspect `apps/dms-material-e2e/src/helpers/` for database seed helpers
  - [x] Confirmed: `Universe` model has NO `frequency` field — weekly frequency is represented
        purely as `distributions_per_year = 52`
  - [x] Decision: use default seed symbol `TESTEQ1` (seeded by `tools/create-test-db.js`).
        No custom seeding required — bug manifests for ANY symbol when value > 12 is entered.

- [x] Create `apps/dms-material-e2e/src/dist-per-year-weekly.spec.ts` (AC: #1, #2, #3)
  - [x] Implement AC#1 test: navigate to /global/universe, filter by TESTEQ1, click Dist/Year
        cell, type 52, blur, assert no "Value must be at most 12" text is visible —
        **FAILS due to hardcoded [max]="12" in global-universe.component.html**
  - [x] Implement AC#2 test: navigate to /global/universe, filter by TESTEQ1, click Dist/Year
        cell, type 52, press Enter, assert input is hidden and display shows 52 —
        **FAILS because saveEdit() returns early when value > max**
  - [x] Added prominent comment at the top of each failing test:
        `// EXPECTED TO FAIL: Bug exists until Story 78.2 is implemented`

- [x] Confirm tests fail as expected (AC: #3)
  - [x] Ran `CI=1 pnpm exec playwright test ... dist-per-year-weekly.spec.ts`
  - [x] Both AC#1 and AC#2 tests FAIL with `expect(locator).not.toBeVisible() failed`
  - [x] AC#1 failure: `getByText('Value must be at most 12')` — Expected: not visible, Received: visible
  - [x] AC#2 failure: same validation error keeps input in edit mode

- [x] Ensure `pnpm all` reports the failures cleanly (AC: #3)
  - [x] Confirmed `pnpm all` exits non-zero due to the new failing tests
  - [x] No other tests are broken by the new spec

> **NOTE:** `pnpm all` will NOT pass after this story — that is expected and intentional.
> The suite is restored to green by Story 78.2. Do not skip or `.skip()` the tests.

## Dev Notes

### Purpose of This Story

This story follows the TDD / bug-first workflow established in earlier epics (e.g., Epic 36, 54,
55): write the failing test first to confirm the bug, then fix it in the next story. The test
acts as the authoritative acceptance criterion for Story 78.2.

---

### Key Technical Findings

**Bug location:**
`apps/dms-material/src/app/global/global-universe/global-universe.component.html`
```html
<dms-editable-cell ... [max]="12" ... />
```
The `[max]="12"` binding is hardcoded. It should be dynamic based on distribution frequency.

**Validation logic:**
`apps/dms-material/src/app/shared/components/editable-cell/editable-cell.component.ts`
`saveEdit()` sets `` validationError$.set(`Value must be at most ${maxVal}`) `` and returns early
when `numericValue > max`, keeping `isEditing$ = true`.

**Test data:**
No `frequency` field exists on the `Universe` Prisma model. Weekly frequency = `distributions_per_year = 52`.
Default seed symbol `TESTEQ1` is always present (seeded by `tools/create-test-db.js`).
No custom seeding needed — bug manifests for ANY symbol when value > 12 is entered.

**Universe table selectors:**
- Symbol filter: `input[placeholder="Search Symbol"]`
- Table row: `tr.mat-mdc-row` with `text=TESTEQ1`
- Dist/Year cell: `td.mat-column-distributions_per_year`
- Display mode: `.display-value` (click to enter edit mode)
- Input: `input[matinput]` (lowercase attribute)
- Validation error: `div.validation-error[role="alert"]` / `getByText('Value must be at most 12')`

**Investigation note:**
Initially attempted custom seeding (`WKL-${uniqueId}` symbols) in `beforeAll/afterAll`,
but SmartNgRX lazy-loading meant the seeded symbol was not in the visible page range after
filtering, causing `beforeEach` to timeout. Switched to default seed symbol TESTEQ1, which
always loads first and resolves immediately.

---

### Confirming the Bug

Playwright error output for AC#1:

```text
Error: expect(locator).not.toBeVisible() failed

Locator:  getByText('Value must be at most 12')
Expected: not visible
Received: visible

  > 93 |     await expect(page.getByText('Value must be at most 12')).not.toBeVisible();
```

This confirms the bug: "Value must be at most 12" IS visible when 52 is entered,
because `[max]="12"` is hardcoded in the template.

---

### Key Commands

| Purpose | Command |
|---------|---------|
| Run only the new spec (Chromium) | `CI=1 pnpm exec playwright test --config=apps/dms-material-e2e/playwright.config.ts --project=chromium apps/dms-material-e2e/src/dist-per-year-weekly.spec.ts` |
| Run all tests (expect new failures) | `pnpm all` |

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (GitHub Copilot)

### Debug Log References

- SmartNgRX lazy-loading prevented custom-seeded symbols from appearing via filter — root
  cause: seeded symbols with alphabetically late tickers (WKL-xxx) are not in the initial
  visible page of the table. Resolved by using default seed symbol TESTEQ1.
- Each test retry regenerated a different symbol ID because `beforeAll` appears to re-run on
  retry in Playwright when `reuseExistingServer: true` is set. Resolved by removing custom
  seeding entirely.
- `Cannot find module '.prisma/client/default'` — resolved by running
  `pnpm exec prisma generate` (postinstall only runs when `CI=true` string, not `CI=1`).
- `The table main.risk_group does not exist` — resolved by running
  `node tools/create-test-db.js test-database.db`.

### Completion Notes List

- Tests fail correctly at the bug assertion (not at setup/navigation).
- No custom seeding, no `beforeAll/afterAll` needed — simpler and more reliable.
- `pnpm all` fails as expected; no other tests broken.
- Story 78.2 will fix `[max]="12"` to be dynamic, making these tests green.

### File List

- `apps/dms-material-e2e/src/dist-per-year-weekly.spec.ts` — Created (new failing E2E spec)

### Change Log

| Date | Change |
|------|--------|
| 2026-04-21 | Created `dist-per-year-weekly.spec.ts` with 2 failing tests confirming the [max]="12" bug |
