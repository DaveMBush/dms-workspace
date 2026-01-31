# Story AM.3: Write Unit Tests for Symbol Search/Autocomplete - TDD RED Phase

## Story

**As a** developer
**I want** to write comprehensive unit tests for symbol search and autocomplete functionality
**So that** I have failing tests that define the expected behavior (TDD RED phase)

## Context

**Current System:**

- Add Symbol dialog exists from Story AM.2
- Need to add symbol search/autocomplete functionality
- Search should query external API for symbol lookup

**Implementation Approach:**

- Write unit tests for symbol search service
- Write unit tests for autocomplete integration in dialog
- Disable tests after writing to allow CI to pass
- Tests will be re-enabled in Story AM.4

## Acceptance Criteria

### Functional Requirements

- [ ] Unit tests written for SymbolSearchService
  - [ ] Test API call to symbol search endpoint
  - [ ] Test debouncing of search requests
  - [ ] Test result filtering and mapping
  - [ ] Test error handling
- [ ] Unit tests written for autocomplete in dialog
  - [ ] Test autocomplete displays results
  - [ ] Test selecting a result fills the form
  - [ ] Test "no results" state
  - [ ] Test loading state during search
- [ ] All tests initially fail (RED phase)
- [ ] Tests disabled with \`xit()\` or \`.skip\` to allow CI to pass

### Technical Requirements

- [ ] Tests follow existing testing patterns
- [ ] Mock HTTP requests properly
- [ ] Test async behavior correctly
- [ ] Test debounce timing

## Implementation Details

### Step 1: Write SymbolSearchService Tests

\`\`\`typescript
describe('SymbolSearchService', () => {
describe('searchSymbols', () => {
it('should call symbol search API');
it('should debounce requests by 300ms');
it('should return array of symbol results');
it('should handle empty results');
it('should handle API errors');
});
});
\`\`\`

### Step 2: Write Autocomplete Tests

\`\`\`typescript
describe('AddSymbolDialogComponent', () => {
describe('symbol autocomplete', () => {
it('should show autocomplete dropdown on input');
it('should display search results');
it('should select symbol on click');
it('should show loading indicator during search');
it('should show "no results" message when appropriate');
});
});
\`\`\`

### Step 3: Run Tests and Verify RED Phase

\`\`\`bash
pnpm test:dms-material
\`\`\`

### Step 4: Disable Tests for CI

\`\`\`typescript
xit('should call symbol search API', () => {
// test code
});
\`\`\`

## Definition of Done

- [ ] All unit tests written and initially failing (RED phase)
- [ ] Tests cover search and autocomplete scenarios
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
- Tests define autocomplete behavior before implementation
- Symbol search may use Yahoo Finance or similar API

## Related Stories

- **Prerequisite**: Story AM.2
- **Next**: Story AM.4 (Implementation)
- **Pattern Reference**: Story AM.1

## QA Results

### Review Date: 2024-12-19

### Reviewed By: Quinn (Test Architect)

### Code Quality Assessment

Excellent implementation of TDD RED phase with comprehensive test coverage. All acceptance criteria fully met with 27 unit tests written covering both SymbolSearchService and autocomplete integration. Tests properly disabled for CI with .skip to allow builds to pass while defining expected behavior for the GREEN phase.

### Refactoring Performed

No refactoring needed - code quality is excellent and follows all project conventions.

### Compliance Check

- Coding Standards: ✓ All linting rules pass, code follows TypeScript and Angular best practices
- Project Structure: ✓ Files organized according to unified project structure
- Testing Strategy: ✓ Comprehensive unit tests written following Vitest patterns with proper mocking
- All ACs Met: ✓ All acceptance criteria completed successfully

### Improvements Checklist

- [x] Comprehensive test coverage for SymbolSearchService (14 tests)
- [x] Complete autocomplete integration tests (13 tests)
- [x] Proper test disabling for CI (.skip used consistently)
- [x] All validation commands passing (pnpm all, e2e, dupcheck, format)

### Security Review

No security concerns identified. Service appropriately handles external API calls with proper error handling.

### Performance Considerations

Debouncing logic tested (300ms delay), no performance issues identified.

### Files Modified During Review

None - implementation quality was excellent as delivered.

### Gate Status

Gate: PASS → docs/qa/gates/AM.3-tdd-symbol-search.yml

### Recommended Status

✓ Ready for Done
