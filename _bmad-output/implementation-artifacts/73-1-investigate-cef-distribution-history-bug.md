# Story 73.1: Investigate and Reproduce Residual Distribution History Bug for Specific CEF Symbols

Status: Approved

## Story

As a developer,
I want to trace why OXLC, NHS, DHY, CIK, and DMB still show `distributions_per_year = 1` after
sync even though Epic 71's fix is in place,
so that I can design a targeted fix in Story 73.2 without guessing.

## Acceptance Criteria

1. **Given** the Playwright MCP server is connected to the running application,
   **When** the developer navigates to the Universe screen and clicks "Update Universe" to trigger
   a sync, then waits for the overlay to disappear,
   **Then** the developer queries `distributions_per_year` for OXLC, NHS, DHY, CIK, and DMB (via
   a direct database/API call or by inspecting the Universe table) and records which symbols
   still show `1`.

2. **Given** the symbols confirmed to still show `1`,
   **When** the developer adds targeted `console.log` instrumentation to
   `apps/server/src/app/routes/settings/common/get-distributions.function.ts` and traces what
   value `getDistributions` returns for one of the failing symbols (e.g. OXLC) during a sync run,
   **Then** the returned `distributions_per_year` value is documented in Dev Notes (either
   confirming `getDistributions` itself returns 1, or confirming it returns `undefined` and the
   `??` fallback in `updateExistingUniverseRecord` preserves the stale stored value of 1).

3. **Given** the root cause is identified,
   **When** a failing unit test is added to
   `apps/server/src/app/routes/settings/common/get-distributions.function.spec.ts` that stubs
   `fetchDividendHistory` to return the data profile observed for a failing CEF symbol and
   asserts `distributions_per_year` should be `12`,
   **Then** the test currently **FAILS**, confirming the bug.

4. **Given** no production code is changed in this story,
   **When** `pnpm all` runs,
   **Then** all previously passing tests continue to pass (the new failing test is marked with
   `test.fails()`).

## Tasks / Subtasks

