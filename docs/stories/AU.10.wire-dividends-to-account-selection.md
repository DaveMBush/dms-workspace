# Story AU.10: Wire Dividends to Account Selection

## Story

**As a** developer
**I want** to wire the dividends screen to react to account selection changes
**So that** the table displays dividends for the currently selected account

## Context

**Current System:**

- Unit tests exist from AU.9 (currently disabled)
- AccountSelectionService exists from AU.2
- Dividends screen exists with SmartNgRX state management

**Implementation Goal:**

- Wire dividends component to AccountSelectionService
- Ensure table refreshes when account changes
- Enable and pass all unit tests from AU.9
- Follow TDD green phase

## Acceptance Criteria

### Functional Requirements

- [ ] Dividends component subscribes to account selection changes
- [ ] Table data refreshes automatically when account changes
- [ ] Correct account ID passed to SmartNgRX actions/effects
- [ ] Loading states display during account switch
- [ ] **CRITICAL** All unit tests from AU.9 enabled and passing

### Technical Requirements

- [ ] Use Angular effect() for reactivity
- [ ] Inject AccountSelectionService
- [ ] Handle null/undefined account ID gracefully
- [ ] Integrate with SmartNgRX properly
- [ ] Follow project patterns and coding standards

## Test-Driven Development Approach

### Step 1: Enable Tests from AU.9

Remove `.skip` from all tests in dividends component test file.

### Step 2: Run Tests (Should Fail - RED)

```bash
pnpm nx test dms-material --testFile=dividends
```

### Step 3: Implement Integration (GREEN)

```typescript
import { Component, effect, inject } from '@angular/core';
import { AccountSelectionService } from '../services/account-selection.service';

@Component({
  // ...
})
export class DividendsComponent {
  private accountSelection = inject(AccountSelectionService);

  constructor() {
    // React to account changes
    effect(() => {
      const accountId = this.accountSelection.selectedAccountId();
      if (accountId) {
        this.loadDividends(accountId);
      }
    });
  }

  private loadDividends(accountId: number): void {
    // Load dividends data via SmartNgRX
  }
}
```

### Step 4: Run Tests (Should Pass - GREEN)

```bash
pnpm nx test dms-material --testFile=dividends
```

### Step 5: Manual Testing

- Test account switching in browser
- Verify table updates correctly
- Check for console errors

## Technical Notes

- May need to update SmartNgRX action to include accountId
- Consider lazy loading implications (Epic U)
- Ensure edit/delete functionality still works
- Verify integration with existing dialog functionality

## Dependencies

- Story AU.9 (tests)
- Story AU.2 (AccountSelectionService)
- Epic AQ (Dividends screen)

## Definition of Done

- [ ] All tests from AU.9 enabled and passing
- [ ] Component properly wired to account selection
- [ ] Manual testing confirms correct behavior
- [ ] No console errors or warnings
- [ ] Code reviewed and approved
- [ ] All validation commands pass
