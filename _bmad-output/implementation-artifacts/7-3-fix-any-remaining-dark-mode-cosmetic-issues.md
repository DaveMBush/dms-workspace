# Story 7.3: Fix Any Remaining Dark-Mode Cosmetic Issues

Status: ready-for-dev

## Story

As a developer,
I want all other cosmetic defects identified in Story 7.1 to be resolved,
so that the CUSIP Cache page looks polished in both themes.

## Acceptance Criteria

1. **Given** the audit list from Story 7.1 (excluding items resolved by Epic 5),
   **When** I apply fixes for each remaining defect,
   **Then** a fresh Playwright screenshot of the page in dark mode shows no remaining contrast or layout issues.

2. **And** `pnpm all` and E2E tests pass with no regressions.

## Tasks / Subtasks

- [ ] Review remaining defects from audit (AC: 1)
  - [ ] Read `_bmad-output/implementation-artifacts/cusip-cosmetics-audit.md`
  - [ ] Filter out items already resolved by Epic 5 and Story 7.2
  - [ ] Create a working checklist of remaining defects
- [ ] Fix each remaining defect (AC: 1)
  - [ ] For each defect, apply the fix using `--dms-*` theme variables or Material tokens
  - [ ] No `::ng-deep`, no hardcoded hex/RGB values
  - [ ] Verify fix in both light and dark mode
- [ ] Playwright screenshot verification (AC: 1)
  - [ ] Take fresh Playwright screenshots of the CUSIP Cache page in dark mode
  - [ ] Compare against the defect screenshots from Story 7.1
  - [ ] Verify no contrast or layout issues remain
- [ ] Run full quality checks (AC: 2)
  - [ ] `pnpm all` passes
  - [ ] `pnpm e2e:dms-material:chromium` passes
  - [ ] `pnpm e2e:dms-material:firefox` passes

## Dev Notes

### Architecture Constraints

- No `::ng-deep` — use Material mixin overrides in global theme
- No hardcoded hex or RGB values — use `--dms-*` variables or Material tokens
- This is the LAST story in E7 — E7 completion is a hard prerequisite for E8 Story 8.4
- Storybook visual regression baselines (E8.4) must NOT be captured until ALL E7 cosmetic fixes are resolved

### Key Files

| File | Purpose |
|------|---------|
| `apps/dms-material/src/app/global/cusip-cache/cusip-cache.component.ts` | Component |
| `apps/dms-material/src/app/global/cusip-cache/cusip-cache.html` | Template |
| `apps/dms-material/src/app/global/cusip-cache/cusip-cache.scss` | Styles |
| `apps/dms-material/src/app/global/cusip-cache/cusip-cache-add-dialog.component.ts` | Add dialog |
| `apps/dms-material/src/themes/_theme-variables.scss` | Theme variables |

### Previous Story Intelligence

- Story 7.1: Produced the cosmetic defect audit with screenshots
- Story 7.2: Fixed the white-on-white text in "Recently Added" section

### Epic Sequencing Impact

After this story is complete:
- E7 is done
- E8 Story 8.4 (visual regression baseline capture) can proceed
- Baselines captured before E7 would include cosmetic bugs as the "correct" baseline

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 7, Story 7.3]
- [Source: _bmad-output/planning-artifacts/architecture.md#Failure Mode Register — E7, E8]
- [Source: _bmad-output/implementation-artifacts/cusip-cosmetics-audit.md — from Story 7.1]

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### File List
