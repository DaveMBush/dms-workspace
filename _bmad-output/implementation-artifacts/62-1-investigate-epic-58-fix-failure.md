# Story 62.1: Investigate Why Epic 58 Fix Failed and Write New Failing Regression Test

Status: Approved

## Story

As a developer,
I want to understand exactly why `distributions_per_year` is still defaulting to 1 for newly-added
symbols despite the fix shipped in Story 58.2,
so that I can design a targeted, lasting fix in Story 62.2 without repeating the same mistake.

## Acceptance Criteria

1. **Given** the current production code for `calculateDistributionsPerYear` and its callers has
   been read,
   **When** the developer traces the code path executed when a new symbol is added,
   **Then** the investigation report identifies: (a) whether the Story 58.2 fix is present and
   reachable, (b) which branch is still returning 1, and (c) what data shape triggers the wrong
   branch.

2. **Given** the Playwright MCP server is used to add a known monthly payer (e.g. OXLC) via the +
   button,
   **When** the symbol is added and its record is retrieved from the API,
   **Then** the MCP server confirms that `distributions_per_year` is 1 (not 12), reproducing
   the bug.

3. **Given** the root cause is identified,
   **When** a failing unit test is written in `get-distributions.function.spec.ts`,
   **Then** the test exercises the **production-accurate** data shape (i.e. `mockFetchDividendHistory`
   returns only past rows, as the real `fetchDividendHistory` filters future rows before returning)
   and currently **FAILS** (confirming the regression persists after Epic 58).

4. **Given** all other existing tests are unmodified,
   **When** `pnpm all` runs,
   **Then** all previously passing tests continue to pass.

## Definition of Done

- [ ] Full code path from symbol-add to `distributions_per_year` storage traced and documented in
      Dev Agent Record
- [ ] Playwright MCP server used to add a known monthly and weekly payer and confirm the stored
      `distributions_per_year` value is wrong
- [ ] Failing unit test added that exercises the production-accurate scenario (only past rows
      returned by the mock, mirroring real `fetchDividendHistory` behaviour) and uses
      `test.fails()` so `pnpm all` still passes
- [ ] No production code changed in this story
- [ ] `pnpm all` passes

## Tasks / Subtasks

