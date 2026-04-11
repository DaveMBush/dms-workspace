# Story 66.2: Apply CEF Classification During CSV Import Symbol Add

Status: Approved

## Story

As a trader,
I want any new symbol added to the universe during a CSV import to be automatically classified as
Equity, Income, or Tax Free if it is a Closed End Fund,
so that the annualised yield and sector grouping are correct from the moment the import completes.

## Acceptance Criteria

1. **Given** a CSV import contains a buy transaction for a symbol not yet in the universe,
   **When** the import pipeline runs and adds the new symbol,
   **Then** the pipeline calls `lookupCefConnectSymbol()` (from Story 66.1) before saving the
   symbol record.

2. **Given** the new symbol is identified as a CEF on CefConnect.com,
   **When** the symbol is saved,
   **Then** its `risk_group_id` is set to Equity, Income, or Tax Free — not the default first-available
   risk group, and `is_closed_end_fund` is set to `true`.

3. **Given** the new symbol is not found on CefConnect.com (i.e. it is a regular equity),
   **When** the symbol is saved,
   **Then** the symbol is saved with the default equity `risk_group_id` and `is_closed_end_fund: false`
   (unchanged default behaviour).

4. **Given** the CefConnect.com network request fails or times out,
   **When** the import pipeline encounters the error,
   **Then** a warning is logged and the symbol is saved with the default equity classification —
   no import abort or silent data corruption.

5. **Given** all changes are applied,
   **When** `pnpm all` runs,
   **Then** all tests pass with no regressions.

## Definition of Done

- [ ] Story 66.1 is complete and `cef-classification.function.ts` is available
- [ ] CSV import add-symbol path (`resolveSymbol()` in `fidelity-data-mapper.function.ts`) updated to call `lookupCefConnectSymbol()` and `classifySymbolRiskGroupId()` from Story 66.1
- [ ] Integration handles CefConnect.com network errors gracefully (logs warning, defaults to first-available risk group with `is_closed_end_fund: false`)
- [ ] `risk_group_id` and `is_closed_end_fund` are set correctly on the newly created universe record for CEF symbols
- [ ] Unit tests added for the CSV import path: CEF found → correct risk_group_id and `is_closed_end_fund: true`, symbol not found → default risk_group_id, network error → default risk_group_id + warning logged
- [ ] `pnpm all` passes

## Tasks / Subtasks

