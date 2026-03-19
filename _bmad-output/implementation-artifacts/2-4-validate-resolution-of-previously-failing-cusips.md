# Story 2.4: Validate Resolution of Previously Failing CUSIPs

Status: ready-for-dev

## Story

As a developer,
I want to confirm that all three previously failing CUSIPs now resolve successfully end-to-end,
so that I can close this epic with confidence.

## Acceptance Criteria

1. **Given** the updated resolution chain is deployed locally,
   **When** a CSV import containing `691543102`, `88636J527`, or `88634T493` is processed,
   **Then** each CUSIP resolves to the correct ticker symbol.

2. **And** all existing unit and E2E tests pass (`pnpm all` + E2E checks).

3. **And** the three CUSIPs are added to a regression test that asserts their resolution does not regress.

## Tasks / Subtasks

- [ ] Create regression test for the three CUSIPs (AC: 3)
  - [ ] Create test file or add test block in existing resolution test file
  - [ ] Test: `691543102` resolves to expected ticker symbol
  - [ ] Test: `88636J527` resolves to expected ticker symbol
  - [ ] Test: `88634T493` resolves to expected ticker symbol
  - [ ] Tests should use the full resolution chain (not mock massive.com)
  - [ ] Document the expected ticker symbols from Story 2.1 results
- [ ] Validate end-to-end resolution via CSV import (AC: 1)
  - [ ] Start local dev server (`pnpm start:server`)
  - [ ] Create a test CSV file containing the three failing CUSIPs
  - [ ] Process the CSV import through the application
  - [ ] Verify each CUSIP resolves to the correct ticker in the cache
  - [ ] Verify `cusip_cache.source` shows the correct resolution source
- [ ] Run full quality checks (AC: 2)
  - [ ] `pnpm all` passes (lint + build + unit tests)
  - [ ] `pnpm e2e:dms-material:chromium` passes
  - [ ] `pnpm e2e:dms-material:firefox` passes
- [ ] Update audit documentation
  - [ ] Update `_bmad-output/implementation-artifacts/cusip-api-comparison.md` with final resolution results
  - [ ] Note which resolution source resolved each CUSIP (massive.com vs Yahoo Finance)

## Dev Notes

### Architecture Constraints

- The three failing CUSIPs: `691543102`, `88636J527`, `88634T493`
- These must be in a regression test that runs as part of `pnpm all`
- The regression test should verify the full chain, not just the massive.com service in isolation

### Previous Story Intelligence

- Story 2.1: Verified 13f.info returns ticker symbols for all three failing CUSIPs (OXLC, ULTY, MSTY)
- Story 2.2: Created `ThirteenfCusipService` with 1 req/sec rate limiting (Yahoo Finance pattern)
- Story 2.3: Integrated 13f.info into resolution chain as primary resolver (OpenFIGI removed); chain is now 13f.info → Yahoo Finance

### Expected Ticker Symbols (from Story 2.1 verification)

| CUSIP      | Expected Ticker |
|------------|-----------------|
| 691543102  | OXLC            |
| 88636J527  | ULTY            |
| 88634T493  | MSTY            |

### Key Files

| File | Purpose |
|------|----------|
| `apps/server/src/app/routes/import/resolve-cusip.function.ts` | Resolution chain (modified in 2.3) |
| `apps/server/src/app/routes/import/resolve-cusip.function.spec.ts` | Add regression tests here |
| `apps/server/src/utils/thirteenf-cusip.service.ts` | 13f.info service (created in 2.2) |

### Quality Validation

Run the full quality gate:
```bash
pnpm all
pnpm e2e:dms-material:chromium
pnpm e2e:dms-material:firefox
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 2, Story 2.4]
- [Source: _bmad-output/planning-artifacts/architecture.md#ADR-003]
- [Source: _bmad-output/implementation-artifacts/2-1-verify-massive-com-api-returns-results-for-failing-cusips.md]

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### File List
