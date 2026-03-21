# Story 7.1: Inspect CUSIP Cache Page in Dark Mode

Status: ready-for-dev

## Story

As a developer,
I want to load the application in dark mode and visually inspect the CUSIP Cache page,
so that I have a concrete list of cosmetic defects to fix.

## Acceptance Criteria

1. **Given** the application running locally with dark mode enabled,
   **When** I navigate to the CUSIP Cache page,
   **Then** I capture a screenshot and document each visible cosmetic defect (white-on-white, invisible text, incorrect background, layout misalignment) in `_bmad-output/implementation-artifacts/cusip-cosmetics-audit.md`.

2. **And** if Epic 5 has been completed, I confirm which defects (if any) are still present.

## Tasks / Subtasks

- [ ] Start the application locally (AC: 1)
  - [ ] Run `pnpm start:server` and `pnpm start:dms-material`
  - [ ] Enable dark mode via the theme toggle (`.dark-theme` class on body)
  - [ ] Navigate to the CUSIP Cache page
- [ ] Visual inspection (AC: 1)
  - [ ] Capture screenshots of the CUSIP Cache page in dark mode
  - [ ] Inspect the "Recently Added" section for white-on-white text
  - [ ] Inspect all table headers, rows, and cell text for contrast issues
  - [ ] Inspect buttons, input fields, and dialog elements
  - [ ] Check layout alignment and spacing in dark mode
  - [ ] Also capture screenshot in light mode for comparison
- [ ] Check if Epic 5 resolved issues (AC: 2)
  - [ ] If Epic 5 (CSS migration) has been completed, compare before/after
  - [ ] Document which defects were already resolved by the CSS migration
  - [ ] Document which defects remain and need new fixes
- [ ] Create audit document (AC: 1)
  - [ ] Create `_bmad-output/implementation-artifacts/cusip-cosmetics-audit.md`
  - [ ] For each defect: description, location (component/element), severity, screenshot reference
  - [ ] Include proposed fix approach for each defect
  - [ ] Mark defects as "resolved by E5" or "needs fix"

## Dev Notes

### Architecture Constraints

- E5 + E6 together may resolve E7 issues — this story MUST verify before adding new fixes
- Architecture Failure Mode Register: "Fix uses `::ng-deep` (banned)" — ESLint catches it; use Material mixin or `--dms-*` variables only
- No `::ng-deep` — use Angular Material mixin overrides in global theme

### Key Components to Inspect

| Component              | File                                                                               | Known Issue         |
| ---------------------- | ---------------------------------------------------------------------------------- | ------------------- |
| CUSIP Cache            | `apps/dms-material/src/app/global/cusip-cache/cusip-cache.component.ts`            | Dark mode cosmetics |
| CUSIP Cache template   | `apps/dms-material/src/app/global/cusip-cache/cusip-cache.html`                    | White-on-white text |
| CUSIP Cache styles     | `apps/dms-material/src/app/global/cusip-cache/cusip-cache.scss`                    | Hardcoded colors?   |
| CUSIP Cache Add Dialog | `apps/dms-material/src/app/global/cusip-cache/cusip-cache-add-dialog.component.ts` | Check dark mode     |

### Theme Variables Available

Use `--dms-*` custom properties for fixes:

- `--dms-background`, `--dms-surface`
- `--dms-text-primary`, `--dms-text-secondary`
- `--dms-border`

### Epic Sequencing

This story is part of E7, which is sequenced after E5 (CSS migration) and E6 (Tailwind v4 upgrade). E7 is a hard prerequisite for E8 Story 8.4 (visual regression baselines).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 7, Story 7.1]
- [Source: _bmad-output/planning-artifacts/architecture.md#Failure Mode Register — E7]
- [Source: _bmad-output/project-context.md#Dark Mode]

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### File List
