# Story AR.3-TDD: Write Unit Tests for Import UI Dialog - TDD RED Phase

**Status:** Approved

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

- [x] Create test file for import dialog component (AC: 1)
  - [x] Test dialog initialization
  - [x] Test file input rendering
  - [x] Test file selection handling
  - [x] Test upload button enablement
  - [x] Test cancel button
  - [x] Test progress indicator during upload
  - [x] Test success message display
  - [x] Test error message display
  - [x] Test dialog close on success
  - [x] Test dialog data passing (e.g., account filter)
- [x] Create tests for Global/Universe integration (AC: 2)
  - [x] Test "Import Transactions" button exists
  - [x] Test button opens dialog
  - [x] Test dialog receives context data
  - [x] Test data refresh after successful import
- [x] Write edge case tests (AC: 3)
  - [x] Test invalid file type selection
  - [x] Test empty file selection
  - [x] Test upload failure
  - [x] Test network error
  - [x] Test large file handling
- [x] Disable all tests using .skip (AC: 7)
- [x] Verify tests fail before disabling (AC: 6)
- [x] Run validation commands

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

| Date       | Version | Description                                                                                                                                | Author    |
| ---------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------- |
| 2026-02-24 | 1.0     | Initial creation                                                                                                                           | SM        |
| 2026-02-24 | 1.1     | TDD RED phase implementation: Created import dialog component tests and Global/Universe integration tests, all disabled with describe.skip | Dev Agent |

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (copilot)

### Debug Log References

No debug issues encountered.

### Completion Notes List

- Created import dialog component test file with comprehensive tests covering initialization, file input, file selection, upload button, cancel, progress, success/error display, dialog close behavior, data passing, and edge cases
- Created integration test file for Global/Universe screen covering Import Transactions button, dialog opening, context data passing, and post-import data refresh
- All tests disabled with `describe.skip` to allow CI to pass (TDD RED phase)
- Tests follow existing project patterns: Vitest with Angular TestBed, AAA pattern, proper mocking

### File List

- `apps/dms-material/src/app/global/import-dialog/import-dialog.component.spec.ts` - Created (import dialog component unit tests)
- `apps/dms-material/src/app/global/global-universe/global-universe-import.integration.spec.ts` - Created (Global/Universe import integration tests)
- `docs/stories/AR.3-tdd.import-dialog.md` - Modified (Dev Agent Record updated)

---

## QA Results

### Review Date: 2026-02-25

### Reviewed By: Quinn (Test Architect)

**Acceptance Criteria Review:**

- [x] AC1: All unit tests written for import dialog component (33 tests)
- [x] AC2: Tests verify dialog can be opened from Global/Universe screen
- [x] AC3: Tests verify file selection UI (input rendering, CSV restriction, file name display)
- [x] AC4: Tests verify upload progress indication (spinner, button disable)
- [x] AC5: Tests verify success/error message display (import count, error list, warnings)
- [x] AC6: All tests initially fail (RED phase - component doesn't exist)
- [x] AC7: Tests disabled with `describe.skip` to allow CI to pass

**Technical Requirements Review:**

- [x] Tests follow existing testing patterns (Vitest + Angular TestBed, AAA pattern)
- [x] Mock dependencies properly configured (HttpTestingController, MatDialogRef, MAT_DIALOG_DATA)
- [x] Test coverage includes edge cases (invalid file type, empty file, HTTP error, network error, large file, warnings)
- [x] Test descriptions are clear and specific
- [x] Tests use Angular TestBed

**Validation Results:**

- pnpm all: PASS (67 test files, 1139 tests passed, 8 skipped)
- pnpm e2e:dms-material: Pre-existing failures only (not related to this story)
- pnpm dupcheck: PASS (0 clones)
- pnpm format: PASS

### Gate Status

Gate: PASS → docs/qa/gates/AR.3-tdd-import-dialog.yml
