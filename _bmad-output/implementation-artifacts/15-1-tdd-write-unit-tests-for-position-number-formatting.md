# Story 15.1: [TDD] Write Unit Tests for Position Number Formatting

Status: Approved

## Story

As a developer,
I want unit tests for position number formatting logic,
So that the formatting behavior is verified and protected against regressions.

## Acceptance Criteria

1. **Given** a number formatting function or formatter
   **When** I write unit tests for various input values
   **Then** tests verify correct output for values like 0, 100, 1000, 1234.56, 100000.00
   **And** tests verify 2 decimal places are always displayed
   **And** tests verify comma separators appear for values ≥ 1,000
   **And** tests verify negative values are handled correctly

2. **Given** the unit tests are written
   **When** I run the tests
   **Then** all tests pass (RED to GREEN)
   **And** I disable/skip the tests to allow CI to pass before implementation

## Definition of Done

- [ ] Unit tests written for number formatting logic
- [ ] Tests verify 2 decimal places, comma separators, negative values
- [ ] Tests initially pass (RED to GREEN)
- [ ] Tests disabled/skipped to allow CI merge
- [ ] All validation commands pass:
  - [ ] Run `pnpm all`
  - [ ] Run `pnpm e2e:dms-material:chromium`
  - [ ] Run `pnpm e2e:dms-material:firefox`
  - [ ] Run `pnpm dupcheck`
  - [ ] Run `pnpm format`
  - [ ] Repeat all of these if any fail until they all pass

## Tasks / Subtasks

- [ ] Locate Universe table Position column code (AC: 1)
  - [ ] Find Universe component: `apps/dms-material/src/app/pages/universe/`
  - [ ] Identify where Position values are displayed in template
  - [ ] Check if formatting logic exists or needs to be created
- [ ] Determine formatting approach (AC: 1)
  - [ ] Option 1: Angular DecimalPipe with pattern `'1.2-2'`
  - [ ] Option 2: Custom pipe for number formatting
  - [ ] Option 3: Utility function for formatting
  - [ ] Choose approach based on existing codebase patterns
- [ ] Write comprehensive unit tests (AC: 1)
  - [ ] Test zero: `0` → `"0.00"`
  - [ ] Test small numbers: `100` → `"100.00"`
  - [ ] Test thousands: `1000` → `"1,000.00"`
  - [ ] Test decimals: `1234.56` → `"1,234.56"`
  - [ ] Test large numbers: `100000` → `"100,000.00"`
  - [ ] Test negative numbers: `-1234.56` → `"-1,234.56"`
  - [ ] Test decimal rounding: `1234.567` → `"1,234.57"`
  - [ ] Test very small decimals: `0.01` → `"0.01"`
- [ ] Run tests to verify they pass (RED to GREEN) (AC: 2)
  - [ ] Run `pnpm test` or `pnpm vitest`
  - [ ] Verify all new tests pass
  - [ ] Fix any failing tests
- [ ] Skip/disable tests for CI (AC: 2)
  - [ ] Use `.skip` or `describe.skip` to disable tests
  - [ ] Add comment explaining tests are skipped for TDD workflow
  - [ ] Run tests again to verify they're skipped
  - [ ] Commit with clear message about TDD story

## Dev Notes

### TDD Workflow - RED to GREEN to SKIP

1. Write failing tests first (RED)
2. Implement minimal code to make tests pass (GREEN)
3. Skip tests to allow CI merge before full implementation
4. Story 15.2 will re-enable tests and complete implementation

### Angular Number Formatting Options

**Option 1: DecimalPipe (recommended if simple use case)**

```typescript
// In template
{{ position | number:'1.2-2' }}

// In test
import { DecimalPipe } from '@angular/common';
const pipe = new DecimalPipe('en-US');
expect(pipe.transform(1234.56, '1.2-2')).toBe('1,234.56');
```

**Option 2: Custom Pipe**

```typescript
@Pipe({ name: 'formatPosition', standalone: true })
export class FormatPositionPipe implements PipeTransform {
  transform(value: number): string {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }
}
```

**Option 3: Utility Function**

```typescript
export function formatPosition(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
```

### Test File Location

- If pipe: `apps/dms-material/src/app/pipes/format-position.pipe.spec.ts`
- If utility: `apps/dms-material/src/app/utils/format-position.spec.ts`
- Colocated with implementation file

### Edge Cases to Test

- `null` or `undefined` → should handle gracefully (return "0.00" or "-")
- `NaN` → should handle gracefully
- Infinity → should handle gracefully
- Very large numbers → should not break formatting

### Skipping Tests

```typescript
// Vitest
describe.skip('Position number formatting', () => {
  // tests here
});

// Or individual test
it.skip('should format 1000 as "1,000.00"', () => {
  // test here
});
```

### Project Structure Notes

- Follow Angular 21 patterns
- If creating a pipe, make it standalone: `standalone: true`
- Test file should be colocated with implementation file

### References

- [Source: _bmad-output/planning-artifacts/epics-2026-03-21.md#Story 15.1]
- [Source: apps/dms-material/src/app/pages/universe/]
- [Source: Angular DecimalPipe docs](https://angular.io/api/common/DecimalPipe)
- [Source: Intl.NumberFormat MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat)

## Dev Agent Record

### Agent Model Used

_To be filled by dev agent_

### Debug Log References

_To be filled by dev agent_

### Completion Notes List

_To be filled by dev agent_

### File List

_To be filled by dev agent_
