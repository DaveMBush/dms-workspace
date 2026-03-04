# Story AU.11: Add Unit Tests for Integration Scenarios

## Story

**As a** developer
**I want** to create comprehensive unit tests for account selection integration scenarios
**So that** I can ensure all components work together correctly

## Context

**Current System:**

- All individual screens wired to account selection (AU.2-AU.10)
- Each screen has component-level tests
- Need broader integration testing for edge cases

**Problem:**

- Need to test cross-component behavior
- Need to test edge cases and error scenarios
- Need to ensure no memory leaks across components
- Need to test rapid account switching

## Acceptance Criteria

### Functional Requirements

- [ ] Integration tests for account selection service
- [ ] Tests for rapid account switching
- [ ] Tests for concurrent data loading
- [ ] Tests for error handling across components
- [ ] Tests for memory leak prevention
- [ ] Tests for edge cases (null account, invalid account)

### Technical Requirements

- [ ] Use Vitest for unit testing
- [ ] Mock HTTP services
- [ ] Test signal propagation
- [ ] Test effect cleanup
- [ ] Follow testing best practices

## Test Scenarios

### Scenario 1: Rapid Account Switching

```typescript
describe('Account Selection Integration', () => {
  it('should handle rapid account switching without race conditions', () => {
    // Switch accounts rapidly
    // Verify only final account data is loaded
  });
});
```

### Scenario 2: Cross-Component State

```typescript
it('should update all components when account changes', () => {
  // Change account
  // Verify summary, open positions, sold positions, and dividends all update
});
```

### Scenario 3: Error Handling

```typescript
it('should handle errors gracefully when switching accounts', () => {
  // Simulate HTTP error
  // Verify error states in all components
});
```

### Scenario 4: Memory Leaks

```typescript
it('should not leak memory when switching accounts repeatedly', () => {
  // Switch accounts many times
  // Verify no memory growth (mock-based check)
});
```

### Scenario 5: Initial Load

```typescript
it('should load correct account on app startup', () => {
  // Test initial account from route/storage
  // Verify all components load correct data
});
```

## Tasks / Subtasks

- [ ] Create integration test file
- [ ] Implement rapid switching tests
- [ ] Implement cross-component tests
- [ ] Implement error handling tests
- [ ] Implement memory leak prevention tests
- [ ] Implement initial load tests
- [ ] Run all tests and verify passing
- [ ] Review test coverage

## Technical Notes

- These tests complement component-level tests
- Focus on integration between AccountSelectionService and components
- May need test harness to simulate multi-component environment
- Consider using TestBed with multiple components

## Dependencies

- Stories AU.2, AU.4, AU.6, AU.8, AU.10 (all implementations)

## Definition of Done

- [ ] All integration test scenarios implemented
- [ ] All tests passing
- [ ] Test coverage meets standards
- [ ] No flaky tests
- [ ] Code reviewed and approved
- [ ] All validation commands pass