- [ ] Task 1: Confirm Epic 71 fix is in place and identify the new root cause location (AC: #1)
  - [ ] Subtask 1.1: Read `apps/server/src/app/routes/universe/sync-from-screener/index.ts` in
        full — verify that `updateExistingUniverseRecord` uses
        `distribution?.distributions_per_year ?? existing.distributions_per_year` in the
        `prisma.universe.update` data object (this should already be fixed by Epic 71)
  - [ ] Subtask 1.2: Read `apps/server/src/app/routes/settings/common/get-distributions.function.ts`
        in full — trace `getDistributions` → `fetchDividendHistory` → `calculateDistributionsPerYear`
        and identify `Path A`: `if (rows.length <= 1) return 1`
  - [ ] Subtask 1.3: Read `apps/server/src/app/routes/common/dividend-history.service.ts` — note
        the URL pattern (`https://dividendhistory.net/{ticker}-dividend-yield`), the HTML table
        CSS selector (`table table-bordered`), and how `parseDividendTable` extracts rows
  - [ ] Subtask 1.4: Form a hypothesis about why OXLC/NHS/DHY/CIK/DMB return ≤1 rows from
        `fetchDividendHistory` — document in Dev Agent Record

- [ ] Task 2: Reproduce with Playwright MCP server (AC: #1)
  - [ ] Subtask 2.1: Start the dev server and navigate to the Universe screen
  - [ ] Subtask 2.2: Trigger the "Update Universe" sync and wait for the overlay to disappear
  - [ ] Subtask 2.3: Inspect the Universe table or call the API to read `distributions_per_year`
        for OXLC, NHS, DHY, CIK, and DMB and record which show `1`
  - [ ] Subtask 2.4: If any of the 5 symbols are not in the universe, note them and skip
  - [ ] Subtask 2.5: Document the confirmed-failing symbols in the Dev Agent Record

- [ ] Task 3: Trace `getDistributions` for a failing symbol (AC: #2)
  - [ ] Subtask 3.1: Add a temporary `console.log` before the `return` statement in
        `getDistributions` that logs `{ symbol, rows_returned: rows.length, perYear: perYear }`
        — do NOT commit this instrumentation
  - [ ] Subtask 3.2: Trigger a sync (either via Playwright MCP or by running the route handler
        directly in a test) and capture the log output for OXLC
  - [ ] Subtask 3.3: Determine which of the two sub-cases applies:
        - **Sub-case A**: `fetchDividendHistory` returns 0 rows for OXLC → `fetchDistributionData`
          stub also returns `[]` → `getDistributions` returns `undefined` → the `??` fallback
          preserves `existing.distributions_per_year: 1`
        - **Sub-case B**: `fetchDividendHistory` returns exactly 1 row → `calculateDistributionsPerYear`
          hits `rows.length <= 1` → returns `1` → `getDistributions` returns
          `{ distributions_per_year: 1, ... }`
        - **Sub-case C**: `fetchDividendHistory` returns ≥2 rows but intervals are >180 days
          (e.g. annual cadence detected due to stale/sparse data) → `intervalToDistributionsPerYear`
          returns `1`
  - [ ] Subtask 3.4: Document the exact sub-case and `rows.length` in the Dev Agent Record
  - [ ] Subtask 3.5: If it is Sub-case A (0 rows), additionally check why the HTML parsing
        fails for CEF tickers on dividendhistory.net — manually fetch
        `https://dividendhistory.net/oxlc-dividend-yield` and verify the table class matches
        `table table-bordered` (use curl or browser DevTools during the Playwright session)

- [ ] Task 4: Write failing unit test (AC: #3, #4)
  - [ ] Subtask 4.1: In `apps/server/src/app/routes/settings/common/get-distributions.function.spec.ts`,
        add a `test.fails()` test that stubs `mockFetchDividendHistory` to return the data
        profile that reflects the actual failing CEF behaviour discovered in Task 3:
        - For **Sub-case A** (0 rows): stub returns `[]` for OXLC; assert
          `result?.distributions_per_year` equals `12`
        - For **Sub-case B** (1 row): stub returns a single `ProcessedRow` with OXLC's monthly
          distribution amount; assert `result?.distributions_per_year` equals `12`
        - For **Sub-case C** (sparse rows): stub returns rows that are >180 days apart; assert
          `result?.distributions_per_year` equals `12`
  - [ ] Subtask 4.2: Name the test:
        `BUG(73-1): getDistributions returns distributions_per_year = 1 for CEF symbol OXLC when fetchDividendHistory provides insufficient history`
  - [ ] Subtask 4.3: Use the named-function form required by ESLint:
        `test.fails('BUG(73-1): ...', async function verifyCefDistributionsPerYearBug() { ... })`
  - [ ] Subtask 4.4: Run `pnpm all` and confirm all tests pass with the new `test.fails()` test
        counted as an expected failure; document the result in the Dev Agent Record

## Dev Notes

### Key Files

| File | Purpose |
|------|---------|
| `apps/server/src/app/routes/settings/common/get-distributions.function.ts` | Core investigation target — `getDistributions` and `calculateDistributionsPerYear` |
| `apps/server/src/app/routes/settings/common/get-distributions.function.spec.ts` | Add new `test.fails()` here |
| `apps/server/src/app/routes/common/dividend-history.service.ts` | `fetchDividendHistory` — CEF-specific HTML parsing may fail here |
| `apps/server/src/app/routes/common/distribution-api.function.ts` | Yahoo Finance fallback stub — returns `[]` always (removed in Story 45.1) |
| `apps/server/src/app/routes/universe/sync-from-screener/index.ts` | Epic 71 fix location — `distributions_per_year` write already present here; not the source of the new bug |

### Architecture Context

**Epic 71 fix is confirmed in place.** The `updateExistingUniverseRecord` function in
`sync-from-screener/index.ts` already includes:

```ts
distributions_per_year:
  distribution?.distributions_per_year ?? existing.distributions_per_year,
```

This means the write path is correct. The remaining bug must be **upstream** — `getDistributions`
is returning either `undefined` or `{ distributions_per_year: 1 }` for the 5 CEF symbols.

**Sync path summary (with Epic 71 fix applied):**

```
POST /api/universe/sync-from-screener
  └─► upsertUniverse({ symbol, riskGroupId })
        └─► getDistributions(symbol)
              └─► fetchDividendHistory(symbol)          ← primary source
                    └─► fetch https://dividendhistory.net/{ticker}-dividend-yield
                          └─► parseDividendTable(html)  ← parses <table class="table table-bordered">
              └─► if rows.length === 0:
                    fetchDistributionData(symbol)       ← stub, always returns []
              └─► calculateDistributionsPerYear(rows)
                    └─► if rows.length <= 1 → return 1  ← BUG PATH
        └─► updateExistingUniverseRecord(...)
              └─► prisma.universe.update({
                    distributions_per_year:
                      distribution?.distributions_per_year  ← if getDistributions returned
                        ?? existing.distributions_per_year     undefined or {dpY:1}, this
                  })                                            preserves or writes 1
```

**Why CEF symbols are suspect:**
All five symbols (OXLC, NHS, DHY, CIK, DMB) are closed-end funds. The `dividendhistory.net` URL
pattern (`/{ticker}-dividend-yield`) works for many ETFs and stocks. For CEFs, the page may:
- Use a different URL slug structure (e.g. a `-cef-` prefix or different suffix)
- Render the history table with a different CSS class
- Return `404` or a non-standard page that `parseDividendTable` returns `null` for

Since the Yahoo Finance fallback (`fetchDistributionData`) is now a stub that always returns `[]`,
any failure in `fetchDividendHistory` results in `getDistributions` returning `undefined`, and the
`??` fallback in the update path preserves whatever stale `distributions_per_year` is in the DB
(which is `1` for these 5 symbols).

**`calculateDistributionsPerYear` calculation paths:**

```
rows.length <= 1     → return 1                  ← PATH A (likely triggered for CEFs)
recentRows.length <= 1:
  cross interval     → intervalToDistributionsPerYear(daysBetween)
  futureRows < 2     → return 1
  2 future rows      → intervalToDistributionsPerYear(futureDaysBetween)
recentRows.length >= 2:
  last 2 past rows   → intervalToDistributionsPerYear(daysBetween)

intervalToDistributionsPerYear:
  ≤7 days   → 52 (weekly)
  28-45     → 12 (monthly) ← where OXLC should land (≈30 days between distributions)
  45-180    → 4  (quarterly)
  >180      → 1  (annual)
```

**`fetchDividendHistory` CEF URL and HTML details:**

The URL constructed is:
```
https://dividendhistory.net/${upperTicker.toLowerCase()}-dividend-yield
```

For OXLC this becomes: `https://dividendhistory.net/oxlc-dividend-yield`

The HTML table is selected via:
```ts
/<table[^>]*class="[^"]*table[^"]*table-bordered[^"]*"[^>]*>/
```

If the page for a CEF ticker does not contain a table with CSS classes matching `table table-bordered`
(in that order), `parseDividendTable` returns `null` → `fetchAndParseHtml` returns `null` →
`fetchDividendHistory` returns `[]`.

**Note on file path discrepancy:** The epics file references
`apps/server/src/app/services/distributions/get-distributions.function.ts` — this path does not
exist. The actual file is at
`apps/server/src/app/routes/settings/common/get-distributions.function.ts`. Use the actual path.

### Test Pattern

The failing test should go in `get-distributions.function.spec.ts`. The existing mock setup hoists
`mockFetchDividendHistory` and `mockFetchDistributionData`, so no new mock wiring is needed:

```ts
// BUG(73-1): getDistributions returns distributions_per_year = 1 for CEF symbol
// OXLC when fetchDividendHistory provides insufficient history
test.fails(
  'BUG(73-1): getDistributions returns distributions_per_year = 1 for CEF symbol OXLC when fetchDividendHistory provides insufficient history',
  async function verifyCefDistributionsPerYearBug() {
    // Adjust this stub to match the actual sub-case discovered in Task 3:
    // Sub-case A (0 rows — page parse failure):
    mockFetchDividendHistory.mockResolvedValueOnce([]);
    // Sub-case B (1 row — CEF with minimal history):
    // mockFetchDividendHistory.mockResolvedValueOnce([
    //   { amount: 0.08, date: new Date('2025-08-14') },
    // ]);
    mockFetchDistributionData.mockResolvedValueOnce([]); // stub always returns []

    const result = await getDistributions('OXLC');

    // OXLC pays monthly — dividendhistory.net confirms 12 distributions/year
    expect(result?.distributions_per_year).toBe(12);
  }
);
```

Select the correct stub based on the sub-case confirmed in Task 3 and document the choice.

### Testing Standards

- Unit tests: Vitest in same directory as source file
- `globals: true` is **not** set in this spec file — `import { ..., vi }` IS used at the top;
  do not import additional test globals; the existing `mockFetchDividendHistory` and
  `mockFetchDistributionData` hoisted mocks are already in scope
- Use `test.fails()` for intentionally failing regression tests per project convention
- `pnpm all` must pass with the new `test.fails()` test counted as an expected failure
- Named functions required everywhere (ESLint `@smarttools/no-anonymous-functions`) — use
  `async function verifyCefDistributionsPerYearBug()` form
- Test naming must include the story number prefix: `BUG(73-1): ...`
- No production code changes in this story — investigation and test-writing only

### References

- [Source: _bmad-output/planning-artifacts/epics-2026-04-13.md - Epic 73 Story 73.1]
- Reference: `_bmad-output/implementation-artifacts/71-1-investigate-sync-distribution-history.md`
- Reference: `_bmad-output/implementation-artifacts/71-2-fix-sync-from-screener-distribution-per-year.md`

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
