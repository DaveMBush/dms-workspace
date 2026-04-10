# Story 66.3: Apply CEF Classification During Manual + Button Symbol Add

Status: Approved

## Story

As a trader,
I want any new symbol I add manually via the + button on the Universe screen to be automatically
classified as Equity, Income, or Tax Free if it is a Closed End Fund,
so that I do not have to manually correct the classification after adding a CEF symbol.

## Acceptance Criteria

1. **Given** a user types a symbol ticker in the Add Symbol dialog and clicks Add,
   **When** the add-symbol API endpoint runs,
   **Then** it calls `lookupCefConnectSymbol()` (from Story 66.1) before saving the symbol record.

2. **Given** the new symbol is identified as a CEF on CefConnect.com,
   **When** the symbol is saved,
   **Then** its `risk_group_id` is set to Equity, Income, or Tax Free as determined by CefConnect,
   regardless of the `risk_group_id` passed in the request body, and `is_closed_end_fund` is set to
   `true`.

3. **Given** the new symbol is not found on CefConnect.com,
   **When** the symbol is saved,
   **Then** the symbol is saved with the `risk_group_id` from the request body (unchanged default
   behaviour) and `is_closed_end_fund: false`.

4. **Given** the CefConnect.com request fails,
   **When** the API handles the error,
   **Then** a warning is logged, the symbol is saved with the `risk_group_id` from the request body
   and `is_closed_end_fund: false`, and the add-symbol API response does not return an error to the
   client.

5. **Given** all changes are applied,
   **When** `pnpm all` runs,
   **Then** all tests pass with no regressions.

## Definition of Done

- [ ] Story 66.1 is complete and `cef-classification.function.ts` is available
- [ ] Manual add-symbol function (`addSymbol()` in `add-symbol.function.ts`) updated to call `lookupCefConnectSymbol()` and `classifySymbolRiskGroupId()` from Story 66.1
- [ ] Integration handles CefConnect.com network errors gracefully (logs warning, defaults to request `risk_group_id` with `is_closed_end_fund: false`)
- [ ] `risk_group_id` and `is_closed_end_fund` are set correctly on the newly created universe record
- [ ] Unit tests added for the manual add path: CEF found → correct classification and `is_closed_end_fund: true`, symbol not found → request body `risk_group_id`, network error → request body `risk_group_id` + warning logged
- [ ] `pnpm all` passes

## Tasks / Subtasks

