# Story AU.2: Implement Account Selection Signal/Service

## Story

**As a** developer
**I want** to implement or verify the account selection signal/service
**So that** all screens can reactively respond to account changes

## Context

**Current System:**

- Unit tests exist from AU.1 (currently disabled)
- Account selection mechanism may already exist from Epic AT
- Need centralized state management for selected account

**Implementation Goal:**

- Create or enhance AccountSelectionService
- Manage selected account state via signals
- Enable and pass all unit tests from AU.1
- Follow TDD green phase

## Acceptance Criteria

### Functional Requirements

- [ ] AccountSelectionService exists with clear API
- [ ] Service exposes selected account as signal
- [ ] Service provides method to change selected account
- [ ] Service handles initial account load from route/storage
- [ ] **CRITICAL** All unit tests from AU.1 enabled and passing

### Technical Requirements

- [ ] Use Angular signals for reactive state
- [ ] Injectable service with providedIn: 'root'
- [ ] Type-safe account ID handling
- [ ] Consider persistence (localStorage or route params)
- [ ] Follow project patterns and coding standards

## Test-Driven Development Approach

### Step 1: Enable Tests from AU.1

Remove `.skip` from all tests:

```typescript
// Was: describe.skip('AccountSelectionService', ()
describe('AccountSelectionService', () => {
  // ... existing tests
});
```

### Step 2: Run Tests (Should Fail - RED)

```bash
pnpm nx test dms-material
```

### Step 3: Implement Service (GREEN)

Create or update `apps/dms-material/src/app/services/account-selection.service.ts`:

```typescript
import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class AccountSelectionService {
  // Selected account ID as signal
  private _selectedAccountId = signal<number | null>(null);
  public selectedAccountId = this._selectedAccountId.asReadonly();

  // Method to select account
  selectAccount(accountId: number | null): void {
    this._selectedAccountId.set(accountId);
  }

  // Optional: Get current account ID
  getCurrentAccountId(): number | null {
    return this._selectedAccountId();
  }
}
```

### Step 4: Run Tests (Should Pass - GREEN)

```bash
pnpm nx test dms-material
```

### Step 5: Refactor if Needed

- Optimize implementation
- Add persistence if needed
- Ensure all tests still pass

## Technical Notes

- If service already exists, enhance it to meet all requirements
- Consider persisting selection in localStorage or route params
- Signal allows reactive components to auto-update
- May need to integrate with routing for deep links

## Dependencies

- Story AU.1 (tests)
- Epic AT (may have existing partial implementation)

## Definition of Done

- [ ] All tests from AU.1 enabled and passing
- [ ] Service implemented and follows coding standards
- [ ] Integration tested with existing components
- [ ] No console errors or warnings
- [ ] Code reviewed and approved
- [ ] All validation commands pass
