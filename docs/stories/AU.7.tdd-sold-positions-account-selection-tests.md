# Story AU.7: TDD - Sold Positions Account Selection Tests

## Story

**As a** developer
**I want** to write unit tests for sold positions screen account selection integration
**So that** I can ensure the sold positions screen properly reacts to account changes

## Context

**Current System:**

- AccountSelectionService exists from AU.2
- Sold positions screen exists from Epic AP
- Need to verify comprehensive test coverage for account switching

**TDD Approach:**

- Write failing tests first (RED)
- Disable tests to keep CI green
- Implementation story AU.8 will re-enable and make tests pass (GREEN)

## Acceptance Criteria

### Functional Requirements

- [ ] Unit tests written for sold positions screen account selection
- [ ] Tests verify component subscribes to account changes
- [ ] Tests verify data refresh on account change
- [ ] Tests verify correct account ID passed to service calls
- [ ] Tests verify table updates with new account data
- [ ] **CRITICAL** Tests are disabled with `.skip` to allow CI to pass

### Technical Requirements

- [ ] Use Vitest for unit testing
- [ ] Mock AccountSelectionService
- [ ] Mock SoldPositionsService dependencies
- [ ] Test signal/effect integration
- [ ] Follow existing component test patterns

## Test-Driven Development Approach

### Step 1: Create Failing Unit Tests

Update sold positions component test file with account selection tests:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

// DISABLE TESTS FOR CI - Will be enabled in implementation story AU.8
describe.skip('SoldPositionsComponent - Account Selection', () => {
  let component: SoldPositionsComponent;
  let accountSelectionService: AccountSelectionService;

  beforeEach(() => {
    // Setup with mocked AccountSelectionService
  });

  it('should subscribe to account selection changes', () => {
    // Test that component reacts to account changes
  });

  it('should load sold positions for selected account', () => {
    // Test that correct account ID is used
  });

  it('should refresh table when account changes', () => {
    // Test table refresh logic
  });

  it('should update capital gains for new account', () => {
    // Test capital gains calculation
  });

  // Add more test cases as needed
});
```

### Step 2: Verify Tests Fail

```bash
pnpm nx test dms-material --testFile=sold-positions
```

### Step 3: Keep Tests Disabled

- All tests must use `describe.skip()` or `it.skip()`
- This keeps CI green during TDD phase
- Tests will be enabled in AU.8

## Technical Notes

- Sold positions uses SmartNgRX for state management
- Capital gains calculations may depend on account-specific data
- Consider testing date filtering with account changes
- Ensure tests cover cleanup/unsubscription

## Dependencies

- Story AU.2 (AccountSelectionService implementation)
- Epic AP (Sold positions screen implementation)

## Definition of Done

- [ ] All test cases written and disabled with `.skip`
- [ ] Tests are well-structured and follow project patterns
- [ ] Test file runs without syntax errors
- [ ] CI pipeline remains green
- [ ] Code reviewed and approved
- [ ] All validation commands pass
