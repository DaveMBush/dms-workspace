# Story 111.4: Regression Suite — Two-Region Layout and Synchronized Horizontal Scroll

Status: Approved

**Story Key:** `111-4-base-table-two-region-regression-suite`
**Epic:** 111 — Eliminate Janky Scroll by Decoupling Sticky Header from Virtualized Body (Round 10)
**Source:** [_bmad-output/planning-artifacts/epics-2026-05-23.md](../planning-artifacts/epics-2026-05-23.md) (Story 111.4)
**Type:** Test (E2E regression suite)
**Depends on:** Story 111.2, Story 111.3
**Enables:** none
**Requirements covered:** R7, R8, R9, R10, R11

## Story

As a developer,
I want an E2E regression suite that, on every consuming screen, (a) asserts the header is not using `position: sticky`, (b) asserts header and body column widths match, (c) asserts horizontal scrolling keeps header and body in lock-step, and (d) drives slow vertical scrolling after account-change and filter-change with assertions for header invariants,
So that any future change that reintroduces sticky headers, breaks column alignment, desynchronizes horizontal scroll, or returns scrolling jank fails CI immediately.

## Epic Context

Stories 111.2 (refactor) and 111.3 (verify everywhere) make Round 10 work. This story locks Round 10 in **forever**: an automated regression suite running on both Chromium and Firefox that fails CI if any future change re-introduces the artifacts the epic was created to eliminate. Manual verification (revert 111.2 → suite fails) is part of the DoD.

## Acceptance Criteria

1. **AC1 — Per-screen assertions cover the four invariants.**
   **Given** every screen in the Story 111.1 consumer inventory,
   **When** the regression test runs against that screen,
   **Then** the test asserts:
   - (a) the header element's computed `position` is not `sticky`;
   - (b) for each column index, header-cell `getBoundingClientRect().width`
     equals body-cell `getBoundingClientRect().width` within a **1px** tolerance;
   - (c) if the body is wider than the viewport, programmatically scrolling the
     body horizontally moves the header by the same `scrollLeft` delta
     (and vice-versa);
   - (d) slow vertical scrolling after an account-change or filter-change leaves
     the header at the top of the table region with no overlap on the parent
     header.

2. **AC2 — Suite passes on both browsers.**
   **Given** Chromium and Firefox,
   **When** the suite runs in both,
   **Then** all assertions pass in both browsers.

3. **AC3 — Suite is part of `pnpm all` and not skipped.**
   **Given** the suite is committed,
   **When** CI runs,
   **Then** the suite is part of `pnpm all` and is not skipped (no `.skip`,
   no unconditional `test.skip(true, …)`).

4. **AC4 — Suite catches a deliberate regression.**
   **Given** a deliberate regression (e.g., revert Story 111.2's refactor to
   re-introduce `position: sticky`),
   **When** the suite runs,
   **Then** at least one assertion fails — confirming the suite catches the
   most likely future regressions. Record the verification (revert hash / branch
   name + suite output excerpt) in Dev Notes, then revert the revert.

## Tasks / Subtasks

