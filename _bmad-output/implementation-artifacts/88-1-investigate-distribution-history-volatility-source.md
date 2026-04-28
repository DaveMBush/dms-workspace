# Story 88.1: Investigate and Document the Distribution-History Volatility Wiring Point

Status: Approved

## Story

As a developer,
I want a complete trace of (a) where `divDeposits` is currently used to compute volatility and
(b) where `fetchDividendHistory()` is called during universe data retrieval,
so that Story 88.2 has an unambiguous refactor target and Story 88.3 has an unambiguous wiring
point that requires zero re-fetching of distribution data.

## Acceptance Criteria

1. **Given** the current server codebase,
   **When** the developer greps for `prisma.divDeposits.findMany` and inspects every hit,
   **Then** Dev Notes list every call site (file + line) that contributes to volatility
   calculation, with a one-line description of each.

2. **Given** the current server codebase,
   **When** the developer greps for `fetchDividendHistory(` and inspects every call site,
   **Then** Dev Notes list every call site (file + line), and identify the **single**
   universe-sync call site whose returned payload should drive volatility recalculation in
   Story 88.3 (without a second fetch).

3. **Given** the existing universe-sync flow,
   **When** the developer traces the call graph from the universe-sync entry point down to
   `fetchDividendHistory()`,
   **Then** the trace is documented in Dev Notes (a short call-graph or numbered list) and
   identifies the exact function that should receive the new
   `recalculateUniverseVolatilityFromHistory(symbol, history)` invocation.

4. **Given** the audit is complete,
   **When** no production code or tests are changed in this story,
   **Then** `pnpm all` passes at the same level as before this story started.

## Tasks / Subtasks

