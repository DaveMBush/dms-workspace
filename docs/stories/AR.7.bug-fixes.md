# Story AR.7: Bug Fixes for Fidelity Transaction Import

**Status:** Draft

## Story

**As a** user
**I want** the import dialog to work correctly when selecting files
**So that** I can reliably choose and upload my Fidelity CSV files without obstruction

## Context

**Current System:**

- Epic AR (AR.1–AR.6) is functionally complete
- The import dialog (`ImportDialogComponent`) was implemented in AR.3 and AR.4
- At least one confirmed bug has surfaced through real-world usage

**Bug List:**

1. **File picker hides CSV files** — The `<input type="file" accept=".csv">` attribute in
   `import-dialog.component.html` uses an extension-only filter. On some OS/browser combinations
   (e.g. Linux file managers, certain Chrome versions on macOS) the system uses MIME-type matching
   rather than extension matching, causing valid `.csv` files to be filtered out of the file picker
   dialog and invisible to the user.

**Implementation Approach:**

- Address each bug in isolation with a targeted, minimal fix
- Maintain all existing tests; add regression tests for each bug fixed

## Acceptance Criteria

### Bug 1: File Picker Hides CSV Files

1. [ ] The file picker dialog shows `.csv` files on all major OS / browser combinations
2. [ ] The `accept` attribute is broadened to include the common MIME types used for CSV files:
       `.csv`, `text/csv`, and `application/vnd.ms-excel`
3. [ ] Client-side validation in `onFileSelected()` continues to reject non-CSV files
4. [ ] Existing unit tests for file selection still pass

### General Quality Requirements

5. [ ] No regressions in the existing AR test suite
6. [ ] All validation commands pass (`pnpm all`)

## Tasks / Subtasks

### Bug 1: File Picker Hides CSV Files

- [ ] Update `accept` attribute in `import-dialog.component.html` (AC: 1, 2)
  - [ ] Change `accept=".csv"` → `accept=".csv,text/csv,application/vnd.ms-excel"`
- [ ] Verify `onFileSelected()` still rejects non-CSV files (AC: 3)
- [ ] Run existing import-dialog unit tests to confirm no regressions (AC: 4)
- [ ] Run full test suite and validation commands (AC: 5, 6)

## Dev Notes

### Bug 1 Root Cause & Fix Detail

**File:** `apps/dms-material/src/app/global/import-dialog/import-dialog.component.html`

**Current:**
```html
<input
  type="file"
  accept=".csv"
  (change)="onFileSelected($event)"
  aria-label="Select CSV file"
/>
```

**Fixed:**
```html
<input
  type="file"
  accept=".csv,text/csv,application/vnd.ms-excel"
  (change)="onFileSelected($event)"
  aria-label="Select CSV file"
/>
```

**Why this works:** Browsers and OS file managers use either the MIME type or the extension
from the `accept` attribute, depending on the platform. Including all three values ensures
`.csv` files are visible regardless of how the platform classifies them.

**Secondary safety net:** The existing `onFileSelected()` logic in
`import-dialog.component.ts` already validates that the chosen file ends in `.csv`, so
broadening the `accept` attribute does not allow non-CSV files to be uploaded.

### Testing Standards

- **Test Location:** `apps/dms-material/src/app/global/import-dialog/import-dialog.component.spec.ts`
- **Testing Framework:** Vitest with Angular TestBed
- **Validation commands:**
  - `pnpm all`
  - `pnpm format`

## Definition of Done

- [ ] Bug 1 fix applied (`accept` attribute updated)
- [ ] All existing import-dialog unit tests pass
- [ ] No regressions across the full test suite (`pnpm all`)
- [ ] Code follows project conventions
- [ ] Story status updated to **Done**

## Related Stories

- **Epic:** Epic AR - Fidelity Transaction Import
- **Previous story:** AR.6 - E2E Tests for Import Flow

---

## Change Log

| Date       | Version | Description      | Author |
| ---------- | ------- | ---------------- | ------ |
| 2026-02-26 | 1.0     | Initial creation | PM     |

---

## Dev Agent Record

_To be populated during implementation._

---

## QA Results

_To be populated after implementation._