- [ ] **Task 1 — Add the E2E regression spec file** (AC: #1)
  - [ ] Create
        `apps/dms-material-e2e/src/base-table-two-region-regression.spec.ts`
        (or similar — match existing naming convention used by
        `scrolling-regression-105.spec.ts`).
  - [ ] Parameterise the spec by `consumer` (screen name + URL + a per-row
        DOM selector). Source the consumer list from Story 111.1's inventory.

- [ ] **Task 2 — Implement assertion (a): header is not sticky** (AC: #1)
  - [ ] Query the header element via a stable selector exposed by the base
        table (e.g. `[data-testid="base-table-header"]`). Add the test-id in
        Story 111.2's refactored template if not already present (this is a
        small, allowable additive change for testability).
  - [ ] Use `await page.evaluate(...)` to read `getComputedStyle(headerEl).position`
        and assert it is **not** `'sticky'`.

- [ ] **Task 3 — Implement assertion (b): header/body column width parity** (AC: #1)
  - [ ] Query header cells via `[data-testid="base-table-header"] [role="columnheader"]`
        (or the test-id used by the refactor).
  - [ ] Query the first rendered body row's cells via the same per-cell selector.
  - [ ] Assert per-index width equality within 1px tolerance.

- [ ] **Task 4 — Implement assertion (c): synchronized horizontal scroll** (AC: #1)
  - [ ] Detect whether the body is wider than the viewport (skip horizontal
        assertions if not — conditional `test.skip(narrowTable, '…')` is
        environmental and allowed here).
  - [ ] Programmatically set the outer scroller's `scrollLeft` to a known
        non-zero value. Read both header and body cell positions; assert their
        `scrollLeft` (or `getBoundingClientRect().left`) shifts by the same
        delta within 1px.
  - [ ] Reverse direction: scroll back to 0 and re-assert.

- [ ] **Task 5 — Implement assertion (d): post-context-change header invariant** (AC: #1)
  - [ ] Trigger account-change (or filter-change) on the screen.
  - [ ] Slow-scroll vertically (e.g. 4px / step, like Epic 101's scroll
        cadence). After each step assert the header element's `boundingRect.top`
        equals the table region's `boundingRect.top` within 1px and no header
        overlaps another header.

- [ ] **Task 6 — Wire into Playwright project matrix** (AC: #2)
  - [ ] Confirm the spec runs under both `chromium` and `firefox` projects in
        [apps/dms-material-e2e/playwright.config.ts](../../apps/dms-material-e2e/playwright.config.ts).

- [ ] **Task 7 — Confirm tests are not skipped** (AC: #3)
  - [ ] Run `bash scripts/check-no-skipped-tests.sh` and confirm green.

- [ ] **Task 8 — Manual revert verification** (AC: #4)
  - [ ] On a throwaway branch revert Story 111.2's refactor (re-add
        `position: sticky` to the header). Run the new suite. Confirm at least
        one assertion fails.
  - [ ] Capture the failing assertion's message and paste into Dev Notes.
  - [ ] Throw away the branch.

- [ ] **Task 9 — Quality gate** (AC: #2, #3)
  - [ ] Run `pnpm e2e:dms-material:chromium`, `pnpm e2e:dms-material:firefox`,
        `pnpm all`. Record all three.

## Dev Notes

### Architecture & Code Pointers

- **Spec location:** `apps/dms-material-e2e/src/base-table-two-region-regression.spec.ts`.
  Use existing scrolling-regression specs as a template:
  - `apps/dms-material-e2e/src/scrolling-regression-105.spec.ts`
  - `apps/dms-material-e2e/src/scrolling-regression-106-investigation.spec.ts`
  (Verify exact paths during Task 1 — they live in the e2e app's `src/`).
- **Consumer inventory:** Story 111.1 Dev Notes — must include every screen
  using the base table.
- **Header test-id:** If Story 111.2 did not add a test-id, add a small
  additive change to the refactored template (`data-testid="base-table-header"`
  on the header region, `data-testid="base-table-body"` on the viewport) so
  the regression suite has stable selectors. This is the only allowable
  additive change to production code in this story.

### Test Strategy Notes

- **1px tolerance** comes from sub-pixel rendering on hi-DPI displays. Tighter
  than 1px is fragile across browsers.
- **Conditional skip** is allowed only where the test cannot meaningfully run
  (e.g. body not wider than viewport at the test viewport size). The skip
  condition must be observable and reported (NFR5 / repo conventions).
- **Manual revert** (Task 8) is the empirical proof that the suite catches the
  regression class the epic exists to prevent.

### Testing Standards

- Tests must not be `.skip` / `xit` / unconditional `test.skip(true, …)`.
- Suite must pass on both Chromium and Firefox.
- `pnpm all` must include the suite (it runs as part of the e2e target
  invoked by `pnpm all`).
- Do not weaken assertions (NFR5).

### Project Structure Notes

- Repo memory: [/memories/repo/e2e-timing.md](../../../memories/repo/e2e-timing.md)
  for cross-browser timing gotchas.
- Skipped-test guard: [scripts/check-no-skipped-tests.sh](../../scripts/check-no-skipped-tests.sh).
- Project conventions per [_bmad-output/project-context.md](../project-context.md).

### References

- Epic source: [_bmad-output/planning-artifacts/epics-2026-05-23.md](../planning-artifacts/epics-2026-05-23.md) — Story 111.4 section
- Story 111.1: [111-1-design-base-table-two-region-layout.md](./111-1-design-base-table-two-region-layout.md)
- Story 111.2: [111-2-refactor-base-table-two-region.md](./111-2-refactor-base-table-two-region.md)
- Story 111.3: [111-3-verify-all-screens-after-refactor.md](./111-3-verify-all-screens-after-refactor.md)
- Existing scrolling spec example: `apps/dms-material-e2e/src/scrolling-regression-105.spec.ts`
- E2E app: [apps/dms-material-e2e/](../../apps/dms-material-e2e/)

## Definition of Done

- [ ] Regression tests covering every screen in the Story 111.1 inventory
- [ ] Assertions for (a) no `position: sticky`, (b) header/body column width match, (c) synchronized horizontal scroll, (d) post-context-change vertical scroll invariants
- [ ] Tests pass on both Chromium and Firefox
- [ ] Tests not skipped; included in `pnpm all`
- [ ] Manually verified to fail when Story 111.2 refactor is reverted
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
