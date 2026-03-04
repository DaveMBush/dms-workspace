# Story AU.5: TDD - Open Positions Account Selection Tests

## Story

**As a** developer
**I want** to write unit tests for open positions screen account selection integration
**So that** I can ensure the open positions screen properly reacts to account changes

## Context

**Current System:**

- AccountSelectionService exists from AU.2
- Open positions screen exists from Epic AO
- Need to verify comprehensive test coverage for account switching

**TDD Approach:**

- Write failing tests first (RED)
- Disable tests to keep CI green  
- Implementation story AU.6 will re-enable and make tests pass (GREEN)

## Acceptance Criteria

### Functional Requirements

- [ ] Unit tests written for open positions screen account selection
- [ ] Tests verify component subscribes to account changes
- [ ] Tests verify data refresh on account change
- [ ] Tests verify correct account ID passed to service calls
- [ ] Tests verify table updates with new account data
- [ ] **CRITICAL** Tests are disabled with `.skip` to allow CI to pass

### Technical Requirements

- [ ] Use Vitest for unit testing
- [ ] Mock AccountSelectionService
- [ ] Mock OpenPositionsService dependencies
- [ ] Test signal/effect integration
- [ ] Follow existing component test patterns

## Test-Driven Development Approach

### Step 1: Create Failing Unit Tests

Update open positions component test file with account selection tests:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

// DISABLE TESTS FOR CI - Will be enabled in implementation story AU.6
describe.skip('OpenPositionsComponent - Account Selection', () => {
  let component: OpenPositionsComponent;
  let accountSelectionService: AccountSelectionService;

  beforeEach(() => {
    // Setup with mocked AccountSelectionService
  });

  it('should subscribe to account selection changes', () => {
    // Test that component reacts to account changes
  });

  it('should load positions for selected account', () => {
    // Test that correct account ID is used
  });

  it('should refresh table when account changes', () => {
    // Test table refresh logic
  });

  it('should clear positions when account deselected', () => {
    // Test edge case
  });

  // Add more test cases as needed
});
```

### Step 2: Verify Tests Fail

```bash
pnpm nx test dms-material --testFile=open-positions
```

### Step 3: Keep Tests Disabled

- All tests must use `describe.skip()` or `it.skip()`
- This keeps CI green during TDD phase
- Tests will be enabled in AU.6

## Technical Notes

- Open positions table uses SmartNgRX for state management
- May need to test SmartNgRX entity adapter integration
- Consider testing lazy loading with account changes
- Ensure tests cover cleanup/unsubscription

## Dependencies

- Story AU.2 (AccountSelectionService implementation)
- Epic AO (Open positions screen implementation)

## Definition of Done

- [ ] All test cases written and disabled with `.skip`
- [ ] Tests are well-structured and follow project patterns
- [ ] Test file runs without syntax errors
- [ ] CI pipeline remains green
- [ ] Code reviewed and approved
- [ ] All validation commands pass
