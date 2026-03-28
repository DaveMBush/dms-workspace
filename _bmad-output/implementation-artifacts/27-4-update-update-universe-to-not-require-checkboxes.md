# Story 27.4: Update UpdateUniverseFieldsService to Not Require Checkboxes

Status: Approved

## Story

As a developer,
I want `UpdateUniverseFieldsService.updateFields()` to work correctly without the three removed checkbox fields as preconditions or included payload fields,
so that updating universe record fields does not fail or produce incorrect behavior after the checkbox columns are gone.

## Acceptance Criteria

1. **Given** the `updateFields()` method in `UpdateUniverseFieldsService`, **When** it is called, **Then** it no longer references, checks, or includes `has_volitility`, `objectives_understood`, or `graph_higher_before_2008` in any request payload or precondition guard.
2. **Given** a call to `updateFields()` with a valid non-checkbox field update, **When** the call completes, **Then** the correct field is updated and the response is handled without error.
3. **Given** a Playwright E2E test for the "Update Universe" user flow, **When** the test runs after this story, **Then** the flow completes successfully without requiring any checkbox fields.
4. **Given** all changes, **When** `pnpm all` runs, **Then** no TypeScript errors and all tests pass.

## Definition of Done

- [ ] `UpdateUniverseFieldsService` updated — no checkbox field references
- [ ] `updateFields()` payload type updated to exclude removed fields
- [ ] Existing unit tests for the service updated or deleted as appropriate
- [ ] Playwright E2E test for Update Universe flow passes
- [ ] Run `pnpm all`
- [ ] Run `pnpm e2e:dms-material:chromium`
- [ ] Run `pnpm e2e:dms-material:firefox`
- [ ] Run `pnpm format`
- [ ] Repeat all of these if any fail until they all pass

## Tasks / Subtasks

- [ ] Audit `UpdateUniverseFieldsService` (AC: #1)
  - [ ] Open the service file (located via `inject(UpdateUniverseFieldsService)` usage in `global-universe.component.ts`)
  - [ ] Find all references to the three checkbox field names
  - [ ] Note any precondition guards like `if (!has_volitility || !objectives_understood) return;`
- [ ] Remove checkbox references from service (AC: #1, #2)
  - [ ] Delete or update precondition guards that check checkbox field values
  - [ ] Remove the fields from the request payload type / DTO
  - [ ] If the service has an interface or type for the update payload, remove the three boolean properties
- [ ] Update or delete unit tests for the service (AC: #4)
  - [ ] Open the spec file for `UpdateUniverseFieldsService`
  - [ ] Remove any test cases that set up mock checkbox field values as preconditions
  - [ ] Update remaining tests that still reference the removed fields in their mocked state
- [ ] Verify Playwright E2E (AC: #3)
  - [ ] Run `pnpm e2e:dms-material:chromium` and confirm the Update Universe flow test passes
  - [ ] If no E2E test for this flow exists, add a basic smoke test

## Dev Notes

### Key Files

- Service file: find via `inject(UpdateUniverseFieldsService)` in:
  - `apps/dms-material/src/app/global/global-universe/global-universe.component.ts` (line ~33, 85, 211)
- Likely service location: `apps/dms-material/src/app/global/global-universe/` or `apps/dms-material/src/app/shared/services/`
- `apps/dms-material-e2e/` — Playwright test directory

### What to Look For

The service's `updateFields()` call in `global-universe.component.ts` was observed at lines 85 and 211. The precondition that was likely guarding updates with checkbox values should be near those call sites or inside the service itself.

### Dependencies

- Depends on Stories 27.1, 27.2, and 27.3 (all prior checkbox removal stories must be merged first)

### References

[Source: apps/dms-material/src/app/global/global-universe/global-universe.component.ts#L33]
[Source: apps/dms-material/src/app/global/global-universe/global-universe.component.ts#L85]
[Source: apps/dms-material/src/app/global/global-universe/global-universe.component.ts#L211]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