- [ ] Task 1: Read the current CSV import add-symbol path (AC: #1)
  - [ ] Subtask 1.1: Read `apps/server/src/app/routes/import/fidelity-data-mapper.function.ts` — locate `resolveSymbol()` (around line 70–120); understand exactly where `prisma.universe.create()` is called and what fields it sets
  - [ ] Subtask 1.2: Note current defaults: `risk_group_id: defaultRiskGroup.id` (first risk group found), `is_closed_end_fund: true` — these will be overridden by CEF classification for non-CEFs
  - [ ] Subtask 1.3: Read `apps/server/src/app/routes/import/fidelity-data-mapper.function.spec.ts` near the `universe.create` assertions (lines 684, 692, 1039, 1052, 1216, 1233, 1287, 1293, 1340, 1388) — understand existing test assertions so changes do not break them

- [ ] Task 2: Implement CEF classification in `resolveSymbol()` (AC: #1, #2, #3, #4)
  - [ ] Subtask 2.1: Import `lookupCefConnectSymbol` and `classifySymbolRiskGroupId` from `apps/server/src/app/routes/common/cef-classification.function.ts`
  - [ ] Subtask 2.2: Add a `loadRiskGroups()` call (or equivalent) inside `resolveSymbol()` when a new symbol is being created — or pass pre-loaded risk groups in if performance is a concern
  - [ ] Subtask 2.3: Before calling `prisma.universe.create()`, call `lookupCefConnectSymbol(symbol)` in a try/catch
  - [ ] Subtask 2.4: If lookup succeeds and returns data: call `classifySymbolRiskGroupId()` to get `risk_group_id`; set `is_closed_end_fund: true`
  - [ ] Subtask 2.5: If lookup returns null (symbol not on CefConnect): use `defaultRiskGroup.id`, set `is_closed_end_fund: false`
  - [ ] Subtask 2.6: If lookup throws (network error): call `logger.warn(...)` with symbol name and error, fall back to `defaultRiskGroup.id`, set `is_closed_end_fund: false` — do NOT rethrow
  - [ ] Subtask 2.7: Confirm `is_closed_end_fund: false` for non-CEF symbols — note the current code mistakenly sets `is_closed_end_fund: true` for all new symbols; fix this as part of the story

- [ ] Task 3: Update unit tests for the modified `resolveSymbol()` function (AC: #5)
  - [ ] Subtask 3.1: Mock `lookupCefConnectSymbol` and `classifySymbolRiskGroupId` in `fidelity-data-mapper.function.spec.ts`
  - [ ] Subtask 3.2: Add test: new symbol is a CEF → `prisma.universe.create` called with correct `risk_group_id` and `is_closed_end_fund: true`
  - [ ] Subtask 3.3: Add test: new symbol not found on CefConnect → `prisma.universe.create` called with default `risk_group_id` and `is_closed_end_fund: false`
  - [ ] Subtask 3.4: Add test: `lookupCefConnectSymbol` throws → `logger.warn` called, `prisma.universe.create` called with default risk group, import does NOT abort
  - [ ] Subtask 3.5: Review existing tests at `universe.create` assertion lines and update assertions if the default `is_closed_end_fund` value changes (was `true`, now `false` for non-CEF)
  - [ ] Subtask 3.6: Run `pnpm all` and confirm all tests pass

## Dev Notes

### Key Files

| File | Purpose |
|------|---------|
| `apps/server/src/app/routes/import/fidelity-data-mapper.function.ts` | **Primary edit target** — `resolveSymbol()` function (around line 65–120) creates the universe entry for new BUY symbols; `prisma.universe.create()` call is at line 84 |
| `apps/server/src/app/routes/import/fidelity-data-mapper.function.spec.ts` | Unit tests — has 10+ `universe.create` assertions at lines 684, 692, 1039, 1052, 1216, 1233, 1287, 1293, 1340, 1388 — read before modifying |
| `apps/server/src/app/routes/common/cef-classification.function.ts` | NEW from Story 66.1 — provides `lookupCefConnectSymbol()`, `classifySymbolRiskGroupId()` |
| `apps/server/src/app/routes/common/axios-get-with-backoff.function.ts` | Used internally by `lookupCefConnectSymbol` — no direct use needed here |
| `apps/server/src/app/routes/universe/fetch-and-update-price-data.function.ts` | Already called after `prisma.universe.create()` in `resolveSymbol()` — do not remove |
| `../../../../utils/structured-logger` | `logger.warn()` — use for network error warning |

### Architecture Context

**Current `resolveSymbol()` flow (when `createIfNotFound = true`):**
1. `prisma.universe.findFirst({ where: { symbol } })` — check if exists
2. `prisma.risk_group.findFirst()` — get default risk group (first available)
3. `prisma.universe.create({ data: { ..., risk_group_id: defaultRiskGroup.id, is_closed_end_fund: true } })` — creates with hardcoded `is_closed_end_fund: true`
4. `fetchAndUpdatePriceData(...)` — fetch price/dividend

**After Story 66.2, step 3 becomes:**
1. `let riskGroupId = defaultRiskGroup.id`
2. `let isCef = false`
3. **try** `lookupCefConnectSymbol(symbol)` → if found: `riskGroupId = classifySymbolRiskGroupId(data, riskGroups) ?? defaultRiskGroup.id; isCef = true`
4. **catch** → `logger.warn(...)`, keep defaults
5. `prisma.universe.create({ data: { ..., risk_group_id: riskGroupId, is_closed_end_fund: isCef } })`

**Important:** The `risk_group_id` field in the universe table is a string FK to `risk_group.id`. `classifySymbolRiskGroupId()` returns a string ID or null—if null (unrecognised CategoryId), fall back to `defaultRiskGroup.id`.

**Note on `is_closed_end_fund` default:** The current code sets `is_closed_end_fund: true` for all auto-created symbols (see line 84 of `fidelity-data-mapper.function.ts`). After this story it should be `false` for non-CEFs (and `true` only for confirmed CEFs). Update existing test assertions accordingly.

### Technical Guidance

- `resolveSymbol()` needs to call `loadRiskGroups()` (or inline the prisma query) to get the risk group IDs for equity/income/taxFree. The simplest approach: call `prisma.risk_group.findMany()` once inside the create block. Performance is acceptable since this path only executes for symbols not already in the universe.
- The `loadRiskGroups()` helper could be imported from the screener or duplicated from the common module — prefer importing a shared version if Story 66.1 moves it there.
- Keep the `defaultRiskGroup` lookup for the fallback path (non-CEF and error cases) — it uses `findFirst()` which returns whatever risk group exists first.
- Do NOT change any test that is testing behaviour unrelated to the new CEF classification (e.g., price fetch tests, sale/split tests).

### Testing Standards
- Unit tests: Vitest in same directory as source (`apps/server/src/app/routes/import/`)
- `pnpm all` must pass

### Project Structure Notes
- Named functions only — no anonymous arrow functions in callbacks
- `logger` import from `../../../../utils/structured-logger` (relative path pattern matches existing imports in this file)

### References
- [Source: `_bmad-output/planning-artifacts/epics-2026-04-10.md`#Epic 66 / Story 66.2]
- [CSV import add-symbol: `apps/server/src/app/routes/import/fidelity-data-mapper.function.ts`#resolveSymbol]
- [Shared CEF functions: `apps/server/src/app/routes/common/cef-classification.function.ts`] (Story 66.1 output)

## Dev Agent Record

### Agent Model Used

_[to be filled by dev agent]_

### Debug Log References

### Completion Notes List

### File List