- [ ] Task 1: Inventory every `prisma.divDeposits.findMany` call site (AC: #1)
  - [ ] Run `grep_search` (or `rg`) for `prisma.divDeposits.findMany` across `apps/server/src/**`
  - [ ] For each hit, record: file path, line number, surrounding function name, one-line description
  - [ ] Flag which hits are inside the volatility module vs. unrelated (e.g. position calc, dividend display)
  - [ ] Write the full inventory into Dev Notes under "divDeposits Volatility Call Site Inventory"

- [ ] Task 2: Inventory every `fetchDividendHistory(` call site (AC: #2)
  - [ ] Run `grep_search` for `fetchDividendHistory(` across `apps/server/src/**` (exclude `*.spec.ts` from the canonical list — note them separately)
  - [ ] For each non-test hit, record: file path, line number, calling function, what it does with the returned `ProcessedRow[]`
  - [ ] Identify the **one** call site that runs as part of the universe-sync flow (the one whose `symbol` argument corresponds to a universe row being inserted/updated)
  - [ ] Write the inventory into Dev Notes under "fetchDividendHistory Call Site Inventory" and explicitly mark the chosen wiring-point call site

- [ ] Task 3: Trace the universe-sync call graph from entry point to `fetchDividendHistory` (AC: #3)
  - [ ] Start at `apps/server/src/app/routes/universe/sync-from-screener/index.ts` (the sync HTTP route entry)
  - [ ] Follow the per-symbol path: route handler → `upsertUniverse` → `getDistributions(symbol)` → `fetchDividendHistory(symbol)`
  - [ ] Document the call graph as a numbered list in Dev Notes under "Universe-Sync Call Graph to `fetchDividendHistory`"
  - [ ] Identify the exact function (e.g. `upsertUniverse` or `getDistributions`) that should be modified in Story 88.3 to (a) capture the already-fetched payload and (b) invoke the refactored `recalculateUniverseVolatility(universeId, history)`
  - [ ] Note any complications: caller currently discards rows after computing distribution metadata; whether the payload needs to be returned alongside `DistributionResult`; whether `getDistributions` falls back to Yahoo Finance and what that means for the wiring point

- [ ] Task 4: Identify all `recalculateUniverseVolatility` callers that will need updating in Story 88.3 (AC: #2, #3)
  - [ ] Run `grep_search` for `recalculateUniverseVolatility` across `apps/server/src/**`
  - [ ] For each non-test caller, record: file path, line number, what triggered the call, whether the caller already has access to a freshly-fetched history payload or would need to fetch one
  - [ ] Document under "recalculateUniverseVolatility Caller Inventory"

- [ ] Task 5: Confirm zero code/test changes and run `pnpm all` (AC: #4)
  - [ ] Run `git status` — only this story file should be modified
  - [ ] Run `pnpm all` and record the result; if any pre-existing failures exist, note them so Stories 88.2/88.3 are not blamed for them later

## Dev Notes

### Why This Story Exists

Five prior epics around volatility (81, 84, 85, 86) all touched the same code paths and each
made narrow assumptions about where data comes from. Epic 88 changes the **data source** for
volatility from `divDeposits` (which only exists for held symbols) to the
`dividendhistory.net` payload fetched during universe sync (which exists for **every**
universe symbol). Before refactoring, we need an unambiguous map of the current wiring so
Story 88.2 (refactor) and Story 88.3 (wire) each have a single, agreed target.

**This story is read-only.** No production code or test changes. The deliverable is the
Dev Notes section of this file, fully populated.

### Known Starting Points (Pre-Investigation)

The investigator should treat the following as starting hints, not as a final answer — verify
each by reading the code.

#### Suspected `prisma.divDeposits.findMany` volatility call sites

| File | Line (approx) | Role |
| --- | --- | --- |
| `apps/server/src/app/volatility/recalculate-universe-volatility.function.ts` | ~42 | Per-symbol recalc entry point (Story 85.2) — must be refactored in Story 88.2 |
| `apps/server/src/app/volatility/volatility-query.function.ts` | ~78 | `fetchVolatilityForAllSymbols()` — feeds the legacy `/api/universe/volatility` endpoint (Story 85.3 made it redundant for the Vol column) |

Other matches in `*.spec.ts` files are test mocks and are part of the refactor in Story 88.2,
not new call sites.

#### Suspected `fetchDividendHistory` call sites

| File | Line (approx) | Role | Wiring candidate? |
| --- | --- | --- | --- |
| `apps/server/src/app/routes/common/dividend-history.service.ts` | ~168 | Definition (`export async function fetchDividendHistory`) | n/a |
| `apps/server/src/app/routes/settings/common/get-distributions.function.ts` | ~110 | Used by `getDistributions(symbol)` — called on every per-symbol step of universe sync | **YES** — the universe-sync wiring point |
| `apps/server/src/app/routes/screener/get-consistent-distributions.function.ts` | ~66 | Used by screener's "consistent distributions" check — separate flow, not universe sync | No (different flow; keep an eye on it for a follow-up) |

The investigator must confirm the count via `grep_search` and rule on each match.

#### Suspected universe-sync call graph

```
POST /api/sync-from-screener
  → apps/server/src/app/routes/universe/sync-from-screener/index.ts
      → selectEligibleScreener(...)
      → for each {symbol, riskGroupId}:
          → upsertUniverse({ symbol, riskGroupId })            ← per-symbol step
              → prisma.universe.findFirst(...)
              → getLastPrice(symbol)
              → getDistributions(symbol)                       ← calls fetchDividendHistory inside
                  → fetchDividendHistory(symbol)               ← ⭐ the payload we want to reuse
              → updateExistingUniverseRecord(...) OR createNewUniverseRecord(...)
              → recalculateUniverseVolatility(<id>)            ← currently re-queries divDeposits
```

The wiring decision Story 88.3 must make: **either** modify `getDistributions` to return the
raw history rows alongside `DistributionResult`, **or** call `fetchDividendHistory` directly
from `upsertUniverse` (and refactor `getDistributions` to accept rows). The investigator
should pick one and justify in Dev Notes.

#### Suspected `recalculateUniverseVolatility` callers (from Story 85.2)

| File | Line (approx) | Trigger |
| --- | --- | --- |
| `apps/server/src/app/routes/universe/sync-from-screener/index.ts` | ~72, ~83 | Per-symbol upsert (this story is the prime wiring point) |
| `apps/server/src/app/routes/universe/index.ts` | ~241 | PATCH universe route |
| `apps/server/src/app/routes/universe/add-symbol/add-symbol.function.ts` | ~153 | Add-symbol route |

All three callers will need to be updated in Story 88.3 to pass a history payload, since the
refactored function (Story 88.2) will require one.

### Required Dev Notes Sections (the deliverables of this story)

The investigator must populate, in this file, the following sections:

1. **divDeposits Volatility Call Site Inventory** — table of every `prisma.divDeposits.findMany` call site that contributes to volatility, with file/line/description
2. **fetchDividendHistory Call Site Inventory** — table of every `fetchDividendHistory(` call site, with the universe-sync wiring point clearly flagged
3. **Universe-Sync Call Graph to `fetchDividendHistory`** — numbered list from sync route entry → `fetchDividendHistory(symbol)`
4. **Recommended Story 88.3 Wiring Point** — single chosen function + justification + a one-paragraph sketch of how the payload will be passed
5. **recalculateUniverseVolatility Caller Inventory** — every non-test caller and whether each already has access to a fresh history payload
6. **Pre-Story `pnpm all` Status** — pass/fail and any pre-existing failures to ignore in Story 88.2/88.3

### Constraints

- **No production-code changes.** No file in `apps/server/src/**` (or anywhere else outside this story file) may be modified.
- **No test changes.** No `*.spec.ts` file may be added, deleted, or edited.
- **Use `grep_search`** (workspace tool) over `grep`/`rg` in terminals — it's faster and the results are easier to cite.
- **Cite line numbers** in the Dev Notes inventory tables — they will be stale by the time the next story runs but they pin down the function in the file's history.

### Useful Commands

```bash
pnpm all                 # Confirm baseline still passes after no changes
git status               # Confirm only this story file is modified
```

### References

- [apps/server/src/app/volatility/recalculate-universe-volatility.function.ts](apps/server/src/app/volatility/recalculate-universe-volatility.function.ts) — Current `divDeposits`-based recalc (refactor target for Story 88.2)
- [apps/server/src/app/volatility/volatility-query.function.ts](apps/server/src/app/volatility/volatility-query.function.ts) — Legacy `fetchVolatilityForAllSymbols` (decide fate in Story 88.2)
- [apps/server/src/app/routes/universe/sync-from-screener/index.ts](apps/server/src/app/routes/universe/sync-from-screener/index.ts) — Universe-sync entry; contains existing `recalculateUniverseVolatility` calls
- [apps/server/src/app/routes/settings/common/get-distributions.function.ts](apps/server/src/app/routes/settings/common/get-distributions.function.ts) — Wraps `fetchDividendHistory(symbol)`
- [apps/server/src/app/routes/common/dividend-history.service.ts](apps/server/src/app/routes/common/dividend-history.service.ts) — `fetchDividendHistory` definition; returns `ProcessedRow[]` (`{ amount, date }`)
- [apps/server/src/app/routes/universe/add-symbol/add-symbol.function.ts](apps/server/src/app/routes/universe/add-symbol/add-symbol.function.ts) — Existing recalc trigger (Story 85.2)
- [apps/server/src/app/routes/universe/index.ts](apps/server/src/app/routes/universe/index.ts) — PATCH route recalc trigger (Story 85.2)
- [_bmad-output/planning-artifacts/epics-2026-04-28.md](_bmad-output/planning-artifacts/epics-2026-04-28.md) — Source epic (Epic 88, Story 88.1)
- [_bmad-output/implementation-artifacts/85-2-wire-volatility-recalculation-triggers.md](_bmad-output/implementation-artifacts/85-2-wire-volatility-recalculation-triggers.md) — Established the existing trigger wiring this story will replace

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
