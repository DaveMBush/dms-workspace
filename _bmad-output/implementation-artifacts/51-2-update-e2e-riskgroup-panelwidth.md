# Story 51.2: Update E2E Tests for Risk Group Filter Dropdown Width

Status: Approved

## Story

As a developer,
I want the Playwright e2e tests for the Risk Group filter dropdown updated to reflect the
`panelWidth=""` behaviour,
so that the correct behaviour is asserted and no tests fail due to the `panelWidth` value change.

## Acceptance Criteria

1. **Given** any existing e2e test references `panelWidth="auto"` or makes an assertion tied to the
   trigger-constrained panel width for the Risk Group filter, **When** the test is updated, **Then**
   the assertion instead confirms the panel is at least as wide as the widest option label.
2. **Given** the updated e2e tests are run with `pnpm run e2e:dms-material:chromium`, **When** the
   test suite completes, **Then** all Risk Group dropdown width tests pass with zero failures.
3. **Given** the updated tests are in place, **When** `pnpm all` runs, **Then** no existing tests
   regress.

## Tasks / Subtasks

- [ ] Update `apps/dms-material-e2e/src/universe-riskgroup-dropdown-width.spec.ts` (AC: #1)
  - [ ] Change the locator in both tests from `mat-select[panelwidth="auto"]` to
        `mat-select[panelwidth=""]` so the selector matches the template after Story 51.1's fix
  - [ ] Update the file-header comment (line 12) from `(panelWidth="auto" added to mat-select)`
        to `(panelWidth="" applied to mat-select, allowing natural content width)`
  - [ ] Update both in-test comments that say "Risk Group is the only filter mat-select with
        panelWidth="auto"" to say "Risk Group filter mat-select uses panelWidth="" (content width)"
  - [ ] In the width-assertion test, replace the "panel ≥ trigger width" assertion with a
        "panel ≥ widest option label width" assertion using `page.evaluate()`
        (see Dev Notes → Test Patterns for the replacement snippet)
  - [ ] Save the file
- [ ] Run `pnpm run e2e:dms-material:chromium` and confirm all Risk Group width tests pass (AC: #2)
- [ ] Run `pnpm all` and confirm no regressions (AC: #3)

## Dev Notes

### Key Files

- **Primary test file to update:**
  `apps/dms-material-e2e/src/universe-riskgroup-dropdown-width.spec.ts`
  — Written in Story 49.2 to cover `panelWidth="auto"`. Needs two selector strings updated and
  the panel-width assertion changed to compare against the widest option label rather than the
  trigger width.
- **Column-filter-width tests (no changes expected):**
  `apps/dms-material-e2e/src/universe-column-filter-width.spec.ts`
  — Verifies that filter inputs stay within column bounds. `panelWidth` has no bearing on the
  trigger/closed-state width, so this file should need no modifications.
- **Template changed in Story 51.1:**
  `apps/dms-material/src/app/global/global-universe/global-universe.component.html`
  — The `@case ('risk_group')` block now has `panelWidth=""` (was `panelWidth="auto"`).

### What Changed in Story 51.1

Story 51.1 changed one attribute value in the Angular template:

|               | Before (Story 49.1)                        | After (Story 51.1)                           |
| ------------- | ------------------------------------------ | -------------------------------------------- |
| Attribute     | `panelWidth="auto"`                        | `panelWidth=""`                              |
| Panel sizing  | Matches trigger width (column-constrained) | Grows to widest option label (content width) |
| Trigger width | Column-constrained                         | Unchanged — remains column-constrained       |

The HTML attribute rendered in the DOM also changes from `panelwidth="auto"` to `panelwidth=""`
(Angular lowercases the attribute name at runtime), which is what breaks the CSS attribute
selector `mat-select[panelwidth="auto"]` used by the current tests.

### Why the Old Tests Break

The current `universe-riskgroup-dropdown-width.spec.ts` uses this locator in both tests:

```ts
const riskGroupSelect = page.locator('tr.filter-row mat-select[panelwidth="auto"]');
```

After Story 51.1, the rendered attribute value is `""` not `"auto"`, so:

- `await expect(riskGroupSelect).toHaveCount(1)` will fail — the locator matches 0 elements.

The fix is to update the selector to `mat-select[panelwidth=""]`:

```ts
const riskGroupSelect = page.locator('tr.filter-row mat-select[panelwidth=""]');
```

The empty-string attribute selector (`[attr=""]`) matches the rendered DOM attribute value after
`panelWidth=""` is applied. Verify this with the Playwright MCP server against the running app
before committing.

### Test Patterns

#### Updated selector (both tests)

```ts
// panelWidth="" is the CDK content-width mode (Story 51.1 fix)
const riskGroupSelect = page.locator('tr.filter-row mat-select[panelwidth=""]');
```

#### Updated width-assertion test body

Replace the trigger-width comparison with a widest-option-label comparison:

```ts
test('Risk Group filter dropdown panel is at least as wide as its widest option label', async ({ page }) => {
  // panelWidth="" means the panel grows to fit the widest option label
  const riskGroupSelect = page.locator('tr.filter-row mat-select[panelwidth=""]');
  await expect(riskGroupSelect).toHaveCount(1);
  await expect(riskGroupSelect).toBeVisible({ timeout: 10000 });

  // Open the dropdown panel
  await riskGroupSelect.click();

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
  expect(panelBox!.width).toBeGreaterThanOrEqual(widestOptionLabelWidth - 1);

  // Close the panel
  await page.keyboard.press('Escape');
});
```

> **Note:** The `- 1` tolerance accounts for sub-pixel rounding differences between
> `scrollWidth` (integer) and the CSS bounding box (float). Adjust to `- 2` or `0` if
> the Playwright MCP server run reveals consistent off-by-one failures.

#### No-overflow test (logic unchanged, only selector and comment updated)

```ts
test('Risk Group filter dropdown options do not overflow horizontally', async ({ page }) => {
  // panelWidth="" — panel grows to content width (Story 51.1 fix)
  const riskGroupSelect = page.locator('tr.filter-row mat-select[panelwidth=""]');
  await expect(riskGroupSelect).toHaveCount(1);
  await expect(riskGroupSelect).toBeVisible({ timeout: 10000 });

  // Open the dropdown panel
  await riskGroupSelect.click();

  // Wait for the panel to appear
  const panel = page.locator('.mat-mdc-select-panel');
  await expect(panel).toBeVisible({ timeout: 10000 });

  // Assert no mat-option element has horizontal text overflow
  const hasOverflow = await page.evaluate(() => {
    const options = document.querySelectorAll('.mat-mdc-select-panel mat-option');
    return Array.from(options).some((el) => (el as HTMLElement).scrollWidth > (el as HTMLElement).clientWidth);
  });
  expect(hasOverflow).toBe(false);

  // Close the panel
  await page.keyboard.press('Escape');
});
```

### Key Commands

- Run Chromium e2e only: `pnpm run e2e:dms-material:chromium`
- Run all tests: `pnpm all`
- Start frontend dev server (for Playwright MCP verification): `pnpm start:dms-material`

### Playwright MCP Verification Steps

With the dev server running (`pnpm start:dms-material`):

1. Open `http://localhost:4200/global/universe` in the Playwright browser.
2. Inspect the Risk Group column header filter row — confirm the `mat-select` element has the
   attribute `panelwidth=""` (not `panelwidth="auto"`).
3. Click the Risk Group trigger to open the dropdown panel overlay.
4. Run `page.locator('.mat-mdc-select-panel').boundingBox()` — note the panel width.
5. Run the `page.evaluate()` snippet in Dev Notes to measure the widest option label width.
6. Confirm `panelWidth >= widestOptionLabelWidth`.
7. Close the panel and confirm the trigger field still occupies only the column width (visually
   bounded by the column header cell).

### Angular Material Selector Notes

| CSS attribute             | Angular `@Input`    | Behaviour                          |
| ------------------------- | ------------------- | ---------------------------------- |
| `[panelwidth="auto"]`     | `panelWidth="auto"` | Panel matches trigger width        |
| `[panelwidth=""]`         | `panelWidth=""`     | Panel grows to widest `mat-option` |
| `[panelwidth]` (no value) | attribute absent    | Uses Material default              |

The Playwright attribute selector `[panelwidth=""]` is a standard CSS exact-match selector and
matching a DOM attribute with value `""` — this is well-supported in Chromium. If the selector
proves unreliable, fall back to selecting the Risk Group column header's `mat-select` by its
column position or `aria-label`.

### References

- [Source: _bmad-output/planning-artifacts/epics-2026-04-06b.md — Story 51.2]
- [Source: _bmad-output/implementation-artifacts/51-1-fix-riskgroup-panelwidth-empty-string.md]
- [Source: _bmad-output/implementation-artifacts/49-2-e2e-riskgroup-dropdown-width.md]
- [Source: apps/dms-material-e2e/src/universe-riskgroup-dropdown-width.spec.ts]
- [Source: apps/dms-material-e2e/src/universe-column-filter-width.spec.ts]
- [Source: _bmad-output/project-context.md]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (GitHub Copilot)

### Debug Log References

### Completion Notes List

### File List

- `apps/dms-material-e2e/src/universe-riskgroup-dropdown-width.spec.ts`
