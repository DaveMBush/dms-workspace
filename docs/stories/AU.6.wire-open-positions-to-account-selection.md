# Story AU.6: Wire Open Positions to Account Selection

## Story

**As a** developer
**I want** to wire the open positions screen to react to account selection changes
**So that** the table displays positions for the currently selected account

## Context

**Current System:**

- Unit tests exist from AU.5 (currently disabled)
- AccountSelectionService exists from AU.2
- Open positions screen exists with SmartNgRX state management

**Implementation Goal:**

- Wire open positions component to AccountSelectionService
- Ensure table refreshes when account changes
- Enable and pass all unit tests from AU.5
- Follow TDD green phase

## Acceptance Criteria

### Functional Requirements

- [ ] Open positions component subscribes to account selection changes
- [ ] Table data refreshes automatically when account changes
- [ ] Correct account ID passed to SmartNgRX actions/effects
- [ ] Loading states display during account switch
- [ ] **CRITICAL** All unit tests from AU.5 enabled and passing

### Technical Requirements

- [ ] Use Angular effect() for reactivity
- [ ] Inject AccountSelectionService
- [ ] Handle null/undefined account ID gracefully
- [ ] Integrate with SmartNgRX properly
- [ ] Follow project patterns and coding standards

## Test-Driven Development Approach

### Step 1: Enable Tests from AU.5

Remove `.skip` from all tests in open positions component test file.

### Step 2: Run Tests (Should Fail - RED)

```bash
pnpm nx test dms-material --testFile=open-positions
```

### Step 3: Implement Integration (GREEN)

```typescript
import { Component, effect, inject } from '@angular/core';
import { AccountSelectionService } from '../services/account-selection.service';

@Component({
  // ...
})
export class OpenPositionsComponent {
  private accountSelection = inject(AccountSelectionService);
  
  constructor() {
    // React to account changes
    effect(() => {
      const accountId = this.accountSelection.selectedAccountId();
      if (accountId) {
        this.loadOpenPositions(accountId);
      }
    });
  }
  
  private loadOpenPositions(accountId: number): void {
    // Load open positions data via SmartNgRX
  }
}
```

### Step 4: Run Tests (Should Pass - GREEN)

```bash
pnpm nx test dms-material --testFile=open-positions
```

### Step 5: Manual Testing

- Test account switching in browser
- Verify table updates correctly
- Check for console errors

## Technical Notes

- May need to update SmartNgRX action to include accountId
- Consider lazy loading implications
- Ensure proper cleanup to avoid memory leaks
- Verify integration with existing table functionality

## Dependencies

- Story AU.5 (tests)
- Story AU.2 (AccountSelectionService)
- Epic AO (Open positions screen)

## Definition of Done

- [ ] All tests from AU.5 enabled and passing
- [ ] Component properly wired to account selection
- [ ] Manual testing confirms correct behavior
- [ ] No console errors or warnings
- [ ] Code reviewed and approved
- [ ] All validation commands pass
