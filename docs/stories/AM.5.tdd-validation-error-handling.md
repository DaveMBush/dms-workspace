# Story AM.5: Write Unit Tests for Validation and Error Handling - TDD RED Phase

## Story

**As a** developer
**I want** to write comprehensive unit tests for validation and error handling in add symbol flow
**So that** I have failing tests that define the expected behavior (TDD RED phase)

## Context

**Current System:**

- Add Symbol dialog with search functionality from AM.4
- Need robust validation and error handling
- Must handle duplicate symbols, invalid input, API errors

**Implementation Approach:**

- Write unit tests for all validation scenarios
- Write unit tests for error handling
- Disable tests after writing to allow CI to pass
- Tests will be re-enabled in Story AM.6

## Acceptance Criteria

### Functional Requirements

- [ ] Unit tests for duplicate symbol validation
- [ ] Unit tests for invalid symbol format
- [ ] Unit tests for API 409 Conflict errors
- [ ] Unit tests for network/API errors
- [ ] Unit tests for empty/whitespace input
- [ ] All tests initially fail (RED phase)
- [ ] Tests disabled with \`xit()\` or \`.skip\`

### Technical Requirements

- [ ] Tests cover all error scenarios
- [ ] Mock HTTP errors properly
- [ ] Test error message display
- [ ] Test form state during errors

## Implementation Details

### Step 1: Write Validation Tests

\`\`\`typescript
describe('AddSymbolDialogComponent validation', () => {
  it('should show error for duplicate symbol');
  it('should show error for invalid symbol format');
  it('should prevent submission with errors');
  it('should clear errors on input change');
});
\`\`\`

### Step 2: Write Error Handling Tests

\`\`\`typescript
describe('AddSymbolDialogComponent error handling', () => {
  it('should handle 409 Conflict error');
  it('should handle 500 Server error');
  it('should handle network errors');
  it('should show appropriate error messages');
  it('should keep dialog open on error');
});
\`\`\`

### Step 3: Run Tests and Verify RED Phase

\`\`\`bash
pnpm test:dms-material
\`\`\`

### Step 4: Disable Tests for CI

\`\`\`typescript
xit('should handle 409 Conflict error', () => {
  // test code
});
\`\`\`

## Definition of Done

- [ ] All validation tests written and failing
- [ ] All error handling tests written and failing
- [ ] Tests disabled to allow CI to pass
- [ ] All validation commands pass:
  - [ ] Run \`pnpm all\`
  - [ ] Run \`pnpm e2e:dms-material\`
  - [ ] Run \`pnpm dupcheck\`
  - [ ] Run \`pnpm format\`
  - [ ] Repeat all of these if any fail until they all pass
- [ ] Code reviewed and approved

## Notes

- This is the TDD RED phase
- Comprehensive error coverage essential for user experience
- Story AM.6 will implement all validation and error handling

## Related Stories

- **Prerequisite**: Story AM.4
- **Next**: Story AM.6 (Implementation)
- **Pattern Reference**: Story AM.1, AM.3
