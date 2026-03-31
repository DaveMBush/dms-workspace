# Story 39.2: Fix Date Editor Width to Be Consistent When Empty or Filled

Status: Approved

## Story

As Dave (the investor),
I want the date editor field to be the same width whether it is empty or filled with a date,
so that I can easily click on an empty date cell to enter a value.

## Acceptance Criteria

1. **Given** the failing tests from Story 39.1, **When** the CSS fix is applied, **Then** all width-consistency tests pass.
2. **Given** the date editor component, **When** the input is empty, **Then** the input element has a `min-width` (or fixed `width`) set to at least the width of a typical formatted date ("2024-01-15" or locale-equivalent) so it is easy to click.
3. **Given** the date editor component, **When** the input contains a date, **Then** its width is the same as when it is empty (consistent layout).
4. **Given** the fix uses Tailwind or CSS custom properties (no `::ng-deep`, no hardcoded pixel values unless necessary), **When** dark and light mode are toggled, **Then** the date editor width is consistent in both themes.
5. **Given** all changes, **When** `pnpm all` runs, **Then** all tests pass.

## Definition of Done

- [ ] CSS/Tailwind change applied to the date editor component
- [ ] No `::ng-deep` used (follows ADR-002 CSS policy)
- [ ] All tests from Story 39.1 pass
- [ ] `pnpm all` passes
- [ ] `pnpm format` passes

## Tasks / Subtasks

- [ ] Locate the date editor component's template and styles (AC: #2)
- [ ] Identify the minimum width needed to display a typical formatted date string (e.g. `"2024-01-15"` → ~9ch or ~90px depending on font) (AC: #2)
- [ ] Add `min-width` using Tailwind class (e.g. `min-w-[9ch]`) or a CSS custom property on the date input element (AC: #2, #4)
  - [ ] Do NOT use `::ng-deep`
  - [ ] Do NOT use hardcoded pixel values unless no Tailwind equivalent exists
- [ ] Verify the fix works in both light and dark mode themes (AC: #4)
- [ ] Confirm all tests from Story 39.1 now pass (AC: #1)
- [ ] Run `pnpm all` and fix any failures (AC: #5)
- [ ] Run `pnpm format`

## Dev Notes

### Key Files

- The date editor component identified in Story 39.1 (template + styles)
- `tailwind.config.js` — check available Tailwind utilities for min-width if needed
- ADR-002 CSS policy — no `::ng-deep`

### Approach

The simplest fix is adding a Tailwind `min-w-[…]` class to the date `<input>` element. Use `ch` units for font-relative sizing (e.g. `min-w-[10ch]`) rather than pixels to be resilient to font changes. The `ch` unit represents the width of the "0" character in the current font, making it a good proxy for character count. A date like "2024-01-15" is 10 characters, so `min-w-[10ch]` with a bit of extra padding should work well.

## Dev Agent Record

### Agent Model Used

### Completion Notes

## File List
