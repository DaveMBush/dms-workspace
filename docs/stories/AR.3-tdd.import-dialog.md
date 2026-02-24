# Story AR.3-TDD: Write Unit Tests for Import UI Dialog - TDD RED Phase

**Status:** Draft

## Story

**As a** developer
**I want** to write comprehensive unit tests for the import dialog UI
**So that** I have failing tests that define the expected UI behavior (TDD RED phase)

## Context

**Current System:**

- Import service and endpoint implemented in AR.2
- Need UI dialog on Global/Universe screen to trigger imports
- Dialog should allow file selection and show progress/results

**Implementation Approach:**

- Write unit tests for import dialog component
- Write tests for dialog integration with Global/Universe screen
- Disable tests after writing to allow CI to pass
- Tests will be re-enabled in Story AR.3

## Acceptance Criteria

### Functional Requirements

1. [ ] All unit tests written for import dialog component
2. [ ] Tests verify dialog can be opened from Global/Universe screen
3. [ ] Tests verify file selection UI
4. [ ] Tests verify upload progress indication
5. [ ] Tests verify success/error message display
6. [ ] All tests initially fail (RED phase)
7. [ ] Tests disabled with `xit()` or `.skip` to allow CI to pass

### Technical Requirements

1. [ ] Tests follow existing testing patterns
2. [ ] Mock dependencies properly configured (HTTP client, dialog service)
3. [ ] Test coverage includes edge cases
4. [ ] Test descriptions are clear and specific
5. [ ] Tests use Angular TestBed

## Tasks / Subtasks

- [ ] Create test file for import dialog component (AC: 1)
  - [ ] Test dialog initialization
  - [ ] Test file input rendering
  - [ ] Test file selection handling
  - [ ] Test upload button enablement
  - [ ] Test cancel button
  - [ ] Test progress indicator during upload
  - [ ] Test success message display
  - [ ] Test error message display
  - [ ] Test dialog close on success
  - [ ] Test dialog data passing (e.g., account filter)
- [ ] Create tests for Global/Universe integration (AC: 2)
  - [ ] Test "Import Transactions" button exists
  - [ ] Test button opens dialog
  - [ ] Test dialog receives context data
  - [ ] Test data refresh after successful import
- [ ] Write edge case tests (AC: 3)
  - [ ] Test invalid file type selection
  - [ ] Test empty file selection
  - [ ] Test upload failure
  - [ ] Test network error
  - [ ] Test large file handling
- [ ] Disable all tests using .skip (AC: 7)
- [ ] Verify tests fail before disabling (AC: 6)
- [ ] Run validation commands

## Dev Notes

### Testing Standards

- **Test Location:** `apps/dms-material/src/**/*.component.spec.ts`
- **Testing Framework:** Vitest with Angular TestBed
- **Patterns:** Use AAA (Arrange-Act-Assert) pattern
- **Coverage:** Target >80% coverage for dialog component
- **Mocking:** Mock HttpClient, MatDialog, and any effects/signals

### Technical Context

- Dialog should be accessible from Global/Universe screen
- Use Angular Material Dialog (MatDialog)
- File input accepts .csv files
- Shows progress spinner during upload
- Displays success message with import count
- Displays detailed error messages if import fails
- Closes automatically on success or allows user to close on error

### UI Requirements

- Button label: "Import Transactions" or "Import Fidelity CSV"
- Dialog title: "Import Fidelity Transactions"
- File input with CSV filter
- Upload button (disabled until file selected)
- Cancel button
- Progress indicator (spinner)
- Results area (success count or error list)

### Integration Points

- Call backend endpoint via HTTP POST
- Use multipart/form-data for file upload
- Handle authentication (should be automatic via HTTP interceptor)
- Refresh universe table data after successful import

## Definition of Done

- [ ] All tests written and disabled (RED phase)
- [ ] Tests cover all acceptance criteria scenarios
- [ ] Tests disabled to allow CI to pass
- [ ] Test code follows project conventions
- [ ] All validation commands pass:
  - [ ] Run `pnpm all`
  - [ ] Run `pnpm e2e:dms-material`
  - [ ] Run `pnpm dupcheck`
  - [ ] Run `pnpm format`
  - [ ] Repeat all of these if any fail until they all pass
- [ ] Code reviewed and approved

## Notes

- This is the TDD RED phase
- Tests should fail because implementation doesn't exist yet
- Tests must be disabled before merge to allow CI to pass
- Story AR.3 will implement the functionality and re-enable tests

## Related Stories

- **Previous:** Story AR.2 (Service Implementation)
- **Next:** Story AR.3 (Dialog Implementation)
- **Epic:** Epic AR - Fidelity Transaction Import

---

## Change Log

| Date       | Version | Description      | Author |
| ---------- | ------- | ---------------- | ------ |
| 2026-02-24 | 1.0     | Initial creation | SM     |

---

## Dev Agent Record

### Agent Model Used

_To be populated during implementation_

### Debug Log References

_To be populated during implementation_

### Completion Notes List

_To be populated during implementation_

### File List

_To be populated during implementation_

---

## QA Results

_To be populated after implementation_
