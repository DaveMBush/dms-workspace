# Story AU.4: Wire Summary Screen to Account Selection

## Story

**As a** developer
**I want** to wire the summary screen to react to account selection changes
**So that** the summary displays data for the currently selected account

## Context

**Current System:**

- Unit tests exist from AU.3 (currently disabled)
- AccountSelectionService exists from AU.2
- Summary screen exists but may need account selection integration

**Implementation Goal:**

- Wire summary component to AccountSelectionService
- Ensure data refreshes when account changes
- Enable and pass all unit tests from AU.3
- Follow TDD green phase

## Acceptance Criteria

### Functional Requirements

- [ ] Summary component subscribes to account selection changes
- [ ] Summary data refreshes automatically when account changes
- [ ] Correct account ID passed to all service calls
- [ ] Loading states display during account switch
- [ ] **CRITICAL** All unit tests from AU.3 enabled and passing

### Technical Requirements

- [ ] Use Angular effect() or computed() for reactivity
- [ ] Inject AccountSelectionService
- [ ] Handle null/undefined account ID gracefully
- [ ] Follow project patterns and coding standards
- [ ] No memory leaks (proper cleanup)

## Test-Driven Development Approach

### Step 1: Enable Tests from AU.3

Remove `.skip` from all tests in summary component test file.

### Step 2: Run Tests (Should Fail - RED)

```bash
pnpm nx test dms-material --testFile=summary
```

### Step 3: Implement Integration (GREEN)

```typescript
import { Component, effect, inject } from '@angular/core';
import { AccountSelectionService } from '../services/account-selection.service';

@Component({
  // ...
})
export class SummaryComponent {
  private accountSelection = inject(AccountSelectionService);

  constructor() {
    // React to account changes
    effect(() => {
      const accountId = this.accountSelection.selectedAccountId();
      if (accountId) {
        this.loadSummaryData(accountId);
      }
    });
  }

  private loadSummaryData(accountId: number): void {
    // Load summary data for the account
  }
}
```

### Step 4: Run Tests (Should Pass - GREEN)

```bash
pnpm nx test dms-material --testFile=summary
```

### Step 5: Manual Testing

- Test account switching in browser
- Verify data updates correctly
- Check for console errors

## Technical Notes

- May already be partially implemented from Epic AT
- Ensure no duplicate subscriptions
- Consider debouncing rapid account changes if needed
- Verify integration with existing summary data loading logic

## Dependencies

- Story AU.3 (tests)
- Story AU.2 (AccountSelectionService)
- Epic AS (Summary screen)

## Definition of Done

- [ ] All tests from AU.3 enabled and passing
- [ ] Component properly wired to account selection
- [ ] Manual testing confirms correct behavior
- [ ] No console errors or warnings
- [ ] Code reviewed and approved
- [ ] All validation commands pass
