# Story AU.3: TDD - Summary Screen Account Selection Tests

## Story

**As a** developer
**I want** to write unit tests for summary screen account selection integration
**So that** I can ensure the summary screen properly reacts to account changes

## Context

**Current System:**

- AccountSelectionService exists from AU.2
- Summary screen may already be wired to account selection from Epic AT/AS
- Need to verify comprehensive test coverage for account switching

**TDD Approach:**

- Write failing tests first (RED)
- Disable tests to keep CI green
- Implementation story AU.4 will re-enable and make tests pass (GREEN)

## Acceptance Criteria

### Functional Requirements

- [ ] Unit tests written for summary screen account selection
- [ ] Tests verify component subscribes to account changes
- [ ] Tests verify data refresh on account change
- [ ] Tests verify correct account ID passed to service calls
- [ ] Tests verify loading states during account switch
- [ ] **CRITICAL** Tests are disabled with `.skip` to allow CI to pass

### Technical Requirements

- [ ] Use Vitest for unit testing
- [ ] Mock AccountSelectionService
- [ ] Mock data service dependencies
- [ ] Test signal/effect integration
- [ ] Follow existing component test patterns

## Test-Driven Development Approach

### Step 1: Create Failing Unit Tests

Update summary component test file with account selection tests:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

// DISABLE TESTS FOR CI - Will be enabled in implementation story AU.4
describe.skip('SummaryComponent - Account Selection', () => {
  let component: SummaryComponent;
  let accountSelectionService: AccountSelectionService;

  beforeEach(() => {
    // Setup with mocked AccountSelectionService
  });

  it('should subscribe to account selection changes', () => {
    // Test that component reacts to account changes
  });

  it('should load data for selected account', () => {
    // Test that correct account ID is used
  });

  it('should refresh data when account changes', () => {
    // Test data refresh logic
  });

  it('should handle account change during loading', () => {
    // Test edge case
  });

  // Add more test cases as needed
});
```

### Step 2: Verify Tests Fail

```bash
pnpm nx test dms-material --testFile=summary
```

### Step 3: Keep Tests Disabled

- All tests must use `describe.skip()` or `it.skip()`
- This keeps CI green during TDD phase
- Tests will be enabled in AU.4

## Technical Notes

- Summary screen may already have partial account selection wiring
- Tests should verify the integration still works correctly
- Consider testing both effect() and computed() patterns
- Ensure tests cover cleanup/unsubscription

## Dependencies

- Story AU.2 (AccountSelectionService implementation)
- Epic AS (Summary screen implementation)

## Definition of Done

- [ ] All test cases written and disabled with `.skip`
- [ ] Tests are well-structured and follow project patterns
- [ ] Test file runs without syntax errors
- [ ] CI pipeline remains green
- [ ] Code reviewed and approved
- [ ] All validation commands pass
