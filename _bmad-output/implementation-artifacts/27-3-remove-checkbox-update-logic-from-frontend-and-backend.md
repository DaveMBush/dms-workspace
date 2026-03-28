# Story 27.3: Remove Checkbox Update Logic from Frontend and Backend

Status: Approved

## Story

As a developer,
I want all SmartNgRX effects, actions, and backend update routes that handled checkbox state mutations removed,
so that there is no dead code or broken update path for the removed checkbox columns.

## Acceptance Criteria

1. **Given** the SmartNgRX store for the Screener, **When** this story is complete, **Then** no effect, action, or reducer references the three checkbox field names (`has_volitility`, `objectives_understood`, `graph_higher_before_2008`).
2. **Given** the backend route handlers, **When** this story is complete, **Then** no API endpoint accepts or processes a PATCH/PUT request body containing the three checkbox field names.
3. **Given** any TypeScript types/interfaces that included the checkbox fields as optional or required properties, **When** this story is complete, **Then** those fields are removed from the types.
4. **Given** `global-screener.component.spec.ts` and any other spec files, **When** this story is complete, **Then** all test cases that test checkbox update behavior are deleted (not skipped).
5. **Given** all changes, **When** `pnpm all` runs, **Then** no TypeScript compilation errors and all remaining tests pass.

## Definition of Done

- [ ] SmartNgRX effects/actions for checkbox updates removed
- [ ] Backend update route(s) for checkbox fields removed or updated to reject checkbox fields
- [ ] TypeScript interfaces/types cleaned of checkbox field references
- [ ] Checkbox update spec tests deleted
- [ ] Run `pnpm all`
- [ ] Run `pnpm e2e:dms-material:chromium`
- [ ] Run `pnpm e2e:dms-material:firefox`
- [ ] Run `pnpm format`
- [ ] Repeat all of these if any fail until they all pass

## Tasks / Subtasks

- [ ] Locate SmartNgRX checkbox effects (AC: #1)
  - [ ] Search `apps/dms-material/src/` for references to `has_volitility`, `objectives_understood`, `graph_higher_before_2008`
  - [ ] Find SmartNgRX effect files, action creators, and reducer cases that handle checkbox updates
  - [ ] Note file paths for removal
- [ ] Remove frontend update logic (AC: #1, #3)
  - [ ] Delete (or edit) effect files handling checkbox update API calls
  - [ ] Remove checkbox action creators and their dispatch calls
  - [ ] Remove checkbox-related properties from any frontend model interface/type
- [ ] Remove backend update endpoint(s) (AC: #2)
  - [ ] Search `apps/server/src/routes/` for route handlers that accept checkbox field updates
  - [ ] If the endpoint exclusively handles checkbox updates → delete the route file(s)
  - [ ] If a shared PATCH endpoint also handles other fields → remove only the checkbox field processing logic
- [ ] Delete checkbox update spec tests (AC: #4)
  - [ ] Open `global-screener.component.spec.ts` (and any other spec files found)
  - [ ] Delete all `it(...)` blocks testing checkbox update behavior
- [ ] Validate (AC: #5)
  - [ ] Run `pnpm all` and confirm zero TypeScript errors and all tests pass

## Dev Notes

### Key Files (search targets)

- `apps/dms-material/src/app/global/global-screener/` — SmartNgRX effects and component
- `apps/dms-material/src/app/` — any shared store folders with checkbox actions
- `apps/server/src/routes/` — backend update endpoint(s)
- `apps/dms-material/src/app/global/global-screener/global-screener.component.spec.ts`

### Search Pattern

Run a project-wide search for each field name:
- `has_volitility`
- `objectives_understood`
- `graph_higher_before_2008`

Also search for the SmartNgRX action names/patterns that may not use the raw field names (e.g., `updateHasVolitility`, `setObjectivesUnderstood`).

### Scope Boundary

- Story 27.1 removed rendering
- Story 27.2 removed schema fields
- **This story** removes the update logic (effects, actions, routes)
- Story 27.4 handles `UpdateUniverseFieldsService` behavior changes

### Dependencies

- Depends on Stories 27.1 and 27.2 (earlier removal stories must be merged first)
- Story 27.4 depends on this story

### References

[Source: apps/dms-material/src/app/global/global-screener/]
[Source: apps/server/src/routes/]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
