# Story AM.1: Write Unit Tests for Add Symbol Dialog - TDD RED Phase

## Story

**As a** developer
**I want** to write comprehensive unit tests for the add symbol dialog functionality
**So that** I have failing tests that define the expected behavior (TDD RED phase)

## Context

**Current System:**

- Global/Universe screen exists with table display
- Add Symbol button is present in the UI but not fully wired
- Need to establish test-first approach for add symbol functionality

**Implementation Approach:**

- Write unit tests for AddSymbolDialogComponent
- Write unit tests for universe service's addSymbol method
- Disable tests after implementation to allow CI to pass
- Tests will be re-enabled in Story AM.2

## Acceptance Criteria

### Functional Requirements

- [ ] Unit tests written for AddSymbolDialogComponent
  - [ ] Test dialog opens with correct configuration
  - [ ] Test form initialization and validation
  - [ ] Test symbol input field behavior
  - [ ] Test submit button state management
  - [ ] Test cancel button behavior
- [ ] Unit tests written for UniverseService.addSymbol()
  - [ ] Test API call with correct endpoint
  - [ ] Test request payload structure
  - [ ] Test success response handling
  - [ ] Test error response handling
- [ ] All tests initially fail (RED phase)
- [ ] Tests disabled with \`xit()\` or \`.skip\` to allow CI to pass

### Technical Requirements

- [ ] Tests follow existing testing patterns
- [ ] Mock dependencies properly configured
- [ ] Test coverage includes edge cases
- [ ] Test descriptions are clear and specific

## Implementation Details

### Step 1: Write AddSymbolDialogComponent Tests

Create or update test file for the dialog component:

\`\`\`typescript
describe('AddSymbolDialogComponent', () => {
// Test dialog initialization
it('should create dialog with correct configuration');

// Test form validation
it('should require symbol input');
it('should validate symbol format');

// Test submit behavior
it('should call addSymbol on valid submit');
it('should disable submit button when form invalid');

// Test cancel behavior
it('should close dialog on cancel');
});
\`\`\`

### Step 2: Write UniverseService.addSymbol Tests

\`\`\`typescript
describe('UniverseService', () => {
describe('addSymbol', () => {
it('should call POST /api/universe with symbol data');
it('should return universe entry on success');
it('should handle 409 conflict error');
it('should handle network errors');
});
});
\`\`\`

### Step 3: Run Tests and Verify RED Phase

\`\`\`bash
pnpm test:dms-material
\`\`\`

Verify all new tests fail as expected.

### Step 4: Disable Tests for CI

Change \`it()\` to \`xit()\` or use \`.skip\`:

\`\`\`typescript
xit('should create dialog with correct configuration', () => {
// test code
});
\`\`\`

## Definition of Done

- [ ] All unit tests written and initially failing (RED phase)
- [ ] Tests cover all acceptance criteria scenarios
- [ ] Tests disabled to allow CI to pass
- [ ] Test code follows project conventions
- [ ] All validation commands pass:
  - [ ] Run \`pnpm all\`
  - [ ] Run \`pnpm e2e:dms-material\`
  - [ ] Run \`pnpm dupcheck\`
  - [ ] Run \`pnpm format\`
  - [ ] Repeat all of these if any fail until they all pass
- [ ] Code reviewed and approved

## Notes

- This is the TDD RED phase
- Tests should fail because implementation doesn't exist yet
- Tests must be disabled before merge to allow CI to pass
- Story AM.2 will implement the functionality and re-enable tests

## Related Stories

- **Next**: Story AM.2 (Implementation)
- **Pattern Reference**: Story AK.3, AL.3 (Similar TDD RED phases)
