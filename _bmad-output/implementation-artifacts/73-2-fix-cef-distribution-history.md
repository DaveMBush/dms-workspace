# Story 73.2: Fix `distributions_per_year` for Monthly-Paying CEF Symbols and Verify

Status: Approved

## Story

As a trader,
I want OXLC, NHS, DHY, CIK, and DMB to show `distributions_per_year = 12` after a universe sync,
so that the annualised yield and income calculations for these monthly-paying funds are correct.

## Acceptance Criteria

1. **Given** the root cause documented in Story 73.1,
   **When** the fix is applied to the identified location in
   `apps/server/src/app/routes/settings/common/get-distributions.function.ts` or
   `apps/server/src/app/routes/common/dividend-history.service.ts`,
   **Then** the `test.fails()` unit test added in Story 73.1 now passes (remove the
   `test.fails()` wrapper and confirm the test is green).

2. **Given** the fix is applied,
   **When** the Playwright MCP server triggers a fresh sync ("Update Universe") and the developer
   queries `distributions_per_year` for OXLC, NHS, DHY, CIK, and DMB,
   **Then** every one of the five symbols shows `distributions_per_year = 12`.

3. **Given** other symbols that already showed the correct value,
   **When** `pnpm all` runs after the fix,
   **Then** all existing distribution-related unit tests continue to pass with no regressions.

## Tasks / Subtasks

