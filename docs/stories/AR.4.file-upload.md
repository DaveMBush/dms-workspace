# Story AR.4: Implement File Upload and Processing

**Status:** Approved

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

- [ ] Re-enable tests from AR.4-TDD (AC: 1)
- [ ] Implement frontend file upload (AC: 1, 2, 5)
  - [ ] Add file type validation (.csv extension check)
  - [ ] Add file size validation check
  - [ ] Create FormData with file
  - [ ] Implement HttpClient upload with progress
  - [ ] Handle upload success
  - [ ] Handle upload errors
  - [ ] Add upload cancellation support
- [ ] Implement backend file handling (AC: 3, 4, 6)
  - [ ] Configure Fastify multipart plugin
  - [ ] Add multipart request handler
  - [ ] Extract file from request
  - [ ] Validate file presence
  - [ ] Handle file encoding (UTF-8, BOM)
  - [ ] Pass file buffer to CSV parser
  - [ ] Implement file cleanup (temp files)
  - [ ] Add security checks (file type, size)
- [ ] Implement proper error handling (AC: 3, 4)
  - [ ] Handle invalid file types
  - [ ] Handle oversized files
  - [ ] Handle corrupted files
  - [ ] Handle network errors
  - [ ] Return user-friendly error messages
- [ ] Verify all tests pass (AC: 1)
- [ ] Security review
- [ ] Run validation commands

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

- [ ] All tests from AR.4-TDD re-enabled and passing (GREEN phase)
- [ ] File upload implemented on frontend
- [ ] File handling implemented on backend
- [ ] All validations working (type, size, content)
- [ ] Security measures implemented
- [ ] Progress tracking working
- [ ] File cleanup working
- [ ] Error handling comprehensive
- [ ] Code follows project conventions
- [ ] Unit test coverage >80%
- [ ] All validation commands pass:
  - [ ] Run `pnpm all`
  - [ ] Run `pnpm e2e:dms-material`
  - [ ] Run `pnpm dupcheck`
  - [ ] Run `pnpm format`
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
