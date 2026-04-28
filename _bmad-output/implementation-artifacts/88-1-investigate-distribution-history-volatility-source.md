# Story 88.1: Investigate and Document the Distribution-History Volatility Wiring Point

Status: review

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

- [x] Task 1: Inventory every `prisma.divDeposits.findMany` call site (AC: #1)

  - [x] Run `grep_search` (or `rg`) for `prisma.divDeposits.findMany` across `apps/server/src/**`
  - [x] For each hit, record: file path, line number, surrounding function name, one-line description
  - [x] Flag which hits are inside the volatility module vs. unrelated (e.g. position calc, dividend display)
  - [x] Write the full inventory into Dev Notes under "divDeposits Volatility Call Site Inventory"

- [x] Task 2: Inventory every `fetchDividendHistory(` call site (AC: #2)

  - [x] Run `grep_search` for `fetchDividendHistory(` across `apps/server/src/**` (exclude `*.spec.ts` from the canonical list — note them separately)
  - [x] For each non-test hit, record: file path, line number, calling function, what it does with the returned `ProcessedRow[]`
  - [x] Identify the **one** call site that runs as part of the universe-sync flow (the one whose `symbol` argument corresponds to a universe row being inserted/updated)
  - [x] Write the inventory into Dev Notes under "fetchDividendHistory Call Site Inventory" and explicitly mark the chosen wiring-point call site

- [x] Task 3: Trace the universe-sync call graph from entry point to `fetchDividendHistory` (AC: #3)

  - [x] Start at `apps/server/src/app/routes/universe/sync-from-screener/index.ts` (the sync HTTP route entry)
  - [x] Follow the per-symbol path: route handler → `upsertUniverse` → `getDistributions(symbol)` → `fetchDividendHistory(symbol)`
  - [x] Document the call graph as a numbered list in Dev Notes under "Universe-Sync Call Graph to `fetchDividendHistory`"
  - [x] Identify the exact function (e.g. `upsertUniverse` or `getDistributions`) that should be modified in Story 88.3 to (a) capture the already-fetched payload and (b) invoke the refactored `recalculateUniverseVolatility(universeId, history)`
  - [x] Note any complications: caller currently discards rows after computing distribution metadata; whether the payload needs to be returned alongside `DistributionResult`; whether `getDistributions` falls back to Yahoo Finance and what that means for the wiring point

- [x] Task 4: Identify all `recalculateUniverseVolatility` callers that will need updating in Story 88.3 (AC: #2, #3)

  - [x] Run `grep_search` for `recalculateUniverseVolatility` across `apps/server/src/**`
  - [x] For each non-test caller, record: file path, line number, what triggered the call, whether the caller already has access to a freshly-fetched history payload or would need to fetch one
  - [x] Document under "recalculateUniverseVolatility Caller Inventory"

- [x] Task 5: Confirm zero code/test changes and run `pnpm all` (AC: #4)
  - [x] Run `git status` — only this story file should be modified
  - [x] Run `pnpm all` and record the result; if any pre-existing failures exist, note them so Stories 88.2/88.3 are not blamed for them later

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

| File                                                                         | Line (approx) | Role                                                                                                                                      |
| ---------------------------------------------------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/server/src/app/volatility/recalculate-universe-volatility.function.ts` | ~42           | Per-symbol recalc entry point (Story 85.2) — must be refactored in Story 88.2                                                             |
| `apps/server/src/app/volatility/volatility-query.function.ts`                | ~78           | `fetchVolatilityForAllSymbols()` — feeds the legacy `/api/universe/volatility` endpoint (Story 85.3 made it redundant for the Vol column) |

Other matches in `*.spec.ts` files are test mocks and are part of the refactor in Story 88.2,
not new call sites.

#### Suspected `fetchDividendHistory` call sites

| File                                                                           | Line (approx) | Role                                                                                   | Wiring candidate?                                      |
| ------------------------------------------------------------------------------ | ------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `apps/server/src/app/routes/common/dividend-history.service.ts`                | ~168          | Definition (`export async function fetchDividendHistory`)                              | n/a                                                    |
| `apps/server/src/app/routes/settings/common/get-distributions.function.ts`     | ~110          | Used by `getDistributions(symbol)` — called on every per-symbol step of universe sync  | **YES** — the universe-sync wiring point               |
| `apps/server/src/app/routes/screener/get-consistent-distributions.function.ts` | ~66           | Used by screener's "consistent distributions" check — separate flow, not universe sync | No (different flow; keep an eye on it for a follow-up) |

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

| File                                                                    | Line (approx) | Trigger                                                  |
| ----------------------------------------------------------------------- | ------------- | -------------------------------------------------------- |
| `apps/server/src/app/routes/universe/sync-from-screener/index.ts`       | ~72, ~83      | Per-symbol upsert (this story is the prime wiring point) |
| `apps/server/src/app/routes/universe/index.ts`                          | ~241          | PATCH universe route                                     |
| `apps/server/src/app/routes/universe/add-symbol/add-symbol.function.ts` | ~153          | Add-symbol route                                         |

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

---

### divDeposits Volatility Call Site Inventory

**Volatility-contributing call sites (production, inside volatility module):**

| File                                                                         | Line | Function                                    | Description                                                                                                                                                                                                                |
| ---------------------------------------------------------------------------- | ---- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/server/src/app/volatility/recalculate-universe-volatility.function.ts` | 42   | `recalculateUniverseVolatility(universeId)` | Queries `divDeposits` filtered by `universeId` + last 5 years; feeds `calculateVolatility()` to compute `volatility_long` and `volatility_short` stored on the `universe` row. **Primary refactor target for Story 88.2.** |
| `apps/server/src/app/volatility/volatility-query.function.ts`                | 78   | `fetchVolatilityForAllSymbols()`            | Bulk-queries all `divDeposits` with `universeId != null`, groups by symbol, returns a `VolatilityResult[]` that feeds the legacy `/api/universe/volatility` endpoint. **Determine fate in Story 88.2 (likely retired).**   |

**Non-volatility call sites (unrelated — dividend display / CRUD):**

| File                                                                     | Line | Description                                     |
| ------------------------------------------------------------------------ | ---- | ----------------------------------------------- |
| `apps/server/src/app/routes/accounts/build-account-response.function.ts` | 153  | Builds account position response (display only) |
| `apps/server/src/app/routes/accounts/indexes/index.ts`                   | 117  | Account indexes endpoint (display only)         |
| `apps/server/src/app/routes/div-deposits/index.ts`                       | 45   | GET handler listing div deposits                |
| `apps/server/src/app/routes/div-deposits/index.ts`                       | 109  | POST handler creating/updating div deposits     |
| `apps/server/src/app/routes/summary/years/index.ts`                      | 7    | Annual summary calculation                      |
| `apps/server/src/app/routes/summary/months/index.ts`                     | 9    | Monthly summary calculation                     |

---

### fetchDividendHistory Call Site Inventory

**Production (non-test) call sites:**

| File                                                                           | Line | Calling Function                     | What it does with `ProcessedRow[]`                                                                                                           | Universe-sync wiring point?             |
| ------------------------------------------------------------------------------ | ---- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `apps/server/src/app/routes/common/dividend-history.service.ts`                | 168  | n/a (function definition)            | n/a                                                                                                                                          | n/a                                     |
| `apps/server/src/app/routes/settings/common/get-distributions.function.ts`     | 110  | `getDistributions(symbol)`           | Uses rows to compute `DistributionResult` (`distribution`, `ex_date`, `distributions_per_year`); **raw rows are discarded** before returning | **⭐ YES — universe-sync wiring point** |
| `apps/server/src/app/routes/screener/get-consistent-distributions.function.ts` | 66   | `getConsistentDistributions(symbol)` | Checks whether the 3 most recent distributions show a declining trend                                                                        | No — separate screener-only flow        |

**Test-only call sites (not canonical):** 16 calls in `apps/server/src/app/routes/common/dividend-history.service.spec.ts` (unit tests for the service itself).

---

### Universe-Sync Call Graph to `fetchDividendHistory`

1. **HTTP POST** `/api/sync-from-screener` → registered by `registerSyncFromScreener()` in `apps/server/src/app/routes/universe/sync-from-screener/index.ts`
2. Route handler calls **`handleSyncRequest(logger)`**
3. `handleSyncRequest` calls **`processSyncTransaction(logger)`**
4. `processSyncTransaction` selects eligible screener rows, then calls **`processSymbols(selected, logger, upsertUniverse)`**
5. `processSymbols` iterates each `{ symbol, riskGroupId }` pair and calls **`upsertUniverse({ symbol, riskGroupId })`** (the per-symbol step)
6. `upsertUniverse` calls **`getDistributions(symbol)`** (from `apps/server/src/app/routes/settings/common/get-distributions.function.ts`)
7. Inside `getDistributions`: calls **`fetchDividendHistory(symbol)`** ← **⭐ the universe-sync call site whose returned payload should drive volatility in Story 88.3**

After step 7, `getDistributions` computes `DistributionResult` from the rows and returns it — raw rows are discarded. Back in `upsertUniverse`, after the upsert, **`recalculateUniverseVolatility(id)`** is called separately and currently re-queries `divDeposits` from scratch.

---

### Recommended Story 88.3 Wiring Point

**Chosen function: `getDistributions` in `apps/server/src/app/routes/settings/common/get-distributions.function.ts`**

**Justification:** `getDistributions` is the single function that owns the `fetchDividendHistory` call during universe sync. It already fetches the raw `ProcessedRow[]` and processes them — it just throws them away. Widening its return type to `{ result: DistributionResult | undefined; history: ProcessedRow[] }` (or a small wrapper interface) adds zero new I/O and zero new network calls. The caller (`upsertUniverse`) then receives `history` alongside `result` and can pass it to the refactored `recalculateUniverseVolatility(universeId, history)` (Story 88.2's new signature). This is a smaller, more cohesive change than the alternative of calling `fetchDividendHistory` directly from `upsertUniverse` and threading rows through a parallel path.

**Payload pass-through sketch:** In Story 88.3, `getDistributions` returns `{ result, history }` where `history` is the resolved `ProcessedRow[]` (whether sourced from dividendhistory.net or the Yahoo Finance fallback). `upsertUniverse` destructures both fields: it uses `result` exactly as today to populate distribution columns, and passes `history` to `recalculateUniverseVolatility(id, history)`. No second HTTP fetch is made; if `getDistributions` returned an empty history (both sources returned nothing), `recalculateUniverseVolatility` must handle an empty array gracefully (likely writing `null` volatility values).

---

### recalculateUniverseVolatility Caller Inventory

| File                                                                    | Line | Trigger                                                                                                                                                                             | Has fresh history payload?                                                                                                                                                                                                                          |
| ----------------------------------------------------------------------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/server/src/app/routes/universe/sync-from-screener/index.ts`       | 72   | `upsertUniverse` — **update path** (existing record); called immediately after `getDistributions(symbol)` fetched history internally                                                | **Conditionally YES** — once Story 88.3 modifies `getDistributions` to return rows, history is available at this call site                                                                                                                          |
| `apps/server/src/app/routes/universe/sync-from-screener/index.ts`       | 83   | `upsertUniverse` — **create path** (new record); same execution context as above                                                                                                    | **Conditionally YES** — same: history available after Story 88.3                                                                                                                                                                                    |
| `apps/server/src/app/routes/universe/add-symbol/add-symbol.function.ts` | 153  | Manual add-symbol route — creates universe record with zeroed distribution fields; `recalculateUniverseVolatility` is called immediately, then `fetchAndUpdatePriceData` runs later | **NO** — no `fetchDividendHistory` call exists in this flow before the recalc; Story 88.3 must either call `fetchDividendHistory` explicitly here, accept `null`/empty history and skip writing volatility, or leave this path on the old behaviour |
| `apps/server/src/app/routes/universe/index.ts`                          | 241  | PUT `/api/universe` route — user submits updated distribution fields from the UI; no fetch of dividend history occurs in this flow                                                  | **NO** — no history payload available; Story 88.3 must decide: fetch explicitly here, accept nil/empty history, or leave on old behaviour                                                                                                           |

---

### Pre-Story `pnpm all` Status

**Result: PASS (no tasks run — no affected files)**

Running `CI=1 pnpm all` from the worktree (`feat/story-88-1` branch, no code changes vs `main`) produced:

```
NX  Affected criteria defaulted to --base=main --head=HEAD
NX  No tasks were run
```

Since the branch introduces zero source-file changes, `nx affected` found nothing to lint, build, or test. The baseline is whatever the last passing `main` commit represents. Stories 88.2 and 88.3 must not be blamed for any pre-existing failures on `main`.

Note: `NX  Nx Cloud encountered some problems — You do not have sufficient access to this workspace` is a non-fatal Nx Cloud access warning unrelated to test outcomes.

---

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
- [\_bmad-output/planning-artifacts/epics-2026-04-28.md](_bmad-output/planning-artifacts/epics-2026-04-28.md) — Source epic (Epic 88, Story 88.1)
- [\_bmad-output/implementation-artifacts/85-2-wire-volatility-recalculation-triggers.md](_bmad-output/implementation-artifacts/85-2-wire-volatility-recalculation-triggers.md) — Established the existing trigger wiring this story will replace

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

N/A — read-only investigation; no debug sessions required.

### Completion Notes List

- Confirmed 2 volatility-contributing `prisma.divDeposits.findMany` call sites: `recalculate-universe-volatility.function.ts:42` and `volatility-query.function.ts:78`. Six additional non-volatility call sites identified and flagged as unrelated.
- Confirmed 2 non-test `fetchDividendHistory(` call sites (excluding the definition): `get-distributions.function.ts:110` (universe-sync, **wiring point**) and `get-consistent-distributions.function.ts:66` (screener-only).
- Traced 7-step universe-sync call graph from HTTP POST to `fetchDividendHistory` inside `getDistributions`.
- Recommended modifying `getDistributions` to return `{ result, history }` — minimal change, zero extra fetches.
- Identified 4 non-test `recalculateUniverseVolatility` call sites: 2 in `sync-from-screener/index.ts` will gain history access via `getDistributions` change; 2 in `add-symbol` and PUT route have no history and will need a separate decision in Story 88.3.
- `pnpm all` PASS — no tasks ran (no affected files vs `main`), confirming clean baseline.
- Zero production or test files changed. Only this story file was modified.

### File List

- `_bmad-output/implementation-artifacts/88-1-investigate-distribution-history-volatility-source.md` (modified — Dev Notes populated)