- [ ] Task 1: Read and trace the full distribution pipeline (AC: #1)
  - [ ] Subtask 1.1: Read `apps/server/src/app/routes/settings/common/get-distributions.function.ts`
        — note both Path A (`rows.length <= 1`) and the Story 58.2 future-rows fallback
  - [ ] Subtask 1.2: Read `apps/server/src/app/routes/common/dividend-history.service.ts` — locate
        the `filterPastRows` predicate that calls `row.date <= today` and confirm it strips ALL
        future rows before returning
  - [ ] Subtask 1.3: Read `apps/server/src/app/routes/universe/add-symbol/add-symbol.function.ts`
        — confirm the exact call chain: `addSymbol` → `fetchAndUpdatePriceData` → `getDistributions`
  - [ ] Subtask 1.4: Read `apps/server/src/app/routes/universe/fetch-and-update-price-data.function.ts`
        — confirm `getDistributions` result is stored verbatim to `distributions_per_year`

- [ ] Task 2: Reconcile Story 58.2 fix vs. production data flow (AC: #1)
  - [ ] Subtask 2.1: Note that Story 58.2 added a `futureRows` fallback in the
        `recentRows.length <= 1` branch of `calculateDistributionsPerYear`
  - [ ] Subtask 2.2: Confirm that `fetchDividendHistory` strips future rows (`row.date <= today`)
        **before** returning — so `getDistributions` never receives future rows from this source
  - [ ] Subtask 2.3: Conclude that for a new symbol with 1 past ex-date, `rows.length = 1` hits
        **Path A** (`if (rows.length <= 1) { return 1; }`) before the future-rows fallback is
        ever reached — the 58.2 fix is unreachable in production
  - [ ] Subtask 2.4: Note that the 58.2 unit tests pass because `mockFetchDividendHistory` bypasses
        the date filter and returns future rows directly — the mock does not reflect actual
        production behaviour

- [ ] Task 3: Reproduce with Playwright MCP server (AC: #2)
  - [ ] Subtask 3.1: Start the dev server and navigate to the Universe screen
  - [ ] Subtask 3.2: Click the + Add Symbol button, add `OXLC` (known monthly payer) to any risk
        group
  - [ ] Subtask 3.3: After the symbol is saved, call `GET /api/universe` or inspect the network
        response to confirm the `distributions_per_year` value stored is `1` (not `12`)
  - [ ] Subtask 3.4: Repeat with a known weekly payer (e.g. `MSTY`) and confirm it also stores
        `distributions_per_year = 1` (not `52`)
  - [ ] Subtask 3.5: Document the MCP session screenshots / network responses in the Dev Agent
        Record
  - [ ] Subtask 3.6: Remove the test symbols after verification

- [ ] Task 4: Write failing unit test using production-accurate mock (AC: #3, #4)
  - [ ] Subtask 4.1: In `get-distributions.function.spec.ts`, add a `test.fails()` test where
        `mockFetchDividendHistory` returns exactly **1 past row and no future rows** (matching
        what the real `fetchDividendHistory` would return for a new monthly payer) and asserts
        `distributions_per_year === 12`
  - [ ] Subtask 4.2: Add a second `test.fails()` test for a weekly payer (1 past row, no future
        rows) asserting `distributions_per_year === 52`
  - [ ] Subtask 4.3: Run `pnpm all` and confirm all tests pass (with the two new `test.fails()`
        tests counted as expected failures)

## Dev Notes

### Key Files

| File | Purpose |
|------|---------|
| `apps/server/src/app/routes/settings/common/get-distributions.function.ts` | Main distribution fetch + frequency calculation — contains `calculateDistributionsPerYear` with Story 58.2 fix |
| `apps/server/src/app/routes/settings/common/get-distributions.function.spec.ts` | Unit tests — add new `test.fails()` tests here |
| `apps/server/src/app/routes/common/dividend-history.service.ts` | Scrapes dividendhistory.net; **filters out future rows** before returning |
| `apps/server/src/app/routes/universe/add-symbol/add-symbol.function.ts` | Calls `fetchAndUpdatePriceData` on symbol add |
| `apps/server/src/app/routes/universe/fetch-and-update-price-data.function.ts` | Calls `getDistributions(symbol)` and stores result |

### Architecture Context

The distribution pipeline flows as:

```
addSymbol()
  └─► fetchAndUpdatePriceData()
        └─► getDistributions(symbol)
              ├─► fetchDividendHistory(symbol)   ← strips future rows (row.date <= today)
              │     returns: ProcessedRow[] with dates <= today only
              └─► calculateDistributionsPerYear(rows, today)
                    Path A: if (rows.length <= 1) → return 1   ← hit for new symbols
                    Path B: if (recentRows.length <= 1) →       ← unreachable from production
                              use futureRows fallback            ← futureRows will be empty!
```

### Technical Guidance

**The 58.2 fix is correct logic but based on incorrect assumptions.**

The Story 58.2 fix added a `futureRows` fallback inside `calculateDistributionsPerYear`. This
works when `rows` contains future-dated entries. However, `fetchDividendHistory` applies
`.filter(row => row.date <= today)` before returning, so `rows` passed to
`calculateDistributionsPerYear` will **never** contain future rows from the primary data source.

In production, a new symbol with 1 past ex-date triggers **Path A** (`rows.length === 1`) and
returns 1 — the future-rows fallback on Path B is never reached.

The Story 58.2 unit tests avoided this because `mockFetchDividendHistory` bypasses the date
filter entirely and can return mixed past/future rows to `getDistributions`. The tests pass (and
passed the story DoD) but do not model what production actually does.

**Correct failing test structure for 62.1:**
```ts
// BAD (Story 58.2 approach — mock does not reflect production):
mockFetchDividendHistory.mockResolvedValueOnce([
  { amount: 0.25, date: new Date('2025-08-15') }, // past
  { amount: 0.25, date: new Date('2025-09-15') }, // future ← stripped in production!
]);

// CORRECT (production-accurate):
mockFetchDividendHistory.mockResolvedValueOnce([
  { amount: 0.25, date: new Date('2025-08-15') }, // only 1 past row — no future rows
]);
// In production, fetchDividendHistory strips future rows before returning.
// rows.length === 1 → calculateDistributionsPerYear Path A → returns 1.
```

**Named test identifiers to use (per project naming convention):**
- `BUG(62-1): monthly payer with 1 past row (no futures) — production-accurate — returns 1 instead of 12`
- `BUG(62-1): weekly payer with 1 past row (no futures) — production-accurate — returns 1 instead of 52`

Both must use `test.fails()` so `pnpm all` continues to pass.

### Testing Standards

- Unit tests: Vitest in same directory as source file
- `globals: true` is set — no `import { describe, it, expect }` needed
- Use `test.fails()` for intentionally failing regression tests per project convention (see
  Story 58.1 precedent)
- `pnpm all` must pass

### Project Structure Notes

- No production code changes in this story — investigation and test-writing only
- Named functions required everywhere (ESLint `@smarttools/no-anonymous-functions`)
- The existing 58.1/58.2 tests in the spec MUST NOT be modified
- Test naming must include the story number prefix: `BUG(62-1): ...`

### References

- Source: `_bmad-output/planning-artifacts/epics-2026-04-10.md#Story 62.1`
- Reference: `_bmad-output/implementation-artifacts/58-1-investigate-distribution-history-new-symbols.md`
- Reference: `_bmad-output/implementation-artifacts/58-2-fix-distribution-frequency-new-symbols.md`

## Dev Agent Record

### Agent Model Used

_[to be filled by dev agent]_

### Debug Log References

### Completion Notes List

### File List
