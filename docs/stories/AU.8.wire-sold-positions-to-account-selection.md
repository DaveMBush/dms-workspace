# Story AU.8: Wire Sold Positions to Account Selection

## Story

**As a** developer
**I want** to wire the sold positions screen to react to account selection changes
**So that** the table displays sold positions for the currently selected account

## Context

**Current System:**

- Unit tests exist from AU.7 (currently disabled)
- AccountSelectionService exists from AU.2
- Sold positions screen exists with SmartNgRX state management

**Implementation Goal:**

- Wire sold positions component to AccountSelectionService
- Ensure table and capital gains refresh when account changes
- Enable and pass all unit tests from AU.7
- Follow TDD green phase

## Acceptance Criteria

### Functional Requirements

- [ ] Sold positions component subscribes to account selection changes
- [ ] Table data refreshes automatically when account changes
- [ ] Capital gains recalculate for new account
- [ ] Correct account ID passed to SmartNgRX actions/effects
- [ ] **CRITICAL** All unit tests from AU.7 enabled and passing

### Technical Requirements

- [ ] Use Angular effect() for reactivity
- [ ] Inject AccountSelectionService
- [ ] Handle null/undefined account ID gracefully
- [ ] Integrate with SmartNgRX properly
- [ ] Follow project patterns and coding standards

## Test-Driven Development Approach

### Step 1: Enable Tests from AU.7

Remove `.skip` from all tests in sold positions component test file.

### Step 2: Run Tests (Should Fail - RED)

```bash
pnpm nx test dms-material --testFile=sold-positions
```

### Step 3: Implement Integration (GREEN)

```typescript
import { Component, effect, inject } from '@angular/core';
import { AccountSelectionService } from '../services/account-selection.service';

@Component({
  // ...
})
export class SoldPositionsComponent {
  private accountSelection = inject(AccountSelectionService);
  
  constructor() {
    // React to account changes
    effect(() => {
      const accountId = this.accountSelection.selectedAccountId();
      if (accountId) {
        this.loadSoldPositions(accountId);
      }
    });
  }
  
  private loadSoldPositions(accountId: number): void {
    // Load sold positions data via SmartNgRX
    // Capital gains will automatically recalculate
  }
}
```

### Step 4: Run Tests (Should Pass - GREEN)

```bash
pnpm nx test dms-material --testFile=sold-positions
```

### Step 5: Manual Testing

- Test account switching in browser
- Verify table and capital gains update correctly
- Check for console errors

## Technical Notes

- May need to update SmartNgRX action to include accountId
- Ensure capital gains calculations use correct account data
- Consider lazy loading implications
- Verify date filtering still works with account switching

## Dependencies

- Story AU.7 (tests)
- Story AU.2 (AccountSelectionService)
- Epic AP (Sold positions screen)

## Definition of Done

- [ ] All tests from AU.7 enabled and passing
- [ ] Component properly wired to account selection
- [ ] Manual testing confirms correct behavior
- [ ] No console errors or warnings
- [ ] Code reviewed and approved
- [ ] All validation commands pass
