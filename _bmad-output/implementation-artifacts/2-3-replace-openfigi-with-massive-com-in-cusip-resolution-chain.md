# Story 2.3: Replace OpenFIGI with massive.com in CUSIP Resolution Chain

Status: ready-for-dev

## Story

As a developer,
I want the CUSIP resolution chain to use massive.com as the primary resolver with Yahoo Finance as the final fallback,
so that OpenFIGI is fully removed and the maximum number of CUSIPs are resolved without changing the cache or UI layers.

## Acceptance Criteria

1. **Given** a CUSIP that requires resolution,
   **When** massive.com resolves it successfully,
   **Then** the resolved ticker is cached and returned exactly as it would have been from OpenFIGI.

2. **And** the resolution chain is: massive.com → Yahoo Finance (OpenFIGI is removed entirely).

3. **And** the OpenFIGI service and all references to it are deleted from the codebase.

4. **And** the CUSIP cache table and audit log continue to record resolution source.

## Tasks / Subtasks

- [ ] Replace OpenFIGI with massive.com in CUSIP resolution chain (AC: 1, 2)
  - [ ] Open `apps/server/src/app/routes/import/resolve-cusip.function.ts`
  - [ ] Remove the OpenFIGI call and replace it with the massive.com call as the first resolver
  - [ ] Import and instantiate `MassiveCusipService` from `apps/server/src/utils/massive-cusip.service.ts`
  - [ ] Pass `MASSIVE` as the `CusipCacheSource` when caching massive.com results
- [ ] Delete OpenFIGI service (AC: 3)
  - [ ] Delete `apps/server/src/utils/openfigi-cusip.service.ts` (or equivalent OpenFIGI service file)
  - [ ] Remove all imports and references to the OpenFIGI service across the codebase
  - [ ] Remove `OPENFIGI` from `CusipCacheSource` enum if it is no longer referenced
- [ ] Update cache recording (AC: 4)
  - [ ] Verify `cusip_cache.source` field correctly stores `MASSIVE` for massive.com resolutions
  - [ ] Verify `cusip_cache_audit` records include `MASSIVE` as source
- [ ] Update existing unit tests (AC: 1, 2)
  - [ ] Remove all OpenFIGI-related test cases from resolution chain tests
  - [ ] Test: massive.com succeeds → result cached with source `MASSIVE`
  - [ ] Test: massive.com fails → Yahoo Finance called
  - [ ] Test: massive.com HTTP 429 → falls through to Yahoo Finance immediately
- [ ] Run quality checks
  - [ ] `pnpm all` passes
  - [ ] Verify no regressions in existing CUSIP resolution tests

## Dev Notes

### Architecture Constraints (ADR-003)

- Resolution chain order: massive.com → Yahoo Finance (OpenFIGI removed)
- HTTP 429 from massive.com → fall through to Yahoo Finance immediately
- Named functions only — no anonymous arrow functions

### Key Files to Modify

| File | Purpose |
|------|---------|
| `apps/server/src/app/routes/import/resolve-cusip.function.ts` | Main resolution chain — replace OpenFIGI call with massive.com as first resolver |
| `apps/server/src/app/routes/import/cusip-cache.service.ts` | Cache service — no changes expected (already handles source enum) |
| `apps/server/src/app/services/cusip-cache-cleanup.service.ts` | Cleanup service — verify `MASSIVE` source handled correctly |
| OpenFIGI service file (e.g. `openfigi-cusip.service.ts`) | **Delete** — service and all references to be removed |

### Existing Resolution Sources in Tests

From `cusip-cache/index.spec.ts`, existing tests reference:
- `source: 'OPENFIGI'` ← **remove/replace with `MASSIVE`**
- `source: 'YAHOO_FINANCE'`
- `body.entriesBySource` contains `{ OPENFIGI: count, YAHOO_FINANCE: count }`

After this story, `OPENFIGI` entries are removed and `MASSIVE` appears in `entriesBySource` in its place.

### Previous Story Intelligence

Story 2.2 creates `MassiveCusipService` in `apps/server/src/utils/massive-cusip.service.ts` with:
- `resolveCusip(cusip: string): Promise<string | null>`
- Built-in rate limiting (4.5 req/min)
- Circuit-breaker on HTTP 429

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 2, Story 2.3 (updated: massive.com replaces OpenFIGI)]
- [Source: _bmad-output/planning-artifacts/architecture.md#ADR-003]
- [Source: apps/server/src/app/routes/import/resolve-cusip.function.ts]
- [Source: apps/server/src/app/routes/admin/cusip-cache/index.spec.ts]

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### File List
