# Story AR.4-TDD: Write Unit Tests for File Upload and Processing - TDD RED Phase

**Status:** Ready for Review

## Story

**As a** developer
**I want** to write comprehensive unit tests for file upload and processing
**So that** I have failing tests that define the expected file handling behavior (TDD RED phase)

## Context

**Current System:**

- Import dialog implemented in AR.3
- Need robust file upload and processing logic
- Need to handle various file scenarios and edge cases

**Implementation Approach:**

- Write unit tests for file upload logic
- Write tests for file processing and validation
- Disable tests after writing to allow CI to pass
- Tests will be re-enabled in Story AR.4

## Acceptance Criteria

### Functional Requirements

1. [ ] All unit tests written for file upload handling
2. [ ] Tests verify file type validation (CSV only)
3. [ ] Tests verify file size validation
4. [ ] Tests verify file content validation
5. [ ] Tests verify multipart upload formatting
6. [ ] All tests initially fail (RED phase)
7. [ ] Tests disabled with `xit()` or `.skip` to allow CI to pass

### Technical Requirements

1. [ ] Tests follow existing testing patterns
2. [ ] Mock dependencies properly configured (HttpClient, File API)
3. [ ] Test coverage includes edge cases
4. [ ] Test descriptions are clear and specific
5. [ ] Tests cover both frontend and backend upload handling

## Tasks / Subtasks

- [x] Create tests for frontend file upload (AC: 1, 2, 3, 4)
  - [x] Test FileReader usage
  - [x] Test file type validation (.csv extension)
  - [x] Test file size limits
  - [x] Test file content preview
  - [x] Test FormData creation
  - [x] Test upload progress tracking
  - [x] Test upload cancellation
- [x] Create tests for backend file handling (AC: 5)
  - [x] Test multipart request parsing
  - [x] Test file extraction from request
  - [x] Test temporary file handling
  - [x] Test file cleanup after processing
- [x] Write edge case tests (AC: 3, 4)
  - [x] Test empty file
  - [x] Test file with no extension
  - [x] Test file with wrong extension
  - [x] Test file too large
  - [x] Test corrupted file
  - [x] Test file with BOM (Byte Order Mark)
  - [x] Test file with different encodings (UTF-8, UTF-16)
- [x] Disable all tests using .skip (AC: 7)
- [x] Verify tests fail before disabling (AC: 6)
- [x] Run validation commands

## Dev Notes

### Testing Standards

- **Test Location:**
  - Frontend: `apps/dms-material/src/**/*.spec.ts`
  - Backend: `apps/server/src/**/*.spec.ts`
- **Testing Framework:** Vitest
- **Patterns:** Use AAA (Arrange-Act-Assert) pattern
- **Coverage:** Target >80% coverage for upload handling code
- **Mocking:** Mock File API, FileReader, HttpClient, Fastify multipart

### Technical Context

- **Frontend File Upload:**

  - Use FormData for multipart upload
  - Validate file type before upload
  - Check file size limits (e.g., 10MB max)
  - Show upload progress
  - Handle network errors

- **Backend File Handling:**
  - Use Fastify multipart plugin
  - Extract file from request
  - Validate file exists
  - Pass file buffer to CSV parser
  - Clean up resources

### File Validation Requirements

- **Accepted Types:** .csv only
- **Max Size:** 10MB (configurable)
- **Required Columns:** Date, Action, Symbol, Quantity, Price, Amount, Account
- **Encoding:** UTF-8 (handle BOM if present)

### Upload Flow

1. User selects file
2. Frontend validates file type and size
3. Frontend creates FormData with file
4. Frontend sends POST request with progress tracking
5. Backend receives multipart request
6. Backend extracts file
7. Backend passes to CSV parser
8. Backend returns results
9. Frontend displays results

## Definition of Done

- [x] All tests written and disabled (RED phase)
- [x] Tests cover all acceptance criteria scenarios
- [x] Tests disabled to allow CI to pass
- [x] Test code follows project conventions
- [x] All validation commands pass:
  - [x] Run `pnpm all`
  - [x] Run `pnpm e2e:dms-material`
  - [x] Run `pnpm dupcheck`
  - [x] Run `pnpm format`
  - [x] Repeat all of these if any fail until they all pass
- [ ] Code reviewed and approved

## Notes

- This is the TDD RED phase
- Tests should fail because implementation doesn't exist yet
- Tests must be disabled before merge to allow CI to pass
- Story AR.4 will implement the functionality and re-enable tests
- Consider security implications of file uploads

## Related Stories

- **Previous:** Story AR.3 (Dialog Implementation)
- **Next:** Story AR.4 (Upload Implementation)
- **Epic:** Epic AR - Fidelity Transaction Import

---

## Change Log

| Date       | Version | Description                                                                                                        | Author    |
| ---------- | ------- | ------------------------------------------------------------------------------------------------------------------ | --------- |
| 2026-02-24 | 1.0     | Initial creation                                                                                                   | SM        |
| 2026-02-24 | 1.1     | Implementation: Created 42 TDD RED phase tests (28 frontend, 14 backend) for file upload validation and processing | Dev Agent |

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

None - implementation proceeded without issues.

### Completion Notes List

- Created 28 frontend TDD tests covering file size validation, content preview, FormData creation, upload progress tracking, upload cancellation, file type edge cases, and empty/corrupted/BOM/encoding handling
- Created 14 backend TDD tests covering multipart request parsing, file extraction, file size limits, temporary file handling, file cleanup, BOM stripping, and encoding handling
- All tests disabled with describe.skip/test.skip for CI compatibility (TDD RED phase)
- Tests verified to fail when enabled (features not yet implemented)

### File List

- `apps/dms-material/src/app/global/import-dialog/file-upload-validation.spec.ts` (new)
- `apps/server/src/app/routes/import/file-upload-handling.spec.ts` (new)
- `docs/stories/AR.4-tdd.file-upload.md` (modified)

---

## QA Results

_To be populated after implementation_
