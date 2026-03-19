# Story 2.3: Replace OpenFIGI with 13f.info in CUSIP Resolution Chain

Status: ready-for-dev

## Story

As a developer,
I want the CUSIP resolution chain to use 13f.info as the primary resolver with Yahoo Finance as the final fallback,
so that OpenFIGI is fully removed and the maximum number of CUSIPs are resolved without changing the cache or UI layers.

## Acceptance Criteria

1. **Given** a CUSIP that requires resolution,
   **When** 13f.info resolves it successfully,
   **Then** the resolved ticker is cached and returned exactly as it would have been from OpenFIGI.

2. **And** the resolution chain is: 13f.info → Yahoo Finance (OpenFIGI is removed entirely).

3. **And** the OpenFIGI service and all references to it are deleted from the codebase.

4. **And** the CUSIP cache table and audit log continue to record resolution source.

## Tasks / Subtasks

- [ ] Replace OpenFIGI with 13f.info in CUSIP resolution chain (AC: 1, 2)
  - [ ] Open `apps/server/src/app/routes/import/resolve-cusip.function.ts`
  - [ ] Remove the OpenFIGI call and replace it with the `ThirteenfCusipService` call as the first resolver
  - [ ] Import and instantiate `ThirteenfCusipService` from `apps/server/src/utils/thirteenf-cusip.service.ts`
  - [ ] Pass `THIRTEENF` as the `CusipCacheSource` when caching 13f.info results
- [ ] Delete OpenFIGI service (AC: 3)
  - [ ] Delete `apps/server/src/utils/openfigi-cusip.service.ts` (or equivalent OpenFIGI service file)
  - [ ] Remove all imports and references to the OpenFIGI service across the codebase
  - [ ] Remove `OPENFIGI` from `CusipCacheSource` enum (replaced by `THIRTEENF` in Story 2.2)
- [ ] Update cache recording (AC: 4)
  - [ ] Verify `cusip_cache.source` field correctly stores `THIRTEENF` for 13f.info resolutions
  - [ ] Verify `cusip_cache_audit` records include `THIRTEENF` as source
- [ ] Update existing unit tests (AC: 1, 2)
  - [ ] Remove all OpenFIGI-related test cases from resolution chain tests
  - [ ] Test: 13f.info succeeds → result cached with source `THIRTEENF`
  - [ ] Test: 13f.info returns `null` → Yahoo Finance called
  - [ ] Test: 13f.info throws/network error → Yahoo Finance called
- [ ] Run quality checks
  - [ ] `pnpm all` passes
  - [ ] Verify no regressions in existing CUSIP resolution tests

## Dev Notes

### Architecture Constraints (ADR-003)

- Resolution chain order: 13f.info → Yahoo Finance (OpenFIGI removed)
- 13f.info returns `null` on any failure → fall through to Yahoo Finance
- Named functions only — no anonymous arrow functions

### Key Files to Modify

| File | Purpose |
|------|---------|
| `apps/server/src/app/routes/import/resolve-cusip.function.ts` | Main resolution chain — replace OpenFIGI call with `ThirteenfCusipService` as first resolver |
| `apps/server/src/app/routes/import/cusip-cache.service.ts` | Cache service — no changes expected (already handles source enum) |
| `apps/server/src/app/services/cusip-cache-cleanup.service.ts` | Cleanup service — verify `THIRTEENF` source handled correctly |
| OpenFIGI service file (e.g. `openfigi-cusip.service.ts`) | **Delete** — service and all references to be removed |

### Existing Resolution Sources in Tests

From `cusip-cache/index.spec.ts`, existing tests reference:
- `source: 'OPENFIGI'` ← **remove/replace with `THIRTEENF`**
- `source: 'YAHOO_FINANCE'`
- `body.entriesBySource` contains `{ OPENFIGI: count, YAHOO_FINANCE: count }`

After this story, `OPENFIGI` entries are removed and `THIRTEENF` appears in `entriesBySource` in its place.

### Previous Story Intelligence

Story 2.2 creates `ThirteenfCusipService` in `apps/server/src/utils/thirteenf-cusip.service.ts` with:
- `resolveCusip(cusip: string): Promise<string | null>`
- Built-in 1 req/sec rate limiting (Yahoo Finance pattern)
- Returns `null` on any non-200 or parse failure

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 2, Story 2.3]
- [Source: _bmad-output/planning-artifacts/architecture.md#ADR-003]
- [Source: apps/server/src/app/routes/import/resolve-cusip.function.ts]
- [Source: apps/server/src/app/routes/admin/cusip-cache/index.spec.ts]

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### File List
