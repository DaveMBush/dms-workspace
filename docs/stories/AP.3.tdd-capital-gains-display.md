# Story AP.3: TDD - Unit Tests for Capital Gains Classification

## Status: Ready for Review

## Story

**As a** frontend developer
**I want** TDD unit tests for `classifyCapitalGain` pure function
**So that** Story AP.4 can implement the function against a verified test contract

## Context

**Current System (discovered during implementation):**

- Story AP.2 implemented basic sold positions table
- `capitalGain` and `capitalGainPercentage` are **already computed** in `SoldPositionsComponentService`
  (see `apps/dms-material/src/app/account-panel/sold-positions/sold-positions-component.service.ts`)
- The `apps/dms/` app already has mature `calculateCapitalGains`, `formatCapitalGainsDollar`,
  `formatCapitalGainsPercentage`, and `isValidNumber` standalone functions
- AP.3 scope was therefore narrowed to adding the **`gainLossType` classification only**

**Problem:**

- Users will need visual indicators (gain/loss/neutral) for color-coded UI
- Need a pure, testable `classifyCapitalGain` function
- `ClosedPosition` interface needs `gainLossType` field for AP.4 integration

## Acceptance Criteria

### Functional Requirements

- [x] `gainLossType?: 'gain' | 'loss' | 'neutral'` field added to `ClosedPosition` interface
- [x] `classifyCapitalGain` pure function stub created (throws until AP.4)
- [x] Tests verify positive capital gain → 'gain'
- [x] Tests verify negative capital gain → 'loss'
- [x] Tests verify zero capital gain → 'neutral'
- [x] Edge cases tested (very large, fractional, exact zero)

### Technical Requirements

- [x] Unit tests created following AAA pattern (Arrange-Act-Assert)
- [x] Tests are disabled with `.skip` after RED verification
- [x] All existing tests still pass (`pnpm all` clean)
- [x] Lint passes with no new warnings

## Implementation Details

### Files Created / Modified

**Modified:** `apps/dms-material/src/app/store/trades/closed-position.interface.ts`

- Added `gainLossType?: 'gain' | 'loss' | 'neutral';` field

**Created:** `apps/dms-material/src/app/account-panel/sold-positions/classify-capital-gain.function.ts`

- Stub that throws `Error('Not implemented - see Story AP.4')`
- Parameter named `_` to satisfy lint naming-convention rule

**Created:** `apps/dms-material/src/app/account-panel/sold-positions/classify-capital-gain.function.spec.ts`

- 8 tests in 3 `describe` blocks (positive / negative / zero)
- All wrapped in `describe.skip` (RED phase - AP.4 removes the skip)

### Test File Structure

`apps/dms-material/src/app/account-panel/sold-positions/classify-capital-gain.function.spec.ts`

```typescript
describe.skip('classifyCapitalGain', () => {
  describe('positive capital gains', () => {
    it('should return "gain" for a standard profit', ...)
    it('should return "gain" for a very large profit', ...)
    it('should return "gain" for a fractional profit', ...)
  });
  describe('negative capital gains (losses)', () => {
    it('should return "loss" for a standard loss', ...)
    it('should return "loss" for a very large loss', ...)
    it('should return "loss" for a fractional loss', ...)
  });
  describe('zero capital gains (neutral/breakeven)', () => {
    it('should return "neutral" for a breakeven trade', ...)
    it('should return "neutral" for exact zero', ...)
  });
});
```

## Definition of Done

- [x] `gainLossType?` field added to `ClosedPosition` interface
- [x] `classifyCapitalGain` stub function created
- [x] Unit tests created following AAA pattern
- [x] Tests verified to run RED (stub throws, tests fail)
- [x] Tests disabled with `.skip` so CI passes
- [x] All existing tests still pass
- [x] Lint passes (no new warnings)
- [x] Edge cases covered (large, fractional, zero)
- [x] `pnpm all` passes
- [x] `pnpm e2e:dms-material` passes (382 passed, 1 auto-recovered flaky)
- [x] `pnpm dupcheck` passes (0 clones)
- [x] `pnpm format` ran cleanly

## Notes

- Tests must remain disabled until AP.4 implements `classifyCapitalGain`
- AP.4 will: remove `.skip`, implement the function, integrate into `SoldPositionsComponentService`
- `capitalGain` and `capitalGainPercentage` were already implemented prior to this story
- Scope was deliberately narrowed from original story requirements upon discovering existing implementation

## Dependencies

- Story AP.2 completed
- Sold positions table wired to SmartNgRX
- `capitalGain` and `capitalGainPercentage` already computed in `SoldPositionsComponentService`

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Completion Notes

- Discovered `capitalGain` and `capitalGainPercentage` already exist in `SoldPositionsComponentService`
- Scoped story to `gainLossType` classification only to avoid duplication
- Updated AP.4 story with corrected paths and `classifyCapitalGain` integration approach
- E2E run confirmed 0 regressions (382 passed, 1 flaky auto-recovered, exit=0)

### Change Log

- Added `gainLossType?: 'gain' | 'loss' | 'neutral'` to `ClosedPosition` interface
- Created `classify-capital-gain.function.ts` (stub, throws `Error('Not implemented - see Story AP.4')`)
- Created `classify-capital-gain.function.spec.ts` (8 skipped TDD RED tests)
- Updated story AP.3 to reflect actual implementation scope and correct paths
- Updated story AP.4 to reflect correct implementation approach and paths

### File List

- `apps/dms-material/src/app/store/trades/closed-position.interface.ts` (modified)
- `apps/dms-material/src/app/account-panel/sold-positions/classify-capital-gain.function.ts` (created)
- `apps/dms-material/src/app/account-panel/sold-positions/classify-capital-gain.function.spec.ts` (created)
- `docs/stories/AP.3.tdd-capital-gains-display.md` (modified)
- `docs/stories/AP.4.implement-capital-gains-display.md` (modified)
