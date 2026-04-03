# Story 46.1: Investigate Account Screen Column Filter and Apply Fix to Universe Screen

Status: Approved

## Story

As a trader,
I want column filter inputs on the Universe screen to be visually contained within their column's width,
so that filters are usable and consistent with the Account screens.

## Acceptance Criteria

1. **Given** the Account > Open Positions screen column filter component and its CSS, **When** the code that constrains the filter input to the column width is identified, **Then** the same pattern is applied to the Universe screen column filter component.
2. **Given** the fix is applied to the Universe screen column filters, **When** a column filter input is displayed on a narrow column, **Then** the input is visually contained within the column boundary and is not clipped.
3. **Given** narrow columns on the Universe screen with an active filter, **When** the filter input would exceed the column width, **Then** the input scrolls or truncates inside the column boundary rather than overflowing.
4. **Given** all changes, **When** `pnpm all` runs, **Then** all unit tests pass.

## Tasks / Subtasks

- [ ] Inspect the column filter component used on Account > Open Positions screen (AC: #1)
  - [ ] Identify the component/directive responsible for rendering the filter input
  - [ ] Find the CSS rule(s) that constrain the filter input to the column width (`max-width`, `overflow`, `width: 100%`, etc.)
- [ ] Inspect the column filter component used on the Universe screen (AC: #1)
  - [ ] Compare with the Account screen implementation — identify what is missing or different
- [ ] Apply the Account screen's constraint pattern to the Universe screen column filter (AC: #1, #2, #3)
  - [ ] Add or fix the CSS to constrain the input within its column
  - [ ] Use Tailwind utility classes consistent with the project's CSS approach
- [ ] Visually verify the fix works on narrow Universe screen columns (AC: #2, #3)
  - [ ] Test with the filter input on columns of varying widths
- [ ] Run `pnpm all` and confirm no regressions (AC: #4)

## Dev Notes

### Background

The Account > Open Positions and Sold Positions screens already handle column filter width correctly. The Universe screen column filter is clipped rather than constrained. The fix should adopt whatever CSS approach already works on the Account screens — no new approach is needed.

### Key Commands

- Run all tests: `pnpm all`
- Run unit tests: `pnpm test`

### Key File Locations

- Angular components: `apps/dms-material/src/`
- Universe screen component: search for `universe` in `apps/dms-material/src/`
- Account Open Positions: search for `open-positions` in `apps/dms-material/src/`
- Column filter components: search for `column-filter` or `filter-input` in `apps/dms-material/src/`

### Tech Stack

- Angular 21 standalone components, `OnPush`, `inject()` pattern
- Tailwind CSS 3.4.x for utility classes
- SCSS for component styles
- No custom CSS unless Tailwind cannot express the needed constraint

### Rules

- Do not modify test files
- Use Tailwind utilities rather than raw CSS where possible (project policy per `project-context.md`)
- The fix should match the existing Account screen approach exactly — do not invent a new pattern

### References

- [Source: _bmad-output/planning-artifacts/epics-2026-04-03.md]
- [Source: _bmad-output/project-context.md]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
