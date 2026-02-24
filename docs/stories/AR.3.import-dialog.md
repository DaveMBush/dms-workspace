# Story AR.3: Build Import UI Dialog on Global/Universe Screen

**Status:** Draft

## Story

**As a** user
**I want** a dialog to import Fidelity transaction CSV files
**So that** I can easily upload transaction data to the system

## Context

**Current System:**

- Import service and endpoint implemented in AR.2
- Tests written in Story AR.3-TDD define expected behavior
- Need user-facing UI for imports

**Implementation Approach:**

- Implement import dialog component following TDD tests
- Add import button to Global/Universe screen
- Re-enable tests from AR.3-TDD
- Verify all tests pass (GREEN phase)

## Acceptance Criteria

### Functional Requirements

1. [ ] Import button visible on Global/Universe screen
2. [ ] Import dialog opens when button clicked
3. [ ] Dialog allows CSV file selection
4. [ ] Dialog shows upload progress
5. [ ] Dialog displays success message with import count
6. [ ] Dialog displays detailed error messages
7. [ ] Universe table refreshes after successful import

### Technical Requirements

1. [ ] All tests from AR.3-TDD re-enabled and passing
2. [ ] Code follows project coding standards
3. [ ] Component uses Angular Material Dialog
4. [ ] Proper file upload handling
5. [ ] Accessible UI (keyboard navigation, screen reader support)
6. [ ] Unit test coverage >80%

## Tasks / Subtasks

- [ ] Re-enable tests from AR.3-TDD (AC: 1)
- [ ] Create import dialog component (AC: 3, 4, 5, 6)
  - [ ] Create component files (TS, HTML, SCSS, spec)
  - [ ] Add file input with CSV filter
  - [ ] Add upload button
  - [ ] Add cancel button
  - [ ] Add progress spinner
  - [ ] Add results display area
  - [ ] Implement file selection handling
  - [ ] Implement upload logic (call backend endpoint)
  - [ ] Implement success display
  - [ ] Implement error display
- [ ] Add import button to Global/Universe screen (AC: 1, 2)
  - [ ] Add button to toolbar/header
  - [ ] Wire button to open dialog
  - [ ] Pass context data to dialog
- [ ] Implement data refresh (AC: 7)
  - [ ] Refresh universe table after successful import
  - [ ] Update any affected SmartNgRX effects
- [ ] Add accessibility features (AC: 5)
  - [ ] Add ARIA labels
  - [ ] Ensure keyboard navigation works
  - [ ] Test with screen reader
- [ ] Verify all tests pass (AC: 1)
- [ ] Run validation commands

## Dev Notes

### Testing Standards

- **Test Location:** `apps/dms-material/src/**/*.component.spec.ts`
- **Testing Framework:** Vitest with Angular TestBed
- **Coverage:** Must achieve >80% coverage
- **Re-enable Tests:** Change `.skip` to active tests from AR.3-TDD

### Technical Context

- **Dialog Location:** Create new component `ImportFidelityDialogComponent`
- **Parent Screen:** Global/Universe screen component
- **Dialog Service:** Use Angular Material MatDialog
- **HTTP Client:** Use Angular HttpClient for file upload
- **SmartNgRX:** May need to trigger effects to refresh data

### Component Structure

```typescript
@Component({
  selector: 'app-import-fidelity-dialog',
  templateUrl: './import-fidelity-dialog.component.html',
  styleUrls: ['./import-fidelity-dialog.component.scss']
})
export class ImportFidelityDialogComponent {
  selectedFile: File | null = null;
  uploading = false;
  success = false;
  importCount = 0;
  errors: string[] = [];

  onFileSelected(event: Event) { ... }
  onUpload() { ... }
  onCancel() { ... }
}
```

### API Integration

- **Endpoint:** POST `/api/import/fidelity`
- **Request:** multipart/form-data with file
- **Response:** `{ success: true, imported: 45, errors: [], warnings: [] }`
- **Error Handling:** Display user-friendly messages for all error types

### UI Design

- Follow existing Material Design patterns in the app
- Use same styling as other dialogs (Add Position, Sell Position, etc.)
- Position: Center on screen
- Size: Medium (600px width)
- Buttons: Cancel (secondary), Upload (primary)

## Definition of Done

- [ ] All tests from AR.3-TDD re-enabled and passing (GREEN phase)
- [ ] Import dialog component implemented and working
- [ ] Import button added to Global/Universe screen
- [ ] File upload and processing working
- [ ] Success and error messages displaying correctly
- [ ] Data refresh working after successful import
- [ ] Accessibility features implemented
- [ ] Code follows project conventions
- [ ] Unit test coverage >80%
- [ ] All validation commands pass:
  - [ ] Run `pnpm all`
  - [ ] Run `pnpm e2e:dms-material`
  - [ ] Run `pnpm dupcheck`
  - [ ] Run `pnpm format`
  - [ ] Repeat all of these if any fail until they all pass
- [ ] Code reviewed and approved

## Notes

- This is the TDD GREEN phase
- All tests from AR.3-TDD should pass after implementation
- Build incrementally, running tests frequently
- Consider UX flow carefully (file selection → upload → results)

## Related Stories

- **Previous:** Story AR.3-TDD (Tests)
- **Next:** Story AR.4-TDD (File Upload Tests)
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
