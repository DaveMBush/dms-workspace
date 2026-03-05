# Story AU.1: TDD - Write Unit Tests for Account Selection Signal/Service

## Story

**As a** developer
**I want** to write unit tests for the account selection signal/service before implementation
**So that** I can follow test-driven development and ensure account selection updates propagate correctly

## Context

**Current System:**

- Account selection may already exist from previous epics (e.g., Epic AT)
- Need to verify or create a centralized account selection mechanism
- All screens need to react to account selection changes

**TDD Approach:**

- Write failing tests first (RED)
- Disable tests to keep CI green
- Implementation story will re-enable and make tests pass (GREEN)

## Acceptance Criteria

### Functional Requirements

- [ ] Unit tests written for account selection signal/service
- [ ] Tests cover account selection state
- [ ] Tests cover account change events
- [ ] Tests cover initial account load
- [ ] Tests cover edge cases (no account, invalid account)
- [ ] **CRITICAL** Tests are disabled with `.skip` to allow CI to pass

### Technical Requirements

- [ ] Use Vitest for unit testing
- [ ] Test signal state management
- [ ] Follow existing service test patterns
- [ ] Mock any HTTP dependencies

## Test-Driven Development Approach

### Step 1: Create Failing Unit Tests

Create or update account selection service test file with comprehensive tests:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

// DISABLE TESTS FOR CI - Will be enabled in implementation story
describe.skip('AccountSelectionService', () => {
  // Test setup
  let service: AccountSelectionService;

  beforeEach(() => {
    // Setup
  });

  it('should create service', () => {
    expect(service).toBeDefined();
  });

  it('should have initial account signal', () => {
    // Test initial state
  });

  it('should update account when selectAccount called', () => {
    // Test account selection
  });

  it('should emit account changes', () => {
    // Test observable emissions
  });

  it('should handle null account selection', () => {
    // Test edge case
  });

  // Add more test cases as needed
});
```

### Step 2: Verify Tests Fail

```bash
# Tests should fail because implementation doesn't exist yet
pnpm nx test dms-material
```

### Step 3: Keep Tests Disabled

- All tests must use `describe.skip()` or `it.skip()`
- This keeps CI green during TDD phase
- Tests will be enabled in AU.2

## Technical Notes

- Check if account selection service already exists from Epic AT or earlier
- If it exists, verify it has the necessary functionality
- If it doesn't exist, tests should define the desired API
- Consider using signals for reactive state management
- Consider using BehaviorSubject for account changes

## Dependencies

- Epic AT (may have partial account selection implemented)

## Definition of Done

- [ ] All test cases written and disabled with `.skip`
- [ ] Tests are well-structured and follow project patterns
- [ ] Test file runs without syntax errors
- [ ] CI pipeline remains green
- [ ] Code reviewed and approved
- [ ] All validation commands pass
