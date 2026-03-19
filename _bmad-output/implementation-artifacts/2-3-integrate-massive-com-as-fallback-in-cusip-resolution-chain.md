# Story 2.3: Integrate massive.com as Fallback in CUSIP Resolution Chain

Status: ready-for-dev

## Story

As a developer,
I want the CUSIP resolution chain to try OpenFIGI first, then massive.com, then Yahoo Finance,
so that the maximum number of CUSIPs are resolved without changing the cache or UI layers.

## Acceptance Criteria

1. **Given** a CUSIP not resolvable by OpenFIGI,
   **When** massive.com resolves it successfully,
   **Then** the resolved ticker is cached and returned exactly as it would have been from OpenFIGI.

2. **And** the fallback chain is: OpenFIGI → massive.com → Yahoo Finance.

3. **And** existing behaviour for CUSIPs resolvable by OpenFIGI is unchanged.

4. **And** the CUSIP cache table and audit log continue to record resolution source.

## Tasks / Subtasks

- [ ] Modify CUSIP resolution chain (AC: 1, 2, 3)
  - [ ] Open `apps/server/src/app/routes/import/resolve-cusip.function.ts`
  - [ ] Insert massive.com call between OpenFIGI and Yahoo Finance fallback
  - [ ] Import and instantiate `MassiveCusipService` from `apps/server/src/utils/massive-cusip.service.ts`
  - [ ] Pass `MASSIVE` as the `CusipCacheSource` when caching massive.com results
- [ ] Ensure OpenFIGI short-circuit (AC: 3)
  - [ ] If OpenFIGI resolves successfully, massive.com must NOT be called
  - [ ] Add unit test asserting this: OpenFIGI success → massive.com never invoked
- [ ] Update cache recording (AC: 4)
  - [ ] Verify `cusip_cache.source` field correctly stores `MASSIVE` for massive.com resolutions
  - [ ] Verify `cusip_cache_audit` records include `MASSIVE` as source
- [ ] Update existing unit tests (AC: 1, 2, 3)
  - [ ] Update resolution chain tests to include massive.com step
  - [ ] Test: OpenFIGI fails → massive.com succeeds → result cached with source `MASSIVE`
  - [ ] Test: OpenFIGI fails → massive.com fails → Yahoo Finance called
  - [ ] Test: OpenFIGI succeeds → massive.com never called
  - [ ] Test: massive.com HTTP 429 → falls through to Yahoo Finance immediately
- [ ] Run quality checks
  - [ ] `pnpm all` passes
  - [ ] Verify no regressions in existing CUSIP resolution tests

## Dev Notes

### Architecture Constraints (ADR-003)

- Fallback chain order: OpenFIGI → massive.com → Yahoo Finance
- OpenFIGI success must short-circuit the chain (massive.com never called)
- HTTP 429 from massive.com → fall through to Yahoo Finance immediately
- Named functions only — no anonymous arrow functions

### Key Files to Modify

| File | Purpose |
|------|---------|
| `apps/server/src/app/routes/import/resolve-cusip.function.ts` | Main resolution chain — insert massive.com fallback |
| `apps/server/src/app/routes/import/cusip-cache.service.ts` | Cache service — no changes expected (already handles source enum) |
| `apps/server/src/app/services/cusip-cache-cleanup.service.ts` | Cleanup service — verify `MASSIVE` source handled correctly |

### Existing Resolution Sources in Tests

From `cusip-cache/index.spec.ts`, existing tests reference:
- `source: 'OPENFIGI'`
- `source: 'YAHOO_FINANCE'`
- `body.entriesBySource` contains `{ OPENFIGI: count, YAHOO_FINANCE: count }`

After this story, `MASSIVE` should appear in `entriesBySource` when applicable.

### Previous Story Intelligence

Story 2.2 creates `MassiveCusipService` in `apps/server/src/utils/massive-cusip.service.ts` with:
- `resolveCusip(cusip: string): Promise<string | null>`
- Built-in rate limiting (4.5 req/min)
- Circuit-breaker on HTTP 429

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 2, Story 2.3]
- [Source: _bmad-output/planning-artifacts/architecture.md#ADR-003]
- [Source: apps/server/src/app/routes/import/resolve-cusip.function.ts]
- [Source: apps/server/src/app/routes/admin/cusip-cache/index.spec.ts]

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### File List
