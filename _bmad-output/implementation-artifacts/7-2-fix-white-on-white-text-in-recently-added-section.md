# Story 7.2: Fix White-on-White Text in Recently Added Section

Status: ready-for-dev

## Story

As a developer,
I want the "Recently Added" section of the CUSIP Cache page to display correctly in dark mode,
so that users can read all text regardless of the active theme.

## Acceptance Criteria

1. **Given** the CUSIP Cache page in dark mode,
   **When** I view the "Recently Added" section,
   **Then** all text is legible (sufficient contrast ratio ≥ 4.5:1 against its background).

2. **And** the fix uses `--dms-*` theme variables or Angular Material color tokens — no hardcoded hex or RGB values.

3. **And** the fix also renders correctly in light mode (no regression).

## Tasks / Subtasks

- [ ] Identify the root cause (AC: 1)
  - [ ] Open the CUSIP Cache component source
  - [ ] Inspect the "Recently Added" section styles
  - [ ] Determine which CSS rule(s) cause white-on-white text in dark mode
  - [ ] Check if it's a hardcoded color, missing theme variable, or Material override issue
- [ ] Apply the fix (AC: 1, 2)
  - [ ] Replace hardcoded colors with `--dms-*` theme variables or Material tokens
  - [ ] Ensure the fix respects the `.dark-theme` class toggle
  - [ ] Do NOT use `::ng-deep` — use Material mixin overrides in global theme if needed
  - [ ] Do NOT add hardcoded hex or RGB values
- [ ] Verify contrast ratio (AC: 1)
  - [ ] Check text/background contrast ratio ≥ 4.5:1 in dark mode
  - [ ] Use browser dev tools or accessibility checker
- [ ] Verify no regression in light mode (AC: 3)
  - [ ] Test the same section in light mode
  - [ ] Confirm text is still readable and styled correctly
- [ ] Run quality checks
  - [ ] `pnpm all` passes
  - [ ] Visual verification in both themes

## Dev Notes

### Architecture Constraints

- No `::ng-deep` — banned by ESLint
- No hardcoded hex or RGB values — use `--dms-*` variables or Material tokens only
- Tailwind `bg-*`, `text-*`, `border-*` color classes should NOT be used on Material components

### Key Files

| File                                                                    | Purpose                                |
| ----------------------------------------------------------------------- | -------------------------------------- |
| `apps/dms-material/src/app/global/cusip-cache/cusip-cache.component.ts` | Component source                       |
| `apps/dms-material/src/app/global/cusip-cache/cusip-cache.html`         | Template with "Recently Added" section |
| `apps/dms-material/src/app/global/cusip-cache/cusip-cache.scss`         | Component styles                       |
| `apps/dms-material/src/themes/_theme-variables.scss`                    | Theme variable definitions             |
| `apps/dms-material/src/themes/_dark-theme.scss`                         | Dark theme definition                  |

### WCAG Contrast Requirements

- Normal text: contrast ratio ≥ 4.5:1 (WCAG AA)
- Large text (18px+ or 14px+ bold): contrast ratio ≥ 3:1

### Previous Story Intelligence

Story 7.1 produces the cosmetic defect audit document. The white-on-white issue in "Recently Added" is a known primary defect.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 7, Story 7.2]
- [Source: _bmad-output/planning-artifacts/architecture.md#Failure Mode Register — E7]
- [Source: _bmad-output/project-context.md#Anti-Patterns — ::ng-deep]

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### File List