- [ ] Task 1: Read the current manual add-symbol path (AC: #1)
  - [ ] Subtask 1.1: Read `apps/server/src/app/routes/universe/add-symbol/add-symbol.function.ts` — understand `addSymbol()` function: it takes `{ symbol, risk_group_id }`, validates via `validateSymbolAndRiskGroup()`, creates via `prisma.universe.create()` with the request's `risk_group_id`, sets `is_closed_end_fund: false`, then calls `fetchAndUpdatePriceData()`
  - [ ] Subtask 1.2: Read `apps/server/src/app/routes/universe/add-symbol/add-symbol.function.spec.ts` — understand the two existing test cases (success + fetch-failure) so new tests are additive
  - [ ] Subtask 1.3: Read `apps/server/src/app/routes/universe/add-symbol/index.ts` — the route registration file; no changes expected here but confirm the schema accepts `risk_group_id` from the client

- [ ] Task 2: Implement CEF classification in `addSymbol()` (AC: #1, #2, #3, #4)
  - [ ] Subtask 2.1: Import `lookupCefConnectSymbol` and `classifySymbolRiskGroupId` from `apps/server/src/app/routes/common/cef-classification.function.ts`
  - [ ] Subtask 2.2: Before `prisma.universe.create()`, determine the effective `risk_group_id` and `is_closed_end_fund`:
    - Default: `effectiveRiskGroupId = risk_group_id` (from request), `isCef = false`
    - Try: `lookupCefConnectSymbol(upperSymbol)`
    - If found: `effectiveRiskGroupId = classifySymbolRiskGroupId(data, riskGroups) ?? risk_group_id; isCef = true`
    - If not found (returns null): keep defaults
    - Catch (network error): `logger.warn(...)`, keep defaults
  - [ ] Subtask 2.3: Load risk groups before the CEF lookup — call `prisma.risk_group.findMany()` inline (or reuse the pattern from `loadRiskGroups()` in the screener if extracted to common in Story 66.1)
  - [ ] Subtask 2.4: Pass `effectiveRiskGroupId` and `isCef` into `prisma.universe.create()`:
    ```ts
    await prisma.universe.create({
      data: {
        symbol: upperSymbol,
        risk_group_id: effectiveRiskGroupId,
        is_closed_end_fund: isCef,
        // ... other fields unchanged
      },
    });
    ```
  - [ ] Subtask 2.5: Ensure the existing `validateSymbolAndRiskGroup()` call still validates the request's original `risk_group_id` — this is still needed to guard against invalid IDs in the request body even if the CEF lookup overrides it

- [ ] Task 3: Update unit tests in `add-symbol.function.spec.ts` (AC: #5)
  - [ ] Subtask 3.1: Add mock for `lookupCefConnectSymbol` and `classifySymbolRiskGroupId` following the existing `vi.mock` pattern in the spec file
  - [ ] Subtask 3.2: Add test: CEF symbol — `lookupCefConnectSymbol` returns ScreeningData with CategoryId 5 (equity) → `prisma.universe.create` called with `risk_group_id` = equities ID and `is_closed_end_fund: true`
  - [ ] Subtask 3.3: Add test: CEF symbol with income category — `lookupCefConnectSymbol` returns CategoryId 15 → create called with income `risk_group_id` and `is_closed_end_fund: true`
  - [ ] Subtask 3.4: Add test: non-CEF symbol — `lookupCefConnectSymbol` returns null → create called with request body `risk_group_id` and `is_closed_end_fund: false`
  - [ ] Subtask 3.5: Add test: network error — `lookupCefConnectSymbol` throws → `logger.warn` called, create called with request body `risk_group_id` and `is_closed_end_fund: false`, function returns success (does not throw)
  - [ ] Subtask 3.6: Confirm existing tests (success + fetch-failure paths) still pass without modification
  - [ ] Subtask 3.7: Run `pnpm all` and confirm all tests pass

## Dev Notes

### Key Files

| File | Purpose |
|------|---------|
| `apps/server/src/app/routes/universe/add-symbol/add-symbol.function.ts` | **Primary edit target** — `addSymbol()` function; `prisma.universe.create()` at line ~84; currently sets `is_closed_end_fund: false` |
| `apps/server/src/app/routes/universe/add-symbol/add-symbol.function.spec.ts` | Existing unit tests — mock pattern uses `vi.mock('../../../prisma/prisma-client', ...)` and `vi.mock('../../settings/common/get-distributions.function')` |
| `apps/server/src/app/routes/universe/add-symbol/index.ts` | Route registration — accepts `{ symbol: string, risk_group_id: string }` in request body; no changes expected |
| `apps/server/src/app/routes/universe/add-symbol/validate-add-symbol-request.function.ts` | Validates the raw request body — still needed; no changes expected |
| `apps/server/src/app/routes/common/cef-classification.function.ts` | NEW from Story 66.1 — provides `lookupCefConnectSymbol()`, `classifySymbolRiskGroupId()` |
| `apps/server/src/app/routes/universe/fetch-and-update-price-data.function.ts` | Called after create — no changes; already in try/catch |
| `../../../../utils/structured-logger` | `logger.warn()` — already imported in `add-symbol.function.ts` |

### Architecture Context

**Current `addSymbol()` flow:**
1. `validateSymbolAndRiskGroup(upperSymbol, risk_group_id)` — checks symbol not duplicate, risk_group exists
2. `prisma.universe.create({ data: { symbol, risk_group_id, is_closed_end_fund: false, ... } })`
3. `fetchAndUpdatePriceData(universeRecord.id, upperSymbol, universeRecord, 'manual symbol add')` — in try/catch

**After Story 66.3, step 2 becomes:**
1. `loadRiskGroups()` → `riskGroups: RiskGroupMap`
2. `let effectiveRiskGroupId = risk_group_id; let isCef = false`
3. try `lookupCefConnectSymbol(upperSymbol)`:
   - if truthy: `effectiveRiskGroupId = classifySymbolRiskGroupId(data, riskGroups) ?? risk_group_id; isCef = true`
   - catch: `logger.warn(...); // keep defaults`
4. `prisma.universe.create({ data: { ..., risk_group_id: effectiveRiskGroupId, is_closed_end_fund: isCef } })`

**Validation note:** `validateSymbolAndRiskGroup()` validates the `risk_group_id` from the request body. This is still correct — the client must pass a valid risk group ID even if the CEF lookup overrides it. This guards against malformed requests.

**Difference from Story 66.2:** In the manual add path, the client provides an explicit `risk_group_id` in the request body. The CEF lookup **overrides** this value if the symbol is a CEF. This is intentional behaviour — manual UI adds should not require the user to know the correct CEF category.

**`RiskGroupMap` type:** Ensure the `RiskGroupMap` interface is importable directly from `cef-classification.function.ts` (or wherever Story 66.1 places it). Do not duplicate the type.

### Technical Guidance

- The `loadRiskGroups()` call can be inlined as `prisma.risk_group.findMany()` if a shared helper is not available from Story 66.1. The screener's `loadRiskGroups()` is currently a local function in `screener/index.ts` — Story 66.1 may or may not extract it to common. Check what was delivered in 66.1 before deciding.
- Risk: The CefConnect API call adds latency to the add-symbol response. This is acceptable — the user is performing a manual action. If the lookup takes more than a few seconds, `axiosGetWithBackoff` will retry and eventually throw; the error catch keeps the add from failing.
- The `mapUniverseRecordToResult()` helper in `add-symbol.function.ts` maps `universeRecord.is_closed_end_fund` to the response — no change needed there since the record will already have the correct value.

### Testing Standards
- Unit tests: Vitest in same directory as source (`apps/server/src/app/routes/universe/add-symbol/`)
- `pnpm all` must pass

### Project Structure Notes
- Named functions for all callbacks (ESLint `@smarttools/no-anonymous-functions`)
- One exported item per file — if extracting a helper, put it in its own file or use the eslint-disable comment

### References
- [Source: `_bmad-output/planning-artifacts/epics-2026-04-10.md`#Epic 66 / Story 66.3]
- [Manual add function: `apps/server/src/app/routes/universe/add-symbol/add-symbol.function.ts`]
- [Shared CEF functions: `apps/server/src/app/routes/common/cef-classification.function.ts`] (Story 66.1 output)
- [Pattern reference: `_bmad-output/implementation-artifacts/35-2-fetch-price-dividend-after-manual-symbol-add.md`]

## Dev Agent Record

### Agent Model Used

_[to be filled by dev agent]_

### Debug Log References

### Completion Notes List

### File List
