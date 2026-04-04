# Story 44.1: Reproduce and Diagnose Janky Scrolling with Playwright

Status: Approved

## Story

As a developer,
I want to reproduce the janky scrolling issue using the Playwright MCP server and identify its root cause,
so that I can apply a targeted, permanent fix.

## Acceptance Criteria

1. **Given** the Playwright MCP server is connected and a data table screen is open, **When** the developer programmatically scrolls through a data table (e.g., the Universe screen or Dividend Deposits), **Then** the scrolling stutter / jank is observable and reproducible in the Playwright session.
2. **Given** the jank is reproducible, **When** the rendering strategy, change detection cycle, virtual scroll configuration, and CSS are inspected, **Then** the specific root cause is identified and documented (code comment or investigation note).

## Tasks / Subtasks

- [ ] Use the Playwright MCP server to open the Universe screen and programmatically scroll through the table (AC: #1)
  - [ ] Observe and capture evidence of the scrolling jank
  - [ ] Repeat on at least two other table screens (e.g., Account > Open Positions, Dividend Deposits)
- [ ] Review Epic 31 findings (`31-1-reproduce-and-root-cause-the-header-jumping-issue.md`, `31-2-implement-and-verify-the-virtual-scroll-header-fix.md`) to understand what was attempted previously (AC: #2)
- [ ] Inspect virtual scroll configuration — row heights, `cdkFixedSizeVirtualScroll` or `cdkAutoSizeVirtualScroll`, buffer sizes (AC: #2)
- [ ] Inspect change detection — confirm all table components use `OnPush`; check for unnecessary `markForCheck()` calls in scroll handlers (AC: #2)
- [ ] Inspect CSS — check for CSS transitions, animations, or layout-triggering properties on scroll (AC: #2)
- [ ] Document root cause in an investigation note or code comment (AC: #2)
- [ ] Run `pnpm all` to confirm no regressions from read-only investigation (AC: no changes expected)

## Dev Notes

### Background

This issue was previously targeted in Epic 31 (stories 31-1 and 31-2) but the fix did not resolve it completely. The jank continues across ALL data tables in the application, not just one screen. Refer to the Epic 31 story files for context on what was tried previously.

### Key Commands

- Run all tests: `pnpm all`
- E2E: `pnpm run e2e:dms-material:chromium`

### Key File Locations

- Epic 31 story files: `_bmad-output/implementation-artifacts/31-1-reproduce-and-root-cause-the-header-jumping-issue.md`
- Epic 31 story files: `_bmad-output/implementation-artifacts/31-2-implement-and-verify-the-virtual-scroll-header-fix.md`
- Base table component: search for `BaseTableComponent` or `base-table` in `apps/dms-material/src/`
- Virtual scroll usage: search for `cdk-virtual-scroll` in the Angular templates

### Tech Stack

- Angular CDK Virtual Scroll (`@angular/cdk/scrolling`)
- Angular 21 zoneless with `OnPush` change detection
- SmartNgRX / SmartSignals for lazy data loading

### Rules

- This story is investigation-only — do not make implementation changes
- Document findings clearly so Story 44.2 has a clear starting point

### References

- [Source: _bmad-output/planning-artifacts/epics-2026-04-03.md]
- [Source: _bmad-output/implementation-artifacts/31-1-reproduce-and-root-cause-the-header-jumping-issue.md]
- [Source: _bmad-output/implementation-artifacts/31-2-implement-and-verify-the-virtual-scroll-header-fix.md]
- [Source: _bmad-output/project-context.md]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

**Playwright MCP scroll tests — header position vs. scrollTop:**

**Universe Screen** (`/global/universe`, 32 visible rows):
| Step | scrollTop | headerRow.top | Delta from step 0 |
|------|-----------|---------------|-------------------|
| 0 | 0 px | 128 px | — |
| 1 | 50 px | 78 px | −50 px |
| 2 | 100 px | 28 px | −100 px |
| 3 | 150 px | −22 px | −150 px |
| 4 | 200 px | −72 px | −200 px |
| 5 | 250 px | −122 px | −250 px |
| 10 | 500 px | −372 px | −500 px |

**Conclusion**: header moves 1:1 with scrollTop — `position: sticky` is non-functional.

**Dividend Deposits Screen** (`/account/.../div-dep`, 52 visible rows):
| Step | scrollTop | headerRow.top | Delta from step 0 |
|------|-----------|---------------|-------------------|
| 0 | 0 px | 113 px | — |
| 1 | 50 px | 63 px | −50 px |
| 5 | 250 px | −137 px | −250 px |
| 8 | 400 px | −287 px | −400 px |

**Conclusion**: identical 1:1 ratio — same issue present on all `BaseTableComponent` tables.

**Open Positions Screen**: redirects to same account when no open positions. Pattern confirmed at `/div-dep`.

**CSS inspection via Playwright (computed styles):**

- `.virtual-scroll-viewport`: `contain: paint`, `will-change: transform`, `overflow-y: auto`
- `th.mat-mdc-header-cell`: `transition: background-color 0.2s, color 0.2s, border-color 0.2s`, `contain: none`

### Completion Notes List

#### Finding 1: Story 31 Fix Did NOT Resolve Header Jumping

Story 31.2 changed `contain: strict` → `contain: paint` in `base-table.component.scss` (line: `contain: paint; // was: strict`).
However, `contain: paint` **implies `contain: layout`** per the CSS Containment spec. Layout containment creates an independent formatting context that, combined with `will-change: transform` on the same element (scroll container), still prevents `position: sticky; top: 0` from working correctly for descendant `<th>` cells. The header still scrolls away 1:1 with `scrollTop`.

**Actual fix needed (for Story 44.2)**: Remove `contain` entirely (or change to `contain: size`), OR remove `will-change: transform`. The `will-change: transform` on the scroll container itself is the primary culprit — it promotes the element to a GPU compositing layer AND alters how the browser resolves sticky offsets for contained descendants. Removing `contain: paint` alone while keeping `will-change: transform` would not fix the issue.

#### Finding 2: Primary Jank Cause — Global CSS `* { transition: ... }` in `styles.scss`

```scss
// styles.scss
* {
  transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}
```

This rule applies CSS transitions to **every element** in the application, including `<tr>`, `<td>`, and `<th>` elements inside the virtual scroll table. When CDK virtual scroll creates or recycles DOM rows during scrolling, each new element immediately fires 0.2s transition animations for background-color, color, and border-color. This forces the browser to:

1. Compute transition start/end values for each newly visible row element on every scroll step
2. Paint transition frames for all transitioning cells (can be 10–15 cells per new row × N rows rendered)
3. Composite these layers while also handling the scroll physics

This is confirmed by Playwright CSS inspection: `th.mat-mdc-header-cell` has `transition: background-color 0.2s, color 0.2s, border-color 0.2s` applied — coming from the global `*` rule, not from component styles.

**Effect**: Every scroll event that causes CDK to render new rows (typically every 50–100px) triggers a wave of CSS transition animations across all visible table cells. This is the most visible source of jank on all table screens.

#### Finding 3: Jank Cause — `visibleRange` Used as Unnecessary Recompute Trigger

In `OpenPositionsComponentService.selectOpenPositions` and `DividendDepositsComponentService.dividends`, the `visibleRange()` signal is read inside a `computed()` solely as a "reactivity trigger":

```typescript
// OpenPositionsComponentService
selectOpenPositions = computed(() => {
  const trades = this.trades();
  const universeMap = this.universeMap();
  this.visibleRange(); // maintain signal dependency for reactivity ← PROBLEM

  // Dense array: populate ALL items (not just visible range)
  // ...O(n) computation over all rows...
});
```

**What happens during scroll:**

1. User scrolls → CDK `renderedRangeStream.pipe(debounceTime(100))` fires
2. Component's `onRangeChange(range)` → sets `visibleRange` signal
3. Service `selectOpenPositions` / `dividends` computed re-runs → iterates ALL rows with O(n) work (date arithmetic, universe lookups)
4. `data` input to `BaseTableComponent` updates → `dataSource` computed re-runs (sorts ALL rows)
5. Effect in `BaseTableComponent` fires → `cdr.markForCheck()` called
6. Angular schedules change detection → `MatTable` re-renders

Since `visibleRange` does NOT filter the output (all rows are always returned), this signal dependency is purely wasted work. The entire data pipeline is triggered at 10Hz (every 100ms) during continuous scrolling.

#### Finding 4: Jank Cause — `cdr.markForCheck()` in BaseTableComponent Effect

```typescript
// BaseTableComponent constructor
effect(() => {
  const context = this;
  context.dataSource(); // Track signal
  context.cdr.markForCheck(); // ← Called on every dataSource recompute
});
```

In Angular 21 zoneless mode, `markForCheck()` schedules Angular change detection for this component's subtree. Combined with Finding 3, this causes synchronous Angular CD cycles during scroll at up to 10Hz on account panel screens. Each CD cycle involves `MatTable` rendering, which can drop frames if it takes >16ms.

**Note**: For the Universe screen, `visibleRange` is not used (no `(renderedRangeChange)` binding in the template). Jank there is lighter and primarily from Finding 2 (CSS transitions).

#### Finding 5: `will-change: transform` on Scroll Container Is Both Cause of Sticky Failure and Perf Concern

`will-change: transform` on `.virtual-scroll-viewport` was originally added to promote the scroll container to a GPU compositing layer (performance optimization). However:

- It creates a new stacking context on the scroll container
- Combined with any `contain` value (including `contain: paint`), it prevents `position: sticky; top: 0` in descendant `<th>` elements from resolving against the correct scroll container
- Removing it (and relying on the browser's default scroll compositing) may actually improve performance on modern browsers, which natively composite scroll even without this hint

#### Summary of Root Causes for Story 44.2 Fix

| Priority | Root Cause                                                      | Where                                                                           | Effect                                                          |
| -------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| **P1**   | Global `* { transition: ... }` in `styles.scss`                 | `styles.scss:L?`                                                                | Janky scroll — transitions fire on every CDK row create/recycle |
| **P1**   | `will-change: transform` + `contain: paint` on scroll container | `base-table.component.scss`                                                     | Header jumps 1:1 with scroll (sticky broken)                    |
| **P2**   | `visibleRange()` as unnecessary computed trigger in service     | `open-positions-component.service.ts`, `dividend-deposits-component.service.ts` | 10Hz O(n) full recompute during scroll + Angular CD cycles      |
| **P3**   | `cdr.markForCheck()` in effect triggered by data recompute      | `base-table.component.ts`                                                       | Angular CD cycle per data update (amplifies P2)                 |

#### Recommended Fixes for Story 44.2

1. **`styles.scss`**: Scope the global transition to theme-toggle only — add an `.animating` class or use `prefers-reduced-motion`, or remove the `*` selector and apply transitions only to elements that need them (nav, buttons, etc. — NOT table cells):

   ```scss
   // Instead of * { transition: ... }, apply only to theme-aware elements:
   :root body {
     transition: background-color 0.2s ease, color 0.2s ease;
   }
   // Remove transition from table rows/cells via explicit reset
   tr,
   td,
   th {
     transition: none;
   }
   ```

2. **`base-table.component.scss`**: Remove `will-change: transform` from `.virtual-scroll-viewport`. Also change `contain: paint` to `contain: size` (keeps size containment for CDK sizing but removes layout/paint isolation that breaks sticky). Or remove `contain` entirely:

   ```scss
   .virtual-scroll-viewport {
     flex: 1;
     overflow-y: auto;
     overflow-x: hidden;
     // Removed: will-change: transform — breaks sticky positioning on th headers
     // Removed: contain: paint — contain: paint implies layout containment which also breaks sticky
   }
   ```

3. **`open-positions-component.service.ts` and `dividend-deposits-component.service.ts`**: Remove `this.visibleRange()` from the `selectOpenPositions`/`dividends` computed signals. The data is already dense (all rows). If pagination is needed, implement it properly (slice the output by range) rather than using it as a no-op dependency trigger.

4. **`base-table.component.ts`**: Remove the `effect(() => { dataSource(); cdr.markForCheck(); })`. In Angular 21 zoneless with Signal-based inputs, `ChangeDetectionStrategy.OnPush` + signal reactivity is sufficient. `cdr.markForCheck()` is not needed when the template reads signal-based computed properties — Angular's scheduler handles this automatically.

### File List

- `_bmad-output/implementation-artifacts/44-1-reproduce-diagnose-janky-scrolling.md` (updated — investigation notes)
