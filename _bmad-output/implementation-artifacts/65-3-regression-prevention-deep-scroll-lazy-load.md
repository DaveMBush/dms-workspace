# Story 65.3: Add Regression Prevention Tests for Deep-Scroll Lazy Load

Status: Approved

## Story

As a developer,
I want a Playwright regression suite that covers multi-page lazy-load scrolling patterns,
so that any future regression in the deep-scroll path is caught immediately in CI.

## Acceptance Criteria

1. **Given** the regression-prevention suite runs against the Universe screen,
   **When** the user scrolls across multiple lazy-load boundaries in various patterns (incremental,
   fast, sort-change then scroll),
   **Then** all test cases pass — no empty symbol cells appear.

2. **Given** the suite covers the deep-scroll failure mode from Epic 65,
   **When** a future change re-introduces empty symbol cells on deep scroll,
   **Then** at least one test in the suite fails before the change ships.

3. **Given** all changes are applied,
   **When** `pnpm all` runs,
   **Then** all tests pass with no regressions.

## Definition of Done

- [ ] Playwright tests added to `universe-lazy-load-deep-scroll.spec.ts` for: incremental scroll across ≥ 3 lazy-load pages, fast scroll to bottom, sort-change followed by deep scroll
- [ ] Tests assert all visible symbol cells are non-empty after each scroll pattern
- [ ] Tests include a descriptive comment explaining the root-cause fixed in Story 65.2 so future maintainers understand the intent
- [ ] All new tests pass green
- [ ] `pnpm run e2e:dms-material:chromium` passes
- [ ] `pnpm all` passes

## Tasks / Subtasks

