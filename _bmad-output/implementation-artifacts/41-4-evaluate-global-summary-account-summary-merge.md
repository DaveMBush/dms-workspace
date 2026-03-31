# Story 41.4: Evaluate and Implement Global Summary / Account Summary Merge

Status: Approved

## Story

As a developer,
I want to evaluate whether the Global Summary and Account Summary screens can be combined into a single parameterised component, and implement the merge if the analysis confirms it is viable,
so that both screens share a single implementation and future changes only need to be made in one place.

## Acceptance Criteria

1. **Given** the analysis in Story 41.1, **When** the merge is evaluated, **Then** this story either: (a) merges both screens into a single component with conditional sections for account-specific vs global data, OR (b) documents clearly why the merge is not viable and what the alternative consolidation approach is.
2. **Given** a merge is implemented, **When** the Global Summary route and Account Summary route are both navigated in the e2e test, **Then** both routes render correctly using the unified component.
3. **Given** all existing tests for Global Summary and Account Summary, **When** `pnpm all` runs after the merge, **Then** all tests pass (tests may be merged/refactored but coverage must not decrease).
4. **Given** the merge touches layout and CSS, **When** the change is reviewed, **Then** no `::ng-deep` is used and the CSS follows the Tailwind/CSS-variable conventions from Epic 5.
5. **Given** all changes, **When** `pnpm all` runs, **Then** all tests pass.

## Definition of Done

- [ ] Merge decision documented (viable or not viable with reason)
- [ ] If viable: unified component implemented and both routes tested
- [ ] If not viable: alternative approach implemented and documented
- [ ] All existing tests for both screens still pass
- [ ] `pnpm all` passes
- [ ] `pnpm format` passes

## Tasks / Subtasks

- [ ] Read `duplication-audit.md` from Story 41.1, specifically the Global Summary / Account Summary section (AC: #1)
- [ ] Make a viability decision: merge or not merge (AC: #1)
  - [ ] If merge is viable: design the unified component API (inputs, conditional sections)
  - [ ] If not viable: document the reason and the alternative consolidation approach
- [ ] **If merge:** implement the unified component in `apps/dms-material/src/app/shared/components/` (AC: #1)
  - [ ] Accept an input (e.g. `@Input() mode: 'global' | 'account'` or `accountId?: string`) to switch between views
  - [ ] Update both routes to use the unified component
  - [ ] Migrate or merge existing tests into a single test file
  - [ ] Ensure no `::ng-deep` and CSS follows project conventions (AC: #4)
- [ ] **If not merge:** implement the documented alternative and update relevant tests (AC: #1)
- [ ] Add Playwright e2e test: navigate to Global Summary route → assert correct rendering; navigate to Account Summary route → assert correct rendering (AC: #2)
- [ ] Run `pnpm all` and fix any failures (AC: #5)
- [ ] Run `pnpm format`

## Dev Notes

### Key Files

- `_bmad-output/implementation-artifacts/duplication-audit.md` — Story 41.1 analysis of these two screens
- `apps/dms-material/src/app/global/global-summary/` — Global Summary screen
- `apps/dms-material/src/app/accounts/account-summary/` — Account Summary screen
- `apps/dms-material/src/app/app.routes.ts` — route configuration

### Approach

The merge viability depends on how similar the two screens are. If they share ≥ 80% of their template and logic, a merge with a conditional `@if` for account-specific sections is reasonable. If the differences are too large, the alternative might be extracting shared subcomponents (e.g. a shared `SummaryChartComponent`) rather than merging the whole screen. Either outcome is valid — the key is a clear, documented decision.

## Dev Agent Record

### Agent Model Used

### Completion Notes

## File List
