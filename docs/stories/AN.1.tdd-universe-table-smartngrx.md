# Story AN.1: Write Unit Tests for Universe Table SmartNgRX Integration - TDD RED Phase

## Story

**As a** developer
**I want** to write comprehensive unit tests for universe table SmartNgRX integration
**So that** I have failing tests that define the expected behavior (TDD RED phase)

## Context

**Current System:**

- Global/Universe screen exists with base table component
- Universe SmartNgRX entities are defined
- Need to establish test-first approach for table data integration

**Implementation Approach:**

- Write unit tests for GlobalUniverseComponent data loading
- Write unit tests for SmartNgRX selector usage
- Disable tests after writing to allow CI to pass
- Tests will be re-enabled in Story AN.2

## Acceptance Criteria

### Functional Requirements

- [ ] Unit tests written for GlobalUniverseComponent
  - [ ] Test component initializes universe data load
  - [ ] Test table displays universe entries from SmartNgRX store
  - [ ] Test loading state handling
  - [ ] Test empty state handling
  - [ ] Test error state handling
- [ ] Unit tests written for universe selectors
  - [ ] Test selectAllUniverseEntries selector
  - [ ] Test selector returns sorted data
- [ ] All tests initially fail (RED phase)
- [ ] Tests disabled with \`xit()\` or \`.skip\` to allow CI to pass

### Technical Requirements

- [ ] Tests follow existing testing patterns
- [ ] Mock SmartNgRX store properly configured
- [ ] Test coverage includes edge cases
- [ ] Test descriptions are clear and specific

## Implementation Details

### Step 1: Write GlobalUniverseComponent Tests

Create or update test file for the component:

\`\`\`typescript
describe('GlobalUniverseComponent', () => {
// Test data loading
xit('should dispatch load action on init');
xit('should select universe entries from store');

// Test state handling
xit('should display loading indicator while data loads');
xit('should display empty state when no entries');
xit('should display error message on load failure');

// Test data display
xit('should pass universe entries to table');
xit('should display universe entries in correct order');
});
\`\`\`

### Step 2: Write Selector Tests

\`\`\`typescript
describe('Universe Selectors', () => {
describe('selectAllUniverseEntries', () => {
xit('should return all universe entries');
xit('should return entries sorted by symbol');
xit('should return empty array when no entries');
});
});
\`\`\`

### Step 3: Run Tests and Verify RED Phase

\`\`\`bash
pnpm test:dms-material
\`\`\`

Verify all new tests are skipped.

### Step 4: Confirm Tests Would Fail

Temporarily remove \`.skip\` from one test to verify it fails, then re-add \`.skip\`.

## Definition of Done

- [ ] All unit tests written and disabled (RED phase)
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
- Story AN.2 will implement the functionality and re-enable tests

## Related Stories

- **Next**: Story AN.2 (Implementation)
- **Epic**: Epic AN
- **Pattern Reference**: Story AM.1 (Similar TDD RED phase)
