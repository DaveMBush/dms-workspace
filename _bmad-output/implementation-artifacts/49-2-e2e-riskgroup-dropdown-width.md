# Story 49.2: Write Playwright E2E Tests for Risk Group Filter Dropdown Width

Status: Approved

## Story

As a developer,
I want Playwright e2e tests that verify the Risk Group filter dropdown panel displays options
without wrapping,
so that a regression in dropdown width cannot go undetected.

## Acceptance Criteria

1. **Given** the Playwright MCP server is used to open the Risk Group filter dropdown on the Universe screen, **When** the dropdown panel is open, **Then** the test asserts that all rendered `mat-option` elements have no text wrapping (i.e., `scrollWidth <= clientWidth` for each option element, or visual confirmation via snapshot).
2. **Given** the Playwright MCP server is used to capture the trigger field width, **When** the dropdown panel is open, **Then** the test asserts the panel width is at least as wide as the widest option label.
3. **Given** all e2e tests are added, **When** `pnpm run e2e:dms-material:chromium` is executed, **Then** all new Risk Group dropdown width tests pass with zero failures.
4. **Given** the new tests are added, **When** `pnpm all` runs, **Then** no existing tests regress.

## Tasks / Subtasks

- [ ] Confirm Story 49.1 is complete before starting (AC: #1, #2)
- [ ] Use Playwright MCP server to identify the correct selectors for (AC: #1, #2):
  - [ ] The Risk Group filter column header trigger/button
  - [ ] The open dropdown panel (`mat-select-panel` or `.cdk-overlay-pane`)
  - [ ] The `mat-option` elements inside the panel
- [ ] Write a Playwright e2e test that: (AC: #1)
  - [ ] Navigates to the Universe screen
  - [ ] Clicks the Risk Group filter trigger to open the dropdown
  - [ ] For each visible `mat-option` in the panel, asserts `scrollWidth <= clientWidth` (no horizontal overflow) OR uses `toHaveCSS` to verify `white-space` is not `normal`/`wrap`
- [ ] Write a test asserting the panel width is at least as wide as the trigger (AC: #2)
  - [ ] Capture `boundingBox()` of the panel and the trigger
  - [ ] Assert `panelWidth >= triggerWidth` OR assert panel fits the longest option without clipping
- [ ] Run `pnpm run e2e:dms-material:chromium` and confirm all new tests pass (AC: #3)
- [ ] Run `pnpm all` and confirm no regressions (AC: #4)

## Dev Notes

### Context

Story 49.1 applied `panelWidth="auto"` to the `mat-select` for the Risk Group filter. This story
adds e2e test coverage to prevent a future regression.

### Key Angular Material Selectors (verify with Playwright MCP)

- Dropdown overlay panel: `.mat-mdc-select-panel` or `.cdk-overlay-pane mat-option`
- Trigger (closed state): `mat-select` inside the Risk Group `mat-form-field`
- Individual options: `mat-option` or `.mat-mdc-option`

### Width Assertion Approach

Use `page.evaluate()` to check whether each option has overflow:

```ts
const hasOverflow = await page.evaluate(() => {
  const options = document.querySelectorAll('.mat-mdc-select-panel mat-option');
  return Array.from(options).some(
    (el) => (el as HTMLElement).scrollWidth > (el as HTMLElement).clientWidth
  );
});
expect(hasOverflow).toBe(false);
```

### E2E File Locations

- Test directory: `apps/dms-material-e2e/src/`
- Use Playwright MCP server to inspect the current test file structure and add the test to the
  most appropriate spec file (e.g., universe-screen related spec, or create
  `universe-filters.spec.ts` if none exists).

### Key Commands

- Run Chromium e2e: `pnpm run e2e:dms-material:chromium`
- Run all tests: `pnpm all`

### Project Conventions

- Use Playwright MCP server to identify selectors — do not hard-code class names without
  verifying them in the running app.
- Do not modify existing test files — add tests to a new or existing spec file as appropriate.
- All assertions must be deterministic (no arbitrary waits).

### References

- [Source: _bmad-output/planning-artifacts/epics-2026-04-06.md#Story 49.2]
- [Source: _bmad-output/implementation-artifacts/49-1-fix-riskgroup-dropdown-panel-width.md]
- [Source: _bmad-output/project-context.md]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
