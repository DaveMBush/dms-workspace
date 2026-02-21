# Story AP.4: Implementation - Display Capital Gains Classification

## Status: Ready for Review

## Story

**As a** user viewing sold positions
**I want** capital gain/loss rows visually classified as gain, loss, or neutral
**So that** I can quickly assess trading performance at a glance

## Context

**Current System (as of AP.3):**

- `capitalGain` and `capitalGainPercentage` are **already computed** in `SoldPositionsComponentService`
  (`apps/dms-material/src/app/account-panel/sold-positions/sold-positions-component.service.ts`)
- `ClosedPosition` interface has `gainLossType?: 'gain' | 'loss' | 'neutral'` added in AP.3
- `classifyCapitalGain` stub function exists at
  `apps/dms-material/src/app/account-panel/sold-positions/classify-capital-gain.function.ts`
- TDD RED tests exist in `classify-capital-gain.function.spec.ts` (8 tests, all `.skip`)

**Problem:**

- `gainLossType` is not yet populated — `classifyCapitalGain` throws on call
- No color-coding CSS is applied to the sold positions table
- RED tests need implementation to turn GREEN

## Acceptance Criteria

### Functional Requirements

- [x] Positive capital gain rows classified as `'gain'`
- [x] Negative capital gain rows classified as `'loss'`
- [x] Zero capital gain rows classified as `'neutral'`
- [x] `gainLossType` field populated on each `ClosedPosition` row in the service

### Technical Requirements

- [x] Remove `.skip` from `classify-capital-gain.function.spec.ts`
- [x] All 8 TDD tests pass (GREEN)
- [x] `classifyCapitalGain` implemented as a pure function (no side effects)
- [x] `SoldPositionsComponentService.selectSoldPositions` calls `classifyCapitalGain(capitalGain)`
      and sets `gainLossType` on each returned `ClosedPosition`
- [x] CSS classes applied to table rows/cells using `gainLossType` (green/red/neutral)
- [x] Follow Material Design color patterns

## Implementation Approach

### Step 1: Implement `classifyCapitalGain`

Update `apps/dms-material/src/app/account-panel/sold-positions/classify-capital-gain.function.ts`:

```typescript
/**
 * Classifies a capital gain/loss amount as 'gain', 'loss', or 'neutral'.
 */
export function classifyCapitalGain(capitalGain: number): 'gain' | 'loss' | 'neutral' {
  if (capitalGain > 0) return 'gain';
  if (capitalGain < 0) return 'loss';
  return 'neutral';
}
```

### Step 2: Re-enable TDD Tests

Remove `.skip` from:
`apps/dms-material/src/app/account-panel/sold-positions/classify-capital-gain.function.spec.ts`

Run tests to verify GREEN:

```bash
pnpm nx test dms-material --testFile=classify-capital-gain.function.spec.ts
```

### Step 3: Integrate into Service

Update the `for` loop in `selectSoldPositions` in `SoldPositionsComponentService`
(`apps/dms-material/src/app/account-panel/sold-positions/sold-positions-component.service.ts`):

```typescript
// Inside the for loop, when building each ClosedPosition row:
row.gainLossType = classifyCapitalGain(row.capitalGain);
```

### Step 4: Add CSS Color Coding

In the sold positions component template/styles, apply classes based on `gainLossType`:

- `.gain` → Material green (`#4caf50`)
- `.loss` → Material red (`#f44336`)
- `.neutral` → Material grey (`#757575`)

### Step 5: Validate

```bash
pnpm all
pnpm e2e:dms-material
pnpm dupcheck
pnpm format
```

## Definition of Done

- [x] `classifyCapitalGain` fully implemented (no longer throws)
- [x] 8 TDD tests from AP.3 pass (GREEN, `.skip` removed)
- [x] `gainLossType` populated on all `ClosedPosition` rows
- [x] Color-coding CSS applied to table
- [x] `pnpm all` passes
- [x] `pnpm e2e:dms-material` passes
- [x] `pnpm dupcheck` passes
- [x] `pnpm format` clean
- [ ] Code reviewed

## Notes

- Do NOT re-implement `capitalGain` or `capitalGainPercentage` — those already exist in the service
- The `classifyCapitalGain` function must remain a pure function (no injected deps, no side effects)
- See `apps/dms/` for reference implementations of similar formatting functions

## Dependencies

- Story AP.3 completed (stub + RED tests in place)

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Completion Notes

- Implemented `classifyCapitalGain` pure function (positive→gain, negative→loss, zero→neutral)
- Removed `.skip` from `classify-capital-gain.function.spec.ts` — all 8 TDD tests pass GREEN
- Integrated `classifyCapitalGain` into `SoldPositionsComponentService.selectSoldPositions` — `gainLossType` now set on every `ClosedPosition`
- Extended `BaseTableComponent` with generic `gainLossType$` row helper and CSS class bindings (`[class.gain]`, `[class.loss]`, `[class.neutral]`)
- Added Material Design color styles to `base-table.component.scss` (green #4caf50 / red #f44336 / grey #757575)

### Change Log

- `classify-capital-gain.function.ts`: Replaced stub (throws) with pure implementation
- `classify-capital-gain.function.spec.ts`: Removed `describe.skip` → `describe`
- `sold-positions-component.service.ts`: Added `classifyCapitalGain` import and `gainLossType` assignment in push
- `base-table.component.ts`: Added `gainLossType$` helper method
- `base-table.component.html`: Added `[class.gain/loss/neutral]` bindings on `<tr mat-row>`
- `base-table.component.scss`: Added `.gain`, `.loss`, `.neutral` row color styles

### File List

- `apps/dms-material/src/app/account-panel/sold-positions/classify-capital-gain.function.ts` (modified)
- `apps/dms-material/src/app/account-panel/sold-positions/classify-capital-gain.function.spec.ts` (modified)
- `apps/dms-material/src/app/account-panel/sold-positions/sold-positions-component.service.ts` (modified)
- `apps/dms-material/src/app/shared/components/base-table/base-table.component.ts` (modified)
- `apps/dms-material/src/app/shared/components/base-table/base-table.component.html` (modified)
- `apps/dms-material/src/app/shared/components/base-table/base-table.component.scss` (modified)
