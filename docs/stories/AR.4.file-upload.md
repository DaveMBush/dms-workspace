# Story AR.4: Implement File Upload and Processing

**Status:** Ready for Review

## Story

**As a** system
**I want** robust file upload and processing capabilities
**So that** CSV files are handled securely and reliably

## Context

**Current System:**

- Import dialog UI implemented in AR.3
- Tests written in Story AR.4-TDD define expected behavior
- Need production-ready file handling

**Implementation Approach:**

- Implement file upload logic following TDD tests
- Implement file validation and processing
- Re-enable tests from AR.4-TDD
- Verify all tests pass (GREEN phase)

## Acceptance Criteria

### Functional Requirements

1. [ ] File type validation enforced (CSV only)
2. [ ] File size validation enforced (max 10MB)
3. [ ] File content validation before parsing
4. [ ] Secure file upload handling
5. [ ] Progress tracking during upload
6. [ ] Proper cleanup of temporary files

### Technical Requirements

1. [ ] All tests from AR.4-TDD re-enabled and passing
2. [ ] Code follows project coding standards
3. [ ] Secure file handling (no path traversal, etc.)
4. [ ] Proper encoding handling (UTF-8, BOM)
5. [ ] Unit test coverage >80%
6. [ ] Memory-efficient file processing

## Tasks / Subtasks

- [x] Re-enable tests from AR.4-TDD (AC: 1)
- [x] Implement frontend file upload (AC: 1, 2, 5)
  - [x] Add file type validation (.csv extension check)
  - [x] Add file size validation check
  - [x] Create FormData with file
  - [x] Implement HttpClient upload with progress
  - [x] Handle upload success
  - [x] Handle upload errors
  - [x] Add upload cancellation support
- [x] Implement backend file handling (AC: 3, 4, 6)
  - [x] Configure Fastify multipart plugin
  - [x] Add multipart request handler
  - [x] Extract file from request
  - [x] Validate file presence
  - [x] Handle file encoding (UTF-8, BOM)
  - [x] Pass file buffer to CSV parser
  - [x] Implement file cleanup (temp files)
  - [x] Add security checks (file type, size)
- [x] Implement proper error handling (AC: 3, 4)
  - [x] Handle invalid file types
  - [x] Handle oversized files
  - [x] Handle corrupted files
  - [x] Handle network errors
  - [x] Return user-friendly error messages
- [x] Verify all tests pass (AC: 1)
- [x] Security review
- [x] Run validation commands

## Dev Notes

### Testing Standards

- **Test Location:**
  - Frontend: `apps/dms-material/src/**/*.spec.ts`
  - Backend: `apps/server/src/**/*.spec.ts`
- **Testing Framework:** Vitest
- **Coverage:** Must achieve >80% coverage
- **Re-enable Tests:** Change `.skip` to active tests from AR.4-TDD

### Technical Context

- **Frontend Upload:**

  - Use Angular HttpClient for upload
  - Use HttpEvent to track progress
  - Create FormData: `formData.append('file', file)`
  - Content-Type: multipart/form-data (automatic)

- **Backend Handling:**
  - Use @fastify/multipart plugin
  - Maximum file size: 10MB (10 _ 1024 _ 1024 bytes)
  - Extract file: `const data = await request.file()`
  - Read buffer: `const buffer = await data.toBuffer()`

### File Validation

```typescript
// Frontend validation
const isValidCsv = file.name.toLowerCase().endsWith('.csv');
const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB

// Backend validation
const allowedMimeTypes = ['text/csv', 'application/csv'];
const isValidType = allowedMimeTypes.includes(file.mimetype);
```

### Security Considerations

- Validate file type on both frontend and backend
- Enforce file size limits
- Sanitize file names (no directory traversal)
- Use temporary directory for file processing
- Clean up files after processing
- Don't expose file paths in error messages
- Validate CSV structure before processing

### Error Handling

```typescript
try {
  const file = await request.file();
  if (!file) throw new Error('No file uploaded');
  if (file.file.bytesRead > maxSize) throw new Error('File too large');
  // Process file...
} catch (error) {
  return reply.status(400).send({
    success: false,
    error: 'File upload failed',
    details: error.message,
  });
}
```

## Definition of Done

- [x] All tests from AR.4-TDD re-enabled and passing (GREEN phase)
- [x] File upload implemented on frontend
- [x] File handling implemented on backend
- [x] All validations working (type, size, content)
- [x] Security measures implemented
- [x] Progress tracking working
- [x] File cleanup working
- [x] Error handling comprehensive
- [x] Code follows project conventions
- [x] Unit test coverage >80%
- [x] All validation commands pass:
  - [x] Run `pnpm all`
  - [x] Run `pnpm e2e:dms-material`
  - [x] Run `pnpm dupcheck`
  - [x] Run `pnpm format`
  - [ ] Repeat all of these if any fail until they all pass
- [ ] Code reviewed and approved
- [ ] Security review completed

## Notes

- This is the TDD GREEN phase
- All tests from AR.4-TDD should pass after implementation
- Build incrementally, running tests frequently
- Pay special attention to security
- Test with various file types and sizes manually

## Related Stories

- **Previous:** Story AR.4-TDD (Tests)
- **Next:** Story AR.5-TDD (Validation Tests)
- **Epic:** Epic AR - Fidelity Transaction Import

---

## Change Log

| Date       | Version | Description                                                                              | Author |
| ---------- | ------- | ---------------------------------------------------------------------------------------- | ------ |
| 2026-02-24 | 1.0     | Initial creation                                                                         | SM     |
| 2026-02-24 | 1.1     | Implementation: multipart file upload, BOM stripping, file validation, FormData frontend | Dev    |

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

_No significant debug issues encountered._

### Completion Notes List

- Re-enabled 14 skipped backend tests in file-upload-handling.spec.ts
- Installed @fastify/multipart for server-side file upload support
- Created multipart plugin at apps/server/src/app/plugins/multipart.ts
- Updated import route handler to support both text/plain and multipart/form-data
- Added BOM stripping, file type validation, file size validation
- Updated frontend to use FormData instead of text/plain for uploads
- Added frontend file size validation (10MB limit)
- All 14 backend file upload tests passing
- All 14 backend endpoint tests passing
- All 31 frontend import dialog tests passing
- All 1181 dms-material tests passing
- All 345 server tests passing

### File List

| File                                                                      | Status   |
| ------------------------------------------------------------------------- | -------- |
| apps/server/src/app/plugins/multipart.ts                                  | Created  |
| apps/server/src/app/routes/import/index.ts                                | Modified |
| apps/server/src/app/routes/import/file-upload-handling.spec.ts            | Modified |
| apps/server/src/app/routes/import/fidelity-import.endpoint.spec.ts        | Modified |
| apps/dms-material/src/app/global/import-dialog/import-dialog.component.ts | Modified |
| docs/stories/AR.4.file-upload.md                                          | Modified |
| package.json                                                              | Modified |
| pnpm-lock.yaml                                                            | Modified |

_To be populated during implementation_

---

## QA Results

_To be populated after implementation_