- [ ] Task 1: Read Story 73.1 Dev Agent Record and confirm root cause (AC: #1)
  - [ ] Subtask 1.1: Read the completed
        `_bmad-output/implementation-artifacts/73-1-investigate-cef-distribution-history-bug.md`
        Dev Agent Record — locate the documented sub-case (A, B, or C) and the exact
        `rows.length` value observed for OXLC
  - [ ] Subtask 1.2: Confirm the exact name of the `test.fails()` test added in Story 73.1 in
        `apps/server/src/app/routes/settings/common/get-distributions.function.spec.ts`
  - [ ] Subtask 1.3: Re-read `apps/server/src/app/routes/settings/common/get-distributions.function.ts`
        and `apps/server/src/app/routes/common/dividend-history.service.ts` in full to refresh
        context before making changes

- [ ] Task 2: Apply the production fix (AC: #1, #2)
  - [ ] Subtask 2.1: Based on the sub-case documented in Story 73.1, apply the appropriate fix
        as detailed in the Dev Notes below — one of:
        - **Sub-case A fix** (0 rows — HTML parse failure): Update `parseDividendTable` or the
          URL construction in `dividend-history.service.ts` to correctly handle CEF ticker pages
        - **Sub-case B fix** (1 row — minimal history): Extend `calculateDistributionsPerYear` in
          `get-distributions.function.ts` to handle the single-row case for known monthly-interval
          data, or enrich `fetchDividendHistory` to include future ex-date rows from the CEF page
        - **Sub-case C fix** (sparse rows, >180-day interval): Adjust
          `calculateDistributionsPerYear` to detect CEF monthly cadence from sparse data (e.g.
          ≈30-day intervals between the available rows, regardless of apparent annual gap)
  - [ ] Subtask 2.2: Make the minimum change necessary — do not refactor unrelated logic
  - [ ] Subtask 2.3: Ensure no other calling sites of the modified function are broken

- [ ] Task 3: Remove `test.fails()` from the Story 73.1 regression test (AC: #1)
  - [ ] Subtask 3.1: In `get-distributions.function.spec.ts`, locate the test named
        `BUG(73-1): getDistributions returns distributions_per_year = 1 for CEF symbol OXLC when fetchDividendHistory provides insufficient history`
  - [ ] Subtask 3.2: Remove the `test.fails(` wrapper — change it to a plain `test(` call; keep
        the named-function form (`async function verifyCefDistributionsPerYearBug()`) and the
        `BUG(73-1):` prefix unchanged
  - [ ] Subtask 3.3: Run the single test file with `pnpm vitest run` scoped to the spec file and
        confirm the formerly-failing test is now green

- [ ] Task 4: Add a regression test for each remaining CEF symbol (AC: #2, #3)
  - [ ] Subtask 4.1: In `get-distributions.function.spec.ts`, add a `test` (not `test.fails`)
        for each of NHS, DHY, CIK, and DMB using the same stub pattern as the OXLC test — stub
        `mockFetchDividendHistory` to return the data profile that reflects the sub-case
        identified in Story 73.1 and assert `distributions_per_year === 12`
  - [ ] Subtask 4.2: Name each test with the `FIX(73-2):` prefix, e.g.
        `FIX(73-2): getDistributions returns distributions_per_year = 12 for CEF symbol NHS`
  - [ ] Subtask 4.3: Use the named-function form:
        `test('FIX(73-2): ...', async function fixNhsCefDistributionsPerYear() { ... })`

- [ ] Task 5: Playwright MCP server verification (AC: #2)
  - [ ] Subtask 5.1: Ensure the dev server is running (`apps/server` and `apps/dms-material`)
  - [ ] Subtask 5.2: Navigate to the Universe screen and trigger "Update Universe" — wait for the
        overlay to disappear
  - [ ] Subtask 5.3: Query `distributions_per_year` for OXLC, NHS, DHY, CIK, and DMB — either
        via the Universe table UI or a direct API / database call
  - [ ] Subtask 5.4: Confirm every one of the five symbols shows `distributions_per_year = 12`
        and record the values in the Dev Agent Record
  - [ ] Subtask 5.5: If any symbol still shows `1`, re-read the fix applied in Task 2 and check
        whether the fix covered the correct code path for that symbol's specific failure mode

- [ ] Task 6: Full regression check (AC: #3)
  - [ ] Subtask 6.1: Run `pnpm all` and confirm all tests pass
  - [ ] Subtask 6.2: Pay special attention to the `get-distributions` describe block and any
        `sync-from-screener` unit tests — ensure no previously-passing test is now failing
  - [ ] Subtask 6.3: Record the `pnpm all` result in the Dev Agent Record

## Dev Notes

### Key Files

| File | Purpose |
|------|---------|
| `apps/server/src/app/routes/settings/common/get-distributions.function.ts` | `getDistributions` and `calculateDistributionsPerYear` — most likely fix location for Sub-case B/C |
| `apps/server/src/app/routes/settings/common/get-distributions.function.spec.ts` | Remove `test.fails()` from Story 73.1 test; add new regression tests for NHS/DHY/CIK/DMB |
| `apps/server/src/app/routes/common/dividend-history.service.ts` | `fetchDividendHistory` and `parseDividendTable` — fix location for Sub-case A (HTML parse failure) |
| `apps/server/src/app/routes/universe/sync-from-screener/index.ts` | Epic 71 fix confirmed in place — `distributions_per_year` write path is correct; do NOT touch |
| `_bmad-output/implementation-artifacts/73-1-investigate-cef-distribution-history-bug.md` | MUST READ first — contains the confirmed sub-case and `rows.length` value for OXLC |

### Architecture Context

**The Epic 71 write path is already correct.** `updateExistingUniverseRecord` in
`sync-from-screener/index.ts` already contains:

```ts
distributions_per_year:
  distribution?.distributions_per_year ?? existing.distributions_per_year,
```

The bug is entirely **upstream** — `getDistributions` returns either `undefined` or
`{ distributions_per_year: 1 }` for the 5 CEF symbols. Story 73.1 identified which of the
following sub-cases is actually occurring:

---

**Sub-case A — HTML parse failure (0 rows returned by `fetchDividendHistory`):**

`parseDividendTable` in `dividend-history.service.ts` searches for a table with CSS class
`table table-bordered`:

```ts
const tableRegex =
  /<table[^>]*class="[^"]*table[^"]*table-bordered[^"]*"[^>]*>([\s\S]*?)<\/table>/gi;
```

If dividendhistory.net renders CEF pages with a different table class (e.g. `table-striped` or
a plain `table` without `table-bordered`), this regex matches nothing, `parseDividendTable`
returns `null`, and `fetchDividendHistory` returns `[]`. The Yahoo Finance fallback
(`fetchDistributionData`) is a stub that also returns `[]`, so `getDistributions` returns
`undefined`, and the `??` fallback in the update path preserves the stale DB value of `1`.

**Fix for Sub-case A:**
1. If Story 73.1 documents which alternative CSS class the CEF page uses, update the `tableRegex`
   in `parseDividendTable` (in `dividend-history.service.ts`) to also match that class.
2. If Story 73.1 documents a different URL slug for CEF tickers (e.g. a prefix or suffix not
   present in the current pattern), update the URL construction in `fetchDividendHistory`.
3. Apply the minimum change — prefer broadening the regex over adding CEF-specific branching.

Example broadened regex (if the class is just `table` without `table-bordered`):
```ts
const tableRegex =
  /<table[^>]*class="[^"]*table\b[^"]*"[^>]*>([\s\S]*?)<\/table>/gi;
```
Only apply the exact change that matches the actual CEF page HTML observed in Story 73.1.

---

**Sub-case B — Single row returned (minimal history):**

`calculateDistributionsPerYear` in `get-distributions.function.ts` has this guard:

```ts
if (rows.length <= 1) {
  return 1;
}
```

If `fetchDividendHistory` successfully parses the CEF page but returns only 1 row (e.g. only the
most recent distribution with no historical data), this guard fires before any interval
calculation is possible.

**Fix for Sub-case B:** Story 73.1 should document the actual row data returned. If the CEF page
returns 1 past row and 1+ future rows, ensure the future rows are not being discarded.
`fetchDividendHistory` in `dividend-history.service.ts` does **not** currently filter out future
rows — it returns all valid rows sorted ascending by date. If only 1 total row is present, a
targeted fix could be:
- Fetch the CEF-specific distribution frequency from a second column on the dividendhistory.net
  page (if available)
- Or widen the history window by adjusting how many rows are fetched from the source

However, the preferred fix for Sub-case B is to verify whether the page actually **does** have
multiple rows and whether the HTML parser is simply not extracting them (reducing it to Sub-case A
with partial parse success).

---

**Sub-case C — Sparse rows with intervals >180 days:**

If the page returns ≥2 rows but the gap between the two most recent past rows is >180 days (e.g.
end-of-year data sparsity for a CEF paying monthly), `intervalToDistributionsPerYear` returns `1`.

**Fix for Sub-case C:** The `calculateDistributionsPerYear` function already uses only the last 2
past rows (`recentRows`). A sparse CEF history should not produce >180-day gaps between consecutive
monthly distributions unless only annual summary rows are present. If this is the confirmed
sub-case, consider using a rolling window of more past rows (e.g. last 3) and computing the
average interval.

---

**Sync path for reference (Epic 71 fix applied):**

```
POST /api/universe/sync-from-screener
  └─► upsertUniverse({ symbol, riskGroupId })
        └─► getDistributions(symbol)
              └─► fetchDividendHistory(symbol)          ← fix targets here (Sub-case A/B)
                    └─► fetch https://dividendhistory.net/{ticker}-dividend-yield
                          └─► parseDividendTable(html)  ← or here (Sub-case A — regex)
              └─► if rows.length === 0:
                    fetchDistributionData(symbol)       ← stub; always returns []
              └─► calculateDistributionsPerYear(rows)  ← or here (Sub-case B/C)
                    └─► if rows.length <= 1 → return 1  ← PATH A
        └─► updateExistingUniverseRecord(...)
              └─► prisma.universe.update({
                    distributions_per_year:
                      distribution?.distributions_per_year  ← correct (Epic 71)
                        ?? existing.distributions_per_year
                  })
```

---

### Test Pattern

**Removing `test.fails()` from the Story 73.1 regression test:**

```ts
// BEFORE (Story 73.1 — intentionally failing):
test.fails(
  'BUG(73-1): getDistributions returns distributions_per_year = 1 for CEF symbol OXLC when fetchDividendHistory provides insufficient history',
  async function verifyCefDistributionsPerYearBug() {
    mockFetchDividendHistory.mockResolvedValueOnce([]);
    mockFetchDistributionData.mockResolvedValueOnce([]);
    const result = await getDistributions('OXLC');
    expect(result?.distributions_per_year).toBe(12);
  }
);

// AFTER (Story 73.2 — now passing):
test(
  'BUG(73-1): getDistributions returns distributions_per_year = 1 for CEF symbol OXLC when fetchDividendHistory provides insufficient history',
  async function verifyCefDistributionsPerYearBug() {
    // Update the stub to reflect what the fix actually causes fetchDividendHistory to return
    // for OXLC — e.g. for Sub-case A fix: the repaired parser now returns rows:
    mockFetchDividendHistory.mockResolvedValueOnce([
      { amount: 0.08, date: new Date('2025-07-14') },
      { amount: 0.08, date: new Date('2025-08-14') },
    ]);
    const result = await getDistributions('OXLC');
    expect(result?.distributions_per_year).toBe(12);
  }
);
```

**Important:** The stub in the promoted test must reflect the **post-fix** data profile. If the
fix changes what `fetchDividendHistory` returns for OXLC (e.g. now returns rows instead of `[]`),
update `mockFetchDividendHistory` to match, and remove the `mockFetchDistributionData` stub if the
fallback path is no longer triggered.

**New regression tests for NHS, DHY, CIK, DMB:**

```ts
test(
  'FIX(73-2): getDistributions returns distributions_per_year = 12 for CEF symbol NHS',
  async function fixNhsCefDistributionsPerYear() {
    // Use same stub profile as the OXLC fix test
    mockFetchDividendHistory.mockResolvedValueOnce([
      { amount: 0.05, date: new Date('2025-07-14') },
      { amount: 0.05, date: new Date('2025-08-14') },
    ]);
    const result = await getDistributions('NHS');
    expect(result?.distributions_per_year).toBe(12);
  }
);
// Repeat for DHY, CIK, DMB — adjust amounts to realistic values for each symbol
```

### Testing Standards

- Unit tests: Vitest in same directory as source file
- `globals: true` is **not** set in this spec file — `import { ..., vi }` is used at the top
- The existing `mockFetchDividendHistory` and `mockFetchDistributionData` hoisted mocks are
  already in scope — do not re-declare them
- Named functions required everywhere (ESLint `@smarttools/no-anonymous-functions`)
- Test naming: promoted test keeps the `BUG(73-1):` prefix; new regression tests use `FIX(73-2):`
- `pnpm all` must pass with zero failures after promotng the `test.fails()` to a plain `test`

### References

- [73-1-investigate-cef-distribution-history-bug.md](_bmad-output/implementation-artifacts/73-1-investigate-cef-distribution-history-bug.md) — MUST READ: root cause sub-case and confirmed `rows.length`
- [62-2-fix-distribution-frequency-comprehensive.md](_bmad-output/implementation-artifacts/62-2-fix-distribution-frequency-comprehensive.md) — prior similar fix for reference
- [get-distributions.function.ts](apps/server/src/app/routes/settings/common/get-distributions.function.ts)
- [get-distributions.function.spec.ts](apps/server/src/app/routes/settings/common/get-distributions.function.spec.ts)
- [dividend-history.service.ts](apps/server/src/app/routes/common/dividend-history.service.ts)
- [sync-from-screener/index.ts](apps/server/src/app/routes/universe/sync-from-screener/index.ts)

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
