# Story AM.3: Write Unit Tests for Symbol Search/Autocomplete - TDD RED Phase

## Story

**As a** developer
**I want** to write comprehensive unit tests for symbol search and autocomplete functionality
**So that** I have failing tests that define the expected behavior (TDD RED phase)

## Acceptance Criteria

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
- [ ] Tests disabled with `xit()` or `.skip` to allow CI to pass

## Implementation Approach

1. Write unit tests for SymbolSearchService
2. Write unit tests for autocomplete integration in dialog
3. Disable tests after writing to allow CI to pass
4. Tests will be re-enabled in Story AM.4

## Related Stories

- Prerequisite: Story AM.2
- Next: Story AM.4 (Implementation)