- [ ] Task 1: Extend `universe-lazy-load-deep-scroll.spec.ts` with additional regression scenarios (AC: #1, #2)
  - [ ] Subtask 1.1: Add test — **fast scroll to bottom**: scroll the CDK viewport to `scrollHeight` in one jump (mirrors `scrollViewportToBottom` from `universe-scrolling-regression.spec.ts`); wait for `networkidle`; assert all visible symbol cells non-empty
  - [ ] Subtask 1.2: Add test — **sort change then deep scroll**: click a column header (e.g. `Yield %`) to trigger a new sort; wait for `networkidle`; then scroll incrementally to the bottom; assert all visible symbol cells non-empty after scrolling through each page boundary
  - [ ] Subtask 1.3: Add test — **repeated incremental deep scroll**: scroll page 1 → page 2 → page 3 → back to top → back to bottom; assert non-empty cells at every landing point
  - [ ] Subtask 1.4: Add test — **filter then deep scroll**: apply a symbol text filter that matches all seeded rows (e.g. type the shared prefix `UDSCRL` in the symbol search input); scroll to the bottom; assert non-empty cells

- [ ] Task 2: Add root-cause reference comment to the test file (AC: #2)
  - [ ] Subtask 2.1: Add a file-level JSDoc block to `universe-lazy-load-deep-scroll.spec.ts` referencing:
    - The structural tension between sort-stability (Epics 55/56: placeholder rows at top) and CDK height-stability (Epics 29/31/44/60/65: placeholder rows must stay in array)
    - The specific fix applied in Story 65.2 and what it changed
    - The `TOP_PAGE_SIZE = 50` boundary (150 rows = 3 pages)
    - The `excludeLoadingRows` filter history

- [ ] Task 3: Verify interaction with existing regression suites (AC: #3)
  - [ ] Subtask 3.1: Run `universe-scrolling-regression.spec.ts` (Epic 60 guard) in full to confirm the Story 65.2 fix did not re-introduce fast-scroll jank
  - [ ] Subtask 3.2: Run `universe-symbol-sort-empty-rows.spec.ts` (Epic 56 guard) to confirm placeholder rows are still not clustering at the top of symbol-ascending sort
  - [ ] Subtask 3.3: Run `universe-duplicate-symbols.spec.ts` (Epic 55 guard) to confirm no duplicate rows appear after the fix

- [ ] Task 4: Run full suite (AC: #3)
  - [ ] Subtask 4.1: `pnpm run e2e:dms-material:chromium` — all tests must pass
  - [ ] Subtask 4.2: `pnpm all` — full lint + build + unit test + e2e must pass

## Dev Notes

### Key Files

| File | Purpose |
|------|---------|
| `apps/dms-material-e2e/src/universe-lazy-load-deep-scroll.spec.ts` | Primary file — created in Story 65.1; extended here |
| `apps/dms-material-e2e/src/helpers/seed-deep-scroll-universe-data.helper.ts` | Seed helper (150 rows) — created in Story 65.1 |
| `apps/dms-material-e2e/src/universe-scrolling-regression.spec.ts` | Epic 60 / 64 regression guard — must not regress |
| `apps/dms-material-e2e/src/universe-symbol-sort-empty-rows.spec.ts` | Epic 56 regression guard — must not regress |
| `apps/dms-material-e2e/src/universe-duplicate-symbols.spec.ts` | Epic 55 regression guard — must not regress |
| `apps/dms-material-e2e/src/helpers/login.helper.ts` | Login helper used by all Universe E2E tests |

### Architecture Context

**Regression coverage map:**

| Epic | Defect | Guard test file |
|------|--------|-----------------|
| 29 | `rowHeight` mismatch → CDK viewport jump | `universe-scrolling-regression.spec.ts` |
| 31 | `contain: strict` → sticky header position reset | `universe-scrolling-regression.spec.ts` |
| 44 | CSS `will-change: transform` paint thrashing | `universe-scrolling-regression.spec.ts` |
| 55 | Duplicate symbol rows after sort | `universe-duplicate-symbols.spec.ts` |
| 56 | Empty symbol cells at top on symbol-asc sort | `universe-symbol-sort-empty-rows.spec.ts` |
| 60 | `isLoading→null` array shrink → viewport jump on fast scroll | `universe-scrolling-regression.spec.ts` |
| 64 | Round 5 recurrence of Epic 60 pattern | `universe-scrolling-regression.spec.ts` |
| **65** | Multi-page lazy-load: rows at end stay empty after deep scroll | **`universe-lazy-load-deep-scroll.spec.ts`** (this story) |

**Test pattern to follow (from `universe-scrolling-regression.spec.ts`):**

```typescript
// Re-use these helpers (import from the spec file or extract to a shared helper):
// - assertVisibleSymbolsNonEmpty(page, failureMessage) — polls until no empty symbol cells
// - scrollViewportToBottom(viewport) — evaluate scrollHeight jump
// - scrollViewportToTop(viewport) — evaluate scrollTop=0

// For deep scroll (incremental page-by-page):
async function scrollToFraction(viewport: Locator, fraction: number): Promise<void> {
  await viewport.evaluate(function setFraction(node: Element, f: number): void {
    (node as HTMLElement).scrollTop = node.scrollHeight * f;
  }, fraction);
}
// await scrollToFraction(viewport, 0.33);  // end of page 1
// await scrollToFraction(viewport, 0.66);  // end of page 2
// await scrollToFraction(viewport, 1.0);   // end of page 3
```

**Sort-change + deep scroll pattern (from `universe-scrolling-regression.spec.ts`):**

```typescript
const yieldHeader = page.getByRole('button', { name: 'Yield %' });
await yieldHeader.click();
await page.waitForTimeout(100);
await page.waitForLoadState('networkidle');
// then scroll incrementally
```

**Symbol filter pattern:**

```typescript
const symbolInput = page.locator('input[placeholder="Search Symbol"]');
await expect(symbolInput).toBeVisible({ timeout: 10000 });
await symbolInput.fill('UDSCRL');  // matches all 150 seeded rows
await page.waitForTimeout(100);
await page.waitForLoadState('networkidle');
```

**Network interception to confirm page 2/3 requests (optional diagnostic helper in tests):**

```typescript
const indexRequests: number[] = [];
page.on('request', function captureIndexRequests(req) {
  if (req.url().includes('/api/top/indexes')) {
    const body = req.postDataJSON() as { startIndex: number };
    indexRequests.push(body.startIndex);
  }
});
// After scrolling:
expect(indexRequests.length).toBeGreaterThan(0); // pages 2+ were requested
```

**`assertVisibleSymbolsNonEmpty` timeout:** The default 10 s timeout in `universe-scrolling-regression.spec.ts` may need to be extended to 15–20 s for deep-scroll scenarios where three network round-trips (page 1 → page 2 → page 3 ID fetch, then entity fetch) must all complete. Adjust the `timeout` parameter to `expect.poll` accordingly.

**Seed uniqueness:** The `UDSCRL` prefix seeded in Story 65.1's `seed-deep-scroll-universe-data.helper.ts` does not overlap with:
- `USCRL` (60-row seeder in `seed-scroll-universe-data.helper.ts`)
- `UAAA`–`UEEE` (named symbols in `seed-universe-e2e-data.helper.ts`)
Keep this prefix for all 150 rows to enable the filter-then-scroll test case.

### Testing Standards
- Unit tests: Vitest in same directory as source file (no new unit tests needed in this story — tests are E2E only)
- E2E tests: Playwright in `apps/dms-material-e2e/src/`
- `pnpm all` must pass; `pnpm run e2e:dms-material:chromium` must pass completely

### Project Structure Notes
- All new test cases go in the existing `universe-lazy-load-deep-scroll.spec.ts` created in Story 65.1 — do not create additional spec files for this story
- Follow the `test.describe` / `test.beforeAll` / `test.afterAll` / `test.beforeEach` pattern already established in that file
- ESLint `@smarttools/no-anonymous-functions` rule applies in test files — use named functions in `.evaluate()`, `.on()`, `expect.poll()` callbacks

### References
- [Source: _bmad-output/planning-artifacts/epics-2026-04-10.md#Epic 65 — Story 65.3]
- [Source: apps/dms-material-e2e/src/universe-scrolling-regression.spec.ts]
- [Source: apps/dms-material-e2e/src/universe-lazy-load-deep-scroll.spec.ts (created in Story 65.1)]
- [Source: _bmad-output/implementation-artifacts/65-1-reproduce-unloaded-symbols-deep-scroll.md]
- [Source: _bmad-output/implementation-artifacts/65-2-fix-signal-processing-multi-page-lazy-load.md]

## Dev Agent Record

### Agent Model Used

_[to be filled by dev agent]_

### Debug Log References

### Completion Notes List

### File List
