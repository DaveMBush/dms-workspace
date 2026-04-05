# Story 29.2: Verify Smooth Scrolling on All Tables with Playwright

Status: Approved

## Story

As a developer,
I want a Playwright E2E test that scrolls each virtual-scroll table from top to bottom and verifies no rendering artifacts,
so that `CdkVirtualScrollViewport` scroll behavior is automatically regression-tested.

## Acceptance Criteria

1. **Given** the Universe table is rendered with at least 50 rows, **When** the Playwright test scrolls monotonically from the top to the bottom, **Then** the scroll position increases monotonically without jumps above zero (no scroll position regression detected).
2. **Given** the Screener table (if virtual-scroll is used), **When** the same monotonic scroll test runs, **Then** the same constraint holds.
3. **Given** the test scrolls incrementally (e.g., by calling `wheel` events or `scrollTo` in steps), **When** it samples the `scrollTop` value after each step, **Then** each sample is greater than or equal to the previous sample.
4. **Given** the test completes, **When** `pnpm e2e:dms-material:chromium` runs, **Then** all scroll verification tests pass.
5. **Given** a `rowHeight` value that is incorrect (hypothetically), **When** the scroll test runs, **Then** it would detect the jump and fail, confirming the test is a meaningful regression guard.

## Definition of Done

- [ ] Playwright smooth-scroll test written for Universe table
- [ ] Playwright smooth-scroll test written for Screener table (if applicable)
- [ ] Test added to the E2E suite and runs in CI
- [ ] Run `pnpm e2e:dms-material:chromium`
- [ ] Run `pnpm e2e:dms-material:firefox`
- [ ] Run `pnpm format`
- [ ] Repeat all of these if any fail until they all pass

## Tasks / Subtasks

- [ ] Implement monotonic-scroll helper (AC: #1, #3)
  - [ ] In `apps/dms-material-e2e/src/helpers/` create `verify-smooth-scroll.ts`
  - [ ] Export `verifyMonotonicScroll(page: Page, scrollContainerSelector: string, steps: number)`:
    - Get the scroll container element
    - Loop `steps` times: call `scrollBy({ top: stepSize })` and record `scrollTop`
    - Assert each recorded `scrollTop` >= previous (monotonically non-decreasing)
    - Return the final `scrollTop` value for assertion by the caller
- [ ] Write Universe table scroll test (AC: #1)
  - [ ] Navigate to the Universe screen
  - [ ] Wait for the virtual-scroll table to be rendered with data
  - [ ] Call `verifyMonotonicScroll` with the Universe table's `cdk-virtual-scroll-viewport` selector
  - [ ] Assert final scroll position is greater than initial (i.e., actual scrolling occurred)
- [ ] Write Screener table scroll test (AC: #2, if applicable)
  - [ ] Navigate to the Screener screen
  - [ ] Perform the same verification
- [ ] Validate (AC: #4)
  - [ ] Run `pnpm e2e:dms-material:chromium` and confirm tests pass

## Dev Notes

### Key Files

- `apps/dms-material-e2e/src/helpers/verify-smooth-scroll.ts` — NEW helper
- `apps/dms-material-e2e/src/` — test directory for new spec file
- `apps/dms-material/src/app/shared/components/base-table/base-table.component.ts` — selector reference

### Scroll Container Selector

The `CdkVirtualScrollViewport` renders a `<cdk-virtual-scroll-viewport>` element. Use:

```typescript
const viewport = page.locator('cdk-virtual-scroll-viewport');
```

If multiple viewports exist on a page, scope by the screen's component selector.

### Monotonic Scroll Implementation Sketch

```typescript
export async function verifyMonotonicScroll(page: Page, selector: string, steps = 20, stepPx = 100): Promise<void> {
  const el = page.locator(selector);
  let prev = await el.evaluate((node: Element) => node.scrollTop);

  for (let i = 0; i < steps; i++) {
    await el.evaluate((node: Element, px: number) => node.scrollBy(0, px), stepPx);
    await page.waitForTimeout(50); // allow render
    const curr = await el.evaluate((node: Element) => node.scrollTop);
    if (curr < prev) {
      throw new Error(`Scroll position decreased: ${prev} -> ${curr} (step ${i})`);
    }
    prev = curr;
  }
}
```

### Data Requirement

The test requires the table to have enough rows to actually scroll. Ensure the E2E environment seeds sufficient data (50+ universe rows) or uses mock data via API interception.

### Dependencies

- Depends on Story 29.1 (row heights must be correct before this test is meaningful)

### References

[Source: apps/dms-material-e2e/src/]
[Source: apps/dms-material/src/app/shared/components/base-table/base-table.component.ts]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
