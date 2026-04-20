# Story 78.1: Write Failing E2E Test for Dist/Year Weekly Acceptance

Status: Approved

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

- [ ] Investigate the symbol edit form and Dist/Year field (AC: #1)
  - [ ] Search for `distPerYear` or `dist_per_year` in `apps/dms-material/src/` to identify the
        edit form component
  - [ ] Search for "Value must be at most 12" in the codebase to confirm the validation message
        text used in the UI
  - [ ] Identify the route that opens the symbol edit form (likely `/universe` with an edit
        dialog)
  - [ ] Identify the input's selector (role, label, test ID, etc.) by inspecting the component
        template

- [ ] Inspect existing E2E specs for universe edit patterns (AC: #1)
  - [ ] Search `apps/dms-material-e2e/src/` for universe edit or symbol edit tests
  - [ ] Identify patterns used to: open the edit dialog, fill fields, blur fields, check
        validation messages, and submit the form
  - [ ] Re-use the same helper functions and selectors

- [ ] Identify or create a weekly test fixture symbol (AC: #1)
  - [ ] Inspect `apps/dms-material-e2e/src/helpers/` for database seed helpers
  - [ ] Check how existing specs seed symbols with specific properties (frequency, ticker, etc.)
  - [ ] Find the Prisma `Universe` model field that stores frequency — check `prisma/schema.prisma`
        for the field name (likely `frequency` or `distributionFrequency`)
  - [ ] Confirm the value used to represent weekly frequency in the database (e.g., `"Weekly"`,
        `"weekly"`, `"W"`, or numeric code)
  - [ ] Seed a symbol with `frequency = "Weekly"` (or correct value) and `distPerYear = 1` as
        the initial value in `beforeAll`

- [ ] Create `apps/dms-material-e2e/src/dist-per-year-weekly.spec.ts` (AC: #1, #2, #3)
  - [ ] Add `beforeAll` to seed a weekly symbol using the existing E2E database helpers
  - [ ] Add `afterAll` to clean up the seeded symbol
  - [ ] Implement AC#1 test: open edit form, clear Dist/Year, type `52`, blur, assert no
        "Value must be at most 12" text is visible — **this test is expected to FAIL**
  - [ ] Implement AC#2 test: submit form with Dist/Year = 52, assert saved value = 52 and no
        error toast — **this test is expected to FAIL**
  - [ ] Add a prominent comment at the top of each failing test:
        `// EXPECTED TO FAIL: Bug exists until Story 78.2 is implemented`

- [ ] Confirm tests fail as expected (AC: #3)
  - [ ] Run `pnpm e2e:dms-material:chromium --grep "dist-per-year-weekly"` (or equivalent)
  - [ ] Confirm both AC#1 and AC#2 tests FAIL with assertion errors
  - [ ] Confirm the failure message matches the expected bug behaviour ("Value must be at most 12"
        is visible when it should not be)
  - [ ] Record failure output in Dev Agent Record

- [ ] Ensure `pnpm all` reports the failures cleanly (AC: #3)
  - [ ] Confirm `pnpm all` runs but exits non-zero due to the new failing tests
  - [ ] Confirm no other tests are broken by the new spec
  - [ ] Record outcome in Dev Agent Record

> **NOTE:** `pnpm all` will NOT pass after this story — that is expected and intentional.
> The suite is restored to green by Story 78.2. Do not skip or `.skip()` the tests.

## Dev Notes

### Purpose of This Story

This story follows the TDD / bug-first workflow established in earlier epics (e.g., Epic 36, 54,
55): write the failing test first to confirm the bug, then fix it in the next story. The test
acts as the authoritative acceptance criterion for Story 78.2.

---

### Finding the Edit Form Component

Search for the validation message text or the form field name:

```
grep_search "Value must be at most 12" apps/dms-material/src/
grep_search "distPerYear\|dist_per_year" apps/dms-material/src/ --includePattern="*.ts"
grep_search "distPerYear\|dist_per_year" apps/dms-material/src/ --includePattern="*.html"
```

The component containing this field is the one to open in the E2E test.

---

### Prisma Schema — Frequency Field

Check `prisma/schema.prisma` for the `Universe` or related model:

```prisma
model Universe {
  // ...
  distPerYear    Int?
  frequency      String?  // or an enum
  // ...
}
```

The exact field name for distribution frequency must be confirmed before seeding. Look for
existing seed data or fixtures in `apps/dms-material-e2e/` to see what values are used.

---

### E2E Seed Helper Pattern

Look at `apps/dms-material-e2e/src/helpers/` for a pattern like:

```typescript
// Example pattern — adapt to actual helper API
import { seedSymbol, cleanupSymbol } from './helpers/db';

let weeklySymbolId: number;

test.beforeAll(async () => {
  weeklySymbolId = await seedSymbol({
    ticker: 'TEST-WKL',
    frequency: 'Weekly',   // confirm exact value from schema/existing tests
    distPerYear: 1,
  });
});

test.afterAll(async () => {
  await cleanupSymbol(weeklySymbolId);
});
```

---

### Opening the Symbol Edit Form

Based on patterns from existing universe specs (adapt selectors to match actual codebase):

```typescript
// Navigate to universe screen
await page.goto('/');
// or await page.goto('/universe');

// Find and click the edit button for the seeded symbol
await page.getByRole('row', { name: 'TEST-WKL' }).getByRole('button', { name: /edit/i }).click();

// Wait for edit dialog/panel to open
await page.waitForSelector('[data-testid="symbol-edit-form"]'); // adjust selector
```

---

### Dist/Year Field Interaction

```typescript
// Find the Dist/Year input
const distPerYearInput = page.getByLabel(/dist.*year/i); // adjust to actual label

// Clear and type 52
await distPerYearInput.clear();
await distPerYearInput.fill('52');
await distPerYearInput.blur();

// Assert validation error is NOT visible (this FAILS due to the bug)
await expect(page.getByText('Value must be at most 12')).not.toBeVisible();
```

---

### Confirming the Bug at Test-Write Time

After writing and running the test, paste the Playwright error output into the Dev Agent Record.
The failure should show something like:

```
AssertionError: expected "Value must be at most 12" to not be visible
  Received: visible
```

This confirms the bug exists and the test correctly gates it.

---

### Test File Naming Convention

Following the pattern of existing TDD stories (e.g., Story 36.1, 54.1):
- File: `apps/dms-material-e2e/src/dist-per-year-weekly.spec.ts`
- Both tests in the same file — one for validation UI behaviour, one for save behaviour

---

### Key Commands

| Purpose | Command |
|---------|---------|
| Run only the new spec (Chromium) | `pnpm e2e:dms-material:chromium --grep "dist per year weekly\|distPerYear"` |
| Run only the new spec (Firefox) | `pnpm e2e:dms-material:firefox --grep "dist per year weekly\|distPerYear"` |
| Run all tests (expect new failures) | `pnpm all` |
| Search for validation message | `grep -r "Value must be at most 12" apps/dms-material/src/` |
| Search for distPerYear | `grep -r "distPerYear\|dist_per_year" apps/dms-material/src/` |

### Key Files

| File | Purpose |
|------|---------|
| `apps/dms-material-e2e/src/dist-per-year-weekly.spec.ts` | New failing E2E spec (create this) |
| `apps/dms-material-e2e/src/helpers/` | Existing E2E database seed helpers |
| `prisma/schema.prisma` | Confirm `frequency` field name and type on Universe model |
| `apps/dms-material/src/` | Symbol edit form component (find via grep for distPerYear) |

## Dev Agent Record

### Agent Model Used

_TBD_

### Debug Log References

### Completion Notes List

### File List
