# Story AX.2: Implement - Expose rendered range from BaseTableComponent

## Story

**As a** developer consuming BaseTable Component
**I want** the component to emit the currently rendered range from the virtual scroll viewport
**So that** I can implement virtual data access patterns that only touch visible rows

## Context

**Pre-condition:** TDD tests from AX.1 are complete and disabled

**Implementation Approach:**
- Inject `DestroyRef` into `BaseTableComponent`
- Implement `AfterViewInit` lifecycle hook
- Subscribe to `viewport().renderedRangeStream` with debounce
- Add `renderedRangeChange` signal output
- Re-enable tests from AX.1

## Acceptance Criteria

### Functional Requirements

- [ ] `BaseTableComponent` injects `DestroyRef`
- [ ] Component implements `AfterViewInit`
- [ ] Subscribes to `viewport().renderedRangeStream` in `ngAfterViewInit`
- [ ] Emissions are debounced by 100ms
- [ ] Uses `takeUntilDestroyed(this.destroyRef)` for cleanup
- [ ] `renderedRangeChange` output emits `{ start: number; end: number }`
- [ ] No changes to template HTML required

### Technical Requirements

- [ ] Tests from AX.1 re-enabled (remove `.skip()`)
- [ ] All tests pass
- [ ] Follows Angular OnPush change detection pattern
- [ ] Uses RxJS operators correctly

## Implementation Details

### Files to Modify

- `apps/dms-material/src/app/shared/components/base-table/base-table.component.ts`

### Implementation Steps

1. Add imports:
   ```typescript
   import { AfterViewInit, DestroyRef } from '@angular/core';
   import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
   import { debounceTime } from 'rxjs';
   ```

2. Inject `DestroyRef`:
   ```typescript
   private destroyRef = inject(DestroyRef);
   ```

3. Add output:
   ```typescript
   readonly renderedRangeChange = output<{ start: number; end: number }>();
   ```

4. Implement `AfterViewInit`:
   ```typescript
   ngAfterViewInit(): void {
     const viewportValue = this.viewport();
     if (viewportValue) {
       viewportValue.renderedRangeStream
         .pipe(
           debounceTime(100),
           takeUntilDestroyed(this.destroyRef)
         )
         .subscribe((range) => {
           this.renderedRangeChange.emit(range);
         });
     }
   }
   ```

## Definition of Done

- [ ] Implementation complete per acceptance criteria
- [ ] Tests from AX.1 re-enabled and passing
- [ ] Code follows project standards
- [ ] All validation commands pass:
  - [ ] Run `pnpm all`
  - [ ] Run `pnpm e2e:dms-material:chromium`
  - [ ] Run `pnpm e2e:dms-material:firefox`
  - [ ] Run `pnpm dupcheck`
  - [ ] Run `pnpm format`
  - [ ] Repeat all of these if any fail until they all pass

## Notes

- This completes the TDD GREEN phase for AX.1
- Enables virtual data access patterns in consuming components

## Related Stories

- **Previous**: Story AX.1 (TDD)
- **Next**: Story AX.3 (TDD for Dividend Deposits)
- **Epic**: Epic AX

---

## Dev Agent Record

### Status

Draft
