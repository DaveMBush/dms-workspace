# Story 52.2: Write E2E Tests for Accounts Filter Dropdown Width

Status: Approved

## Story

As a developer,
I want Playwright e2e tests that verify the Accounts filter dropdown panel on the Universe screen
displays options without wrapping,
so that regressions in panel width cannot go undetected.

## Acceptance Criteria

1. **Given** the Playwright MCP server is used to open the Accounts filter dropdown on the
   Universe screen, **When** the dropdown panel is open, **Then** the test asserts that all rendered
   `mat-option` elements are contained on a single line (no text wrapping nor overflow).
2. **Given** the Playwright MCP server captures the trigger field width and the panel width,
   **When** the dropdown panel is open, **Then** the test asserts the panel width is greater than
   or equal to the widest option label width.
3. **Given** the e2e tests are run with `pnpm run e2e:dms-material:chromium`, **When** the test
   suite completes, **Then** all new Accounts dropdown width tests pass with zero failures.
4. **Given** the new tests are added, **When** `pnpm all` runs, **Then** no existing tests regress.

## Tasks / Subtasks

- [ ] Create `apps/dms-material-e2e/src/universe-accounts-dropdown-width.spec.ts` (AC: #1, #2)
  - [ ] Add `test.beforeEach` that logs in and navigates to `/global/universe`, waits for
        `dms-base-table` to be visible
  - [ ] Write test: **"Accounts filter dropdown options do not overflow horizontally"**
    - [ ] Locate the Account `mat-select` via `.universe-toolbar mat-form-field.account-select mat-select`
          (or `.universe-toolbar mat-select[panelwidth=""]` after Story 52.1 applies `panelWidth=""`)
    - [ ] Click to open the dropdown panel
    - [ ] Wait for `.mat-mdc-select-panel` to be visible
    - [ ] Use `page.evaluate()` to assert no `mat-option` has `scrollWidth > clientWidth`
    - [ ] Close with `Escape`
  - [ ] Write test: **"Accounts filter dropdown panel is at least as wide as its widest option label"**
    - [ ] Locate the Account `mat-select` (same selector as above)
    - [ ] Click to open the dropdown panel
    - [ ] Wait for `.mat-mdc-select-panel` to be visible
    - [ ] Measure panel width with `panel.boundingBox()`
    - [ ] Use `page.evaluate()` to compute the widest `mat-option` `scrollWidth`
    - [ ] Assert `panelBox.width >= widestOptionLabelWidth - 1`
    - [ ] Close with `Escape`
  - [ ] Save the file
- [ ] Run `pnpm run e2e:dms-material:chromium` and confirm both new Accounts width tests pass (AC: #3)
- [ ] Run `pnpm all` and confirm no regressions (AC: #4)

## Dev Notes

### Key Files

- **New test file to create:**
  `apps/dms-material-e2e/src/universe-accounts-dropdown-width.spec.ts`
  — Mirrors the structure of `universe-riskgroup-dropdown-width.spec.ts` (Story 49.2 / 51.2)
  but targets the toolbar Account `mat-select` instead of the filter-row Risk Group `mat-select`.
- **Template changed in Story 52.1:**
  `apps/dms-material/src/app/global/global-universe/global-universe.component.html`
  — The `mat-form-field.account-select` in `mat-toolbar` now has `panelWidth=""` on its
  `mat-select`.
- **Reference test (no changes needed):**
  `apps/dms-material-e2e/src/universe-riskgroup-dropdown-width.spec.ts`
  — Pattern donor for the new Account tests.
- **Existing account-related tests (do NOT break):**
  - `apps/dms-material-e2e/src/universe-screen-e2e.spec.ts` — uses
    `.universe-toolbar mat-form-field mat-select` to interact with the Account selector.
    The new test file creates a focused spec; the existing usage here is not affected.
  - `apps/dms-material-e2e/src/universe-column-filter-width.spec.ts` — column filter
    widths; unrelated to the toolbar select.

### DOM Locator Strategy

After Story 52.1, the Account `mat-select` in the toolbar renders with `panelwidth=""` in the DOM.
Two selector approaches work:

```ts
// Option A — structural (more stable, works before and after Story 52.1)
const accountSelect = page.locator(
  '.universe-toolbar mat-form-field.account-select mat-select'
);

// Option B — attribute-value match (mirrors risk-group pattern exactly)
const accountSelect = page.locator(
  '.universe-toolbar mat-select[panelwidth=""]'
);
```

**Prefer Option A** for clarity, since there is only one `mat-form-field.account-select` in the
toolbar and it is unambiguous regardless of `panelWidth` attribute state.

> **Why not `mat-select[panelwidth=""]`?**
> While the risk-group tests use `tr.filter-row mat-select[panelwidth=""]` as the selector,
> the Account `mat-select` is in the toolbar (`mat-toolbar`), not the filter row. If more
> toolbar selects gain `panelWidth=""` in future stories, Option A is more targeted.
> If the running app confirms only one `[panelwidth=""]` exists in `.universe-toolbar`, Option B
> is also acceptable — verify with the Playwright MCP server.

### No Seed Data Required

Unlike the risk-group tests, the Account dropdown does not need seeded risk groups. It uses
whatever accounts exist in the development database. The `beforeAll` step from the risk-group
spec (`createRiskGroups`) is **not** needed here.

However, at least one account must exist for the tests to be meaningful. The dev database seeded
by Story 52.1's verification includes test accounts. If the test environment has no accounts,
the dropdown will contain only the "All Accounts" option — the no-overflow assertion will still
pass trivially. Document this assumption in the test file comment.

### Complete Test File

```ts
import { expect, test } from 'playwright/test';

import { login } from './helpers/login.helper';

/**
 * Universe Screen Accounts Filter Dropdown Width E2E Tests (Story 52.2)
 *
 * Verifies that the Accounts filter dropdown panel on the Universe screen
 * (toolbar mat-select inside mat-form-field.account-select) displays option
 * labels without text wrapping after the Story 52.1 fix
 * (panelWidth="" applied to mat-select, allowing natural content width).
 *
 * Note: At least one account must exist in the test database for the width
 * assertions to exercise a multi-option dropdown. With only "All Accounts"
 * the overflow check passes trivially.
 */

test.describe('Universe Accounts Filter Dropdown Width', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/global/universe');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('dms-base-table')).toBeVisible({
      timeout: 15000,
    });
  });

  test('Accounts filter dropdown options do not overflow horizontally', async ({
    page,
  }) => {
    // Account filter mat-select uses panelWidth="" (content width) — Story 52.1 fix
    const accountSelect = page.locator(
      '.universe-toolbar mat-form-field.account-select mat-select'
    );
    await expect(accountSelect).toHaveCount(1);
    await expect(accountSelect).toBeVisible({ timeout: 10000 });

    // Open the dropdown panel
    await accountSelect.click();

    // Wait for the panel to appear
    const panel = page.locator('.mat-mdc-select-panel');
    await expect(panel).toBeVisible({ timeout: 10000 });

    // Assert no mat-option element has horizontal text overflow
    const hasOverflow = await page.evaluate(() => {
      const options = document.querySelectorAll(
        '.mat-mdc-select-panel mat-option'
      );
      return Array.from(options).some(
        (el) => (el as HTMLElement).scrollWidth > (el as HTMLElement).clientWidth
      );
    });
    expect(hasOverflow).toBe(false);

    // Close the panel
    await page.keyboard.press('Escape');
  });

  test('Accounts filter dropdown panel is at least as wide as its widest option label', async ({
    page,
  }) => {
    // panelWidth="" means the panel grows to fit the widest option label
    const accountSelect = page.locator(
      '.universe-toolbar mat-form-field.account-select mat-select'
    );
    await expect(accountSelect).toHaveCount(1);
    await expect(accountSelect).toBeVisible({ timeout: 10000 });

    // Open the dropdown panel
    await accountSelect.click();

    // Wait for the panel to appear
    const panel = page.locator('.mat-mdc-select-panel');
    await expect(panel).toBeVisible({ timeout: 10000 });

    // Measure panel width
    const panelBox = await panel.boundingBox();
    expect(panelBox).not.toBeNull();

    // Measure the widest option label's rendered width
    const widestOptionLabelWidth = await page.evaluate(() => {
      const options = document.querySelectorAll('.mat-mdc-select-panel mat-option');
      let maxWidth = 0;
      options.forEach((el) => {
        const w = (el as HTMLElement).scrollWidth;
        if (w > maxWidth) maxWidth = w;
      });
      return maxWidth;
    });

    // Panel must be at least as wide as the widest option label
    // (-1 tolerance for sub-pixel rounding between scrollWidth integer and CSS float)
    expect(panelBox!.width).toBeGreaterThanOrEqual(widestOptionLabelWidth - 1);

    // Close the panel
    await page.keyboard.press('Escape');
  });
});
```

### Key Commands

```bash
# Run Chromium e2e only
pnpm run e2e:dms-material:chromium

# Run all tests
pnpm all

# Start frontend dev server (for Playwright MCP verification)
pnpm start:dms-material
# Then open http://localhost:4200/global/universe
```

### Playwright MCP Verification Steps

With the dev server running (`pnpm start:dms-material` or the already-running `pnpm start:server`):

1. Open `http://localhost:4200/global/universe` in the Playwright browser.
2. Inspect the toolbar — confirm there is a `mat-form-field.account-select` containing a
   `mat-select` with attribute `panelwidth=""` (set by Story 52.1).
3. Click the Account trigger to open the dropdown panel overlay.
4. Run `page.locator('.mat-mdc-select-panel').boundingBox()` — note the panel width.
5. Run the `page.evaluate()` snippet (see widest-label test above) to measure the widest option.
6. Confirm `panelWidth >= widestOptionLabelWidth - 1`.
7. Close the panel and confirm the trigger field remains within the toolbar account-select bound.

### Dependency on Story 52.1

This story **depends on Story 52.1 being completed first**. Story 52.1 adds `panelWidth=""` to
the Account `mat-select` in the toolbar. Without that attribute:

- The DOM attribute selector `mat-select[panelwidth=""]` would match 0 elements.
- The structural selector `.universe-toolbar mat-form-field.account-select mat-select` still
  matches, but the dropdown panel will be trigger-width constrained and the widest-option-label
  assertion **may fail** depending on account name lengths.

Use the structural locator (Option A above) to ensure the test file can be created before or
after Story 52.1 is merged, but only run the full suite once 52.1 is in place.

### Context: Why `panelWidth=""`

Angular Material's `panelWidth` input on `mat-select`:
- `panelWidth="auto"` — sizes the overlay panel to match the trigger width (column-constrained).
- `panelWidth=""` (empty string) — removes the width constraint; the CDK overlay grows to the
  natural width of the widest `mat-option` label. Trigger element width is **not** affected.
- No attribute (previous state before 52.1) — Angular Material uses a platform default.

Story 52.1 adds `panelWidth=""` to `mat-form-field.account-select mat-select` in the toolbar.
This is the Account filter selector used on the Universe screen (`/global/universe`).

### Structural Notes

- The Account selector is in the `mat-toolbar` section of `global-universe.component.html`
  (approximately lines 7–17), **not** in a `@case` block. There is no `@switch`/`@case` for the
  Account selector — it is always rendered in the toolbar.
- Angular 21 Zoneless, `OnPush`, signal-based — no change-detection implications for tests.
- Playwright version: 1.55.1

### References

- Story 52.1: `_bmad-output/implementation-artifacts/52-1-fix-accounts-dropdown-panelwidth-empty-string.md`
- Story 51.2 (risk-group e2e pattern): `_bmad-output/implementation-artifacts/51-2-update-e2e-riskgroup-panelwidth.md`
- Reference test: `apps/dms-material-e2e/src/universe-riskgroup-dropdown-width.spec.ts`
- Column filter width test: `apps/dms-material-e2e/src/universe-column-filter-width.spec.ts`
- Universe screen tests: `apps/dms-material-e2e/src/universe-screen-e2e.spec.ts`
- Project context: `_bmad-output/project-context.md`

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (GitHub Copilot)

### Debug Log References

### Completion Notes List

### File List

- `apps/dms-material-e2e/src/universe-accounts-dropdown-width.spec.ts` _(new file)_
