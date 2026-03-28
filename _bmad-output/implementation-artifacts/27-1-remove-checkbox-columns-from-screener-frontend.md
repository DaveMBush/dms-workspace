# Story 27.1: Remove Checkbox Columns from Screener Frontend

Status: Approved

## Story

As a developer,
I want the three checkbox columns (`has_volitility`, `objectives_understood`, `graph_higher_before_2008`) removed from the Screener table UI,
so that the frontend no longer renders or manages these deprecated columns.

## Acceptance Criteria

1. **Given** the Global Screener screen, **When** it renders after this story is complete, **Then** none of the three checkbox columns (`has_volitility`, `objectives_understood`, `graph_higher_before_2008`) are visible in the table.
2. **Given** the `global-screener.component.ts`, **When** the component class is reviewed, **Then** it no longer imports `MatCheckboxModule` unless another feature still requires it (if no other usage, remove the import).
3. **Given** the column definition templates, **When** the component template is reviewed, **Then** there are no `ng-container` or column defs referencing the three checkbox column names.
4. **Given** the existing spec file `global-screener.component.spec.ts`, **When** tests referencing the removed checkbox columns are found, **Then** those tests are deleted (not just skipped/disabled).
5. **Given** all changes, **When** `pnpm all` runs, **Then** no TypeScript errors and all remaining tests pass.

## Definition of Done

- [ ] Three checkbox columns removed from screener component template
- [ ] `MatCheckboxModule` import removed if no longer needed
- [ ] Any spec tests for checkbox columns deleted
- [ ] No TypeScript compilation errors
- [ ] Run `pnpm all`
- [ ] Run `pnpm e2e:dms-material:chromium`
- [ ] Run `pnpm e2e:dms-material:firefox`
- [ ] Run `pnpm format`
- [ ] Repeat all of these if any fail until they all pass

## Tasks / Subtasks

- [ ] Locate checkbox column definitions (AC: #1, #3)
  - [ ] Open `apps/dms-material/src/app/global/global-screener/global-screener.component.ts`
  - [ ] Open `apps/dms-material/src/app/global/global-screener/global-screener.component.html` (if separate template)
  - [ ] Find all references to `has_volitility`, `objectives_understood`, `graph_higher_before_2008`
  - [ ] Note: also check the `displayedColumns` array and any column config objects
- [ ] Remove column definitions from template (AC: #1, #3)
  - [ ] Delete the three `<ng-container matColumnDef="...">` blocks for each checkbox column
  - [ ] Remove the column names from the `displayedColumns` array / column list
- [ ] Remove `MatCheckboxModule` if no longer needed (AC: #2)
  - [ ] Search `global-screener.component.ts` for any remaining `<mat-checkbox>` usage after removal
  - [ ] If none remain, remove `MatCheckboxModule` from the `imports` array
- [ ] Remove checkbox-related spec tests (AC: #4)
  - [ ] Open `global-screener.component.spec.ts`
  - [ ] Delete (not comment out) any `it(...)` blocks that test checkbox column rendering or interaction
- [ ] Verify (AC: #5)
  - [ ] Run `pnpm all` and confirm zero TypeScript errors and all tests pass

## Dev Notes

### Key Files

- `apps/dms-material/src/app/global/global-screener/global-screener.component.ts` — component class
- `apps/dms-material/src/app/global/global-screener/global-screener.component.html` — template (if separate)
- `apps/dms-material/src/app/global/global-screener/global-screener.component.spec.ts` — test file

### Checkbox Column Names (exact)

- `has_volitility` (note: "volitility" not "volatility" — this is the actual field name in the schema)
- `objectives_understood`
- `graph_higher_before_2008`

### Important: Scope Boundary

- This story removes only the **frontend rendering** of these columns
- The backend API and Prisma schema columns are removed in Story 27.2
- The SmartNgRX update effects/actions for checkboxes are removed in Story 27.3
- DO NOT modify `prisma/schema.prisma` in this story

### References

[Source: apps/dms-material/src/app/global/global-screener/global-screener.component.ts]
[Source: prisma/schema.prisma#has_volitility]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
