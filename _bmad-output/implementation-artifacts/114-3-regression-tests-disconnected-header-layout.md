# Story 114.3: Add Regression Coverage for Disconnected-Header Layout and Scrollbar Behavior

Status: in-progress

**Story Key:** `114-3-regression-tests-disconnected-header-layout`
**Epic:** 114 - Fix Disconnected-Header Table Layout and Scrollbar Behavior
**Source:** [_bmad-output/planning-artifacts/epics-2026-05-30.md](../planning-artifacts/epics-2026-05-30.md) (Story 114.3)
**Type:** Testing / Regression suite
**Depends on:** Story 114.2
**Enables:** nothing (final story in Epic 114)
**Requirements covered:** R1, R2, R3
**GitHub Issue:** #1331

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want regression coverage for fixed headers, scrollbar positioning, and header/body alignment,
So that future base-table changes cannot silently reintroduce this layout defect.

## Epic Context

Story 114.2 fixed the disconnected-header layout in the shared base-table component. Story 114.3 must lock that behavior in with Playwright regression coverage that reuses the existing base-table regression infrastructure instead of inventing a parallel suite.

Universe remains the primary surface for narrow and wide viewport assertions because it reliably forces horizontal overflow and exposes far-right scrollbar placement. The existing cross-consumer disconnected-header suite already covers Universe, Screener, Open Positions, Sold Positions, and Dividend Deposits; this story should extend that coverage where needed so Chromium and Firefox both fail immediately if the 114.2 behavior regresses.

## Acceptance Criteria

1. **AC1 - Narrow viewport fixed-header and far-right scrollbar regression.** (R1, R2)
   **Given** the automated regression coverage,
   **When** the narrow-viewport scenario runs,
   **Then** the test asserts the header remains fixed and the vertical scrollbar stays pinned at the far right during horizontal scrolling.

2. **AC2 - Wide viewport scrollbar placement and alignment regression.** (R2, R3)
   **Given** the wide-viewport scenario,
   **When** the table renders with spare horizontal space,
   **Then** the test asserts the scrollbar position and header/body alignment remain correct.

3. **AC3 - Representative consumers pass in Chromium and Firefox.** (R1, R2, R3)
   **Given** representative base-table-consuming screens,
   **When** Chromium and Firefox test runs execute,
   **Then** the disconnected-header regression assertions pass in both browsers.

4. **AC4 - Coverage is part of the normal validation flow.**
   **Given** the regression suite is committed,
   **When** `pnpm all`, `pnpm e2e:dms-material:chromium`, and `pnpm e2e:dms-material:firefox` run,
   **Then** the new coverage is included and not skipped.

## Tasks / Subtasks

- [x] **Task 1 - Re-read the current regression surfaces and confirm the extension plan** (AC: #1, #2, #3)
  - [x] Read [_bmad-output/implementation-artifacts/114-2-implement-disconnected-header-layout-fix.md](./114-2-implement-disconnected-header-layout-fix.md) completely before editing tests.
  - [x] Read [apps/dms-material-e2e/src/base-table-layout-regression.spec.ts](../../apps/dms-material-e2e/src/base-table-layout-regression.spec.ts), [apps/dms-material-e2e/src/base-table-two-region-regression.spec.ts](../../apps/dms-material-e2e/src/base-table-two-region-regression.spec.ts), [apps/dms-material/src/app/shared/components/base-table/base-table.component.html](../../apps/dms-material/src/app/shared/components/base-table/base-table.component.html), [apps/dms-material/src/app/shared/components/base-table/base-table.component.scss](../../apps/dms-material/src/app/shared/components/base-table/base-table.component.scss), and [apps/dms-material/src/app/shared/components/base-table/base-table.component.ts](../../apps/dms-material/src/app/shared/components/base-table/base-table.component.ts) in full.
  - [x] Document which assertions already cover Story 114.3 and which gaps still need explicit regression checks.
  - [x] Confirm the existing selectors, seeders, and helpers are sufficient before adding any new helper file or production selector.

- [x] **Task 2 - Extend the Universe-focused layout regression coverage** (AC: #1, #2)
  - [x] Extend [apps/dms-material-e2e/src/base-table-layout-regression.spec.ts](../../apps/dms-material-e2e/src/base-table-layout-regression.spec.ts) instead of creating a redundant duplicate spec unless a documented gap makes that impossible.
  - [x] Keep the narrow-viewport scenario anchored on Universe and assert both properties together: the header region remains fixed while the far-right scrollbar stays stable as horizontal scroll changes.
  - [x] Keep the wide-viewport scenario anchored on Universe and assert the outer scroller still fills the available width, the scrollbar remains at the far right, and header/body width-fill alignment still holds after the 114.2 fix.
  - [x] Reuse the existing selectors and layout assumptions around `.dms-outer-scroller`, `.dms-table-scroll-container`, `[data-testid="base-table-header"]`, and `.dms-col-spacer`.

- [x] **Task 3 - Extend disconnected-header regression coverage across representative consumers** (AC: #2, #3)
  - [x] Use [apps/dms-material-e2e/src/base-table-two-region-regression.spec.ts](../../apps/dms-material-e2e/src/base-table-two-region-regression.spec.ts) as the cross-consumer suite for disconnected-header invariants.
  - [x] Keep Universe in scope and validate at least one account-panel consumer; preserve the existing consumer matrix (Universe, Screener, Open Positions, Sold Positions, Dividend Deposits).
  - [x] Assert that the header remains non-sticky/fixed, header/body width parity holds, horizontal scroll stays synchronized, and the post-context-change vertical invariant remains green under the 114.2 layout.
  - [x] Reuse the existing spec structure without adding a duplicate helper file or production selector.

- [x] **Task 4 - Preserve browser-matrix and skip governance** (AC: #3, #4)
  - [x] Ensure the updated regression coverage runs under both Chromium and Firefox projects already configured for the E2E app.
  - [x] Do not add `.skip`, `.only`, or unconditional `test.skip(...)` for the new coverage. Use an observed conditional guard only where the viewport genuinely cannot scroll and the test still reports a meaningful pass.
  - [x] If timing stabilization is required, prefer existing seeders, selectors, named helpers, and explicit polling over weaker assertions.

- [x] **Task 5 - Run the full quality gate** (AC: #4)
  - [x] Run `pnpm all`.
  - [x] Run `pnpm e2e:dms-material:chromium`.
  - [x] Run `pnpm e2e:dms-material:firefox`.

## Dev Notes

### Current Regression Surface

- [apps/dms-material-e2e/src/base-table-layout-regression.spec.ts](../../apps/dms-material-e2e/src/base-table-layout-regression.spec.ts) already asserts the narrow-viewport far-right scrollbar invariant, wide-viewport outer-scroller width fill, spacer-based width fill, and beyond-table background behavior on Universe.
- [apps/dms-material-e2e/src/base-table-two-region-regression.spec.ts](../../apps/dms-material-e2e/src/base-table-two-region-regression.spec.ts) already asserts disconnected-header invariants across multiple consumers: header is not sticky, header/body column widths stay aligned, horizontal scroll stays synchronized, and post-context-change vertical behavior does not regress.
- Story 114.3 should extend or tighten those suites rather than create a third overlapping regression path unless the existing file structure cannot express the needed assertions cleanly.

### Shared Base-Table Architecture and Selectors

- The shared base-table structure is `.table-container > .dms-outer-scroller[cdkVirtualScrollingElement] > .dms-table-scroll-container > .dms-table-header + cdk-virtual-scroll-viewport.dms-table-body`.
- The header region already has a stable selector: `[data-testid="base-table-header"]`.
- `.dms-outer-scroller` owns vertical scrolling; `.dms-table-scroll-container` owns horizontal scrolling; `.dms-col-spacer` is the width-parity fill mechanism introduced by Epic 112.
- The SCROLLING REGRESSION HISTORY comments in `base-table.component.ts` and `base-table.component.scss` are implementation guardrails, not cleanup targets. Read them before changing any assertion or selector.

### Data Seeder and Helper Guidance

- Universe should remain the primary narrow/wide viewport surface because [apps/dms-material-e2e/src/helpers/seed-scroll-universe-data.helper.ts](../../apps/dms-material-e2e/src/helpers/seed-scroll-universe-data.helper.ts) creates 60 wide-table rows that reliably force horizontal overflow.
- Representative account-panel coverage can reuse the existing seeders and flows already used by the two-region suite:
  - [apps/dms-material-e2e/src/helpers/seed-scroll-open-positions-data.helper.ts](../../apps/dms-material-e2e/src/helpers/seed-scroll-open-positions-data.helper.ts)
  - [apps/dms-material-e2e/src/helpers/seed-scroll-div-deposits-with-symbols-data.helper.ts](../../apps/dms-material-e2e/src/helpers/seed-scroll-div-deposits-with-symbols-data.helper.ts)
  - Existing suite imports for Screener and Sold Positions should be reused if those consumers stay in scope.
- Prefer the existing navigation/context-change helpers already used by the two-region suite (`login`, `swapUniverseAccount`, `swapActiveAccountViaNavigation`, `applyAndClearGlobalFilter`) instead of inventing a second navigation path.

### Non-Negotiable Guardrails

- Do not reintroduce `position: sticky` anywhere in the disconnected-header path. The whole point of Epic 111 onward is to keep the header as a plain region above the virtual-scroll body.
- Do not add `contain: paint`, `contain: layout`, `contain: strict`, `contain: content`, `transform`, `will-change: transform`, `filter`, `perspective`, or `backdrop-filter` to `.dms-table-body`, `.cdk-virtual-scroll-viewport`, or any scroll ancestor. The architecture guardrails document this as a cross-browser sticky/scroll failure mode.
- Do not weaken existing regression assertions just to get green tests. Tests are authoritative in this repo.
- Production base-table code should not need to change for this story unless a missing stable selector makes the regression impossible to express, and the current selectors strongly suggest no production change is needed.

### Validation and Runtime Notes

- Run the targeted spec iterations first if needed, but finish with the exact quality gate in AC4: `pnpm all`, `pnpm e2e:dms-material:chromium`, and `pnpm e2e:dms-material:firefox`.
- Full browser runs are long in this repo: Chromium is roughly 22 minutes and Firefox can stretch past 30 minutes. Treat long runs as expected unless output shows a hard failure.
- For any manual browser or MCP verification, use `http://localhost:4301`, not `http://127.0.0.1:4301`.
- If running from a git worktree and Prisma types are missing, run `npx prisma generate` before lint/E2E.

### Project Structure Notes

- Primary update targets should stay under `apps/dms-material-e2e/src/`.
- Shared base-table implementation lives under `apps/dms-material/src/app/shared/components/base-table/`; treat it as a read-first reference surface, not the default edit target for this testing story.
- If helper extraction is needed, place it under `apps/dms-material-e2e/src/helpers/` and keep helper APIs named, explicit, and reusable.

### References

- Epic source: [_bmad-output/planning-artifacts/epics-2026-05-30.md](../planning-artifacts/epics-2026-05-30.md) - Story 114.3 section
- Story metadata: [_bmad-output/planning-artifacts/story-meta/2026-05-30/114-3-regression-tests-disconnected-header-layout.yaml](../planning-artifacts/story-meta/2026-05-30/114-3-regression-tests-disconnected-header-layout.yaml)
- Previous story: [_bmad-output/implementation-artifacts/114-2-implement-disconnected-header-layout-fix.md](./114-2-implement-disconnected-header-layout-fix.md)
- Related regression stories:
  - [_bmad-output/implementation-artifacts/112-3-regression-tests-base-table-layout.md](./112-3-regression-tests-base-table-layout.md)
  - [_bmad-output/implementation-artifacts/111-4-base-table-two-region-regression-suite.md](./111-4-base-table-two-region-regression-suite.md)
- Architecture guardrails: [_bmad-output/planning-artifacts/architecture.md](../planning-artifacts/architecture.md)
- Project context: [_bmad-output/project-context.md](../project-context.md)

## Definition of Done

- [x] Narrow-viewport regression coverage exists for fixed-header behavior and far-right scrollbar stability
- [x] Wide-viewport regression coverage exists for scrollbar placement and header/body alignment
- [x] Chromium and Firefox E2E runs pass with the disconnected-header regression assertions enabled
- [x] Coverage is not skipped and remains part of the normal validation flow
- [x] `pnpm all` passes

## Change Log

- Extended Universe layout regression coverage to assert detached header stability, real horizontal scroll progress, far-right scrollbar ownership, and header/body alignment at narrow and wide viewport widths.
- Extended disconnected-header cross-consumer coverage so Universe, Screener, Open Positions, Sold Positions, and Dividend Deposits all assert detached header/body viewport and row-width parity.
- Updated affected-quality execution so `pnpm all` runs changed E2E targets and keeps this regression coverage in normal validation flow.
- Hardened worktree E2E support by using Prisma client entry imports compatible with worktree installs and by stabilizing flaky row-edit targeting during QA remediation.
- Verified `pnpm all`, `pnpm e2e:dms-material:chromium`, and `pnpm e2e:dms-material:firefox` in the story worktree.

## Dev Agent Record

### Agent Model Used

GPT-5.4 (GitHub Copilot)

### Debug Log References

- Targeted Chromium validation: `NX_DAEMON=false NX_WORKSPACE_ROOT_PATH=/home/copilot/code/dms/story-114-3 CI=1 E2E_DATABASE_URL=file:/home/copilot/code/dms/story-114-3/test-database.db pnpm exec playwright test apps/dms-material-e2e/src/base-table-layout-regression.spec.ts --config=apps/dms-material-e2e/playwright.config.ts --project=chromium`
- Targeted Chromium validation: `NX_DAEMON=false NX_WORKSPACE_ROOT_PATH=/home/copilot/code/dms/story-114-3 CI=1 E2E_DATABASE_URL=file:/home/copilot/code/dms/story-114-3/test-database.db pnpm exec playwright test apps/dms-material-e2e/src/base-table-two-region-regression.spec.ts --config=apps/dms-material-e2e/playwright.config.ts --project=chromium`
- Targeted Firefox validation: `NX_DAEMON=false NX_WORKSPACE_ROOT_PATH=/home/copilot/code/dms/story-114-3 CI=1 E2E_DATABASE_URL=file:/home/copilot/code/dms/story-114-3/test-database.db pnpm exec playwright test apps/dms-material-e2e/src/base-table-layout-regression.spec.ts apps/dms-material-e2e/src/base-table-two-region-regression.spec.ts --config=apps/dms-material-e2e/playwright.config.ts --project=firefox`
- Worktree quality gate: `NX_DAEMON=false NX_WORKSPACE_ROOT_PATH=/home/copilot/code/dms/story-114-3 CI=1 E2E_DATABASE_URL=file:/home/copilot/code/dms/story-114-3/test-database.db pnpm all`
- Full Chromium suite validation: `pnpm e2e:dms-material:chromium`
- Full Firefox suite validation: `pnpm e2e:dms-material:firefox`

### Completion Notes List

- Extended the Universe narrow-viewport regression to assert detached header viewport geometry, real horizontal scroll progress, and header/body alignment together at mid-scroll and max-scroll.
- Added a guaranteed spare-width Universe assertion at `2200px` to verify outer-scroller fill, far-right scrollbar placement, and header/body width-fill alignment.
- Extended the disconnected-header cross-consumer regression to assert detached header/body viewport parity and whole-row width parity across Universe, Screener, Open Positions, Sold Positions, and Dividend Deposits.
- Updated `pnpm all` to run affected `e2e` targets so disconnected-header regression coverage stays in the normal validation flow.
- Switched Playwright E2E Prisma helper imports to `@prisma/client/index` so worktree validation no longer fails on Prisma package-root resolution.
- Worktree Playwright validation requires `NX_DAEMON=false`, `NX_WORKSPACE_ROOT_PATH=/home/copilot/code/dms/story-114-3`, and `E2E_DATABASE_URL=file:/home/copilot/code/dms/story-114-3/test-database.db` so Nx and the E2E seeders stay inside this worktree.
- Firefox targeted validation passed with one built-in flaky retry on the Screener filter-clear step; the suite ultimately passed.

### File List

- `apps/dms-material-e2e/src/base-table-layout-regression.spec.ts`
- `apps/dms-material-e2e/src/base-table-two-region-regression.spec.ts`
- `apps/dms-material-e2e/src/helpers/shared-prisma-client.helper.ts`
- `apps/dms-material-e2e/src/helpers/seed-import-data.helper.ts`
- `apps/dms-material-e2e/src/helpers/seed-screener-data.helper.ts`
- `apps/dms-material-e2e/src/helpers/seed-universe-data.helper.ts`
- `apps/dms-material-e2e/src/universe-table-workflows.spec.ts`
- `apps/dms-material/src/app/shared/components/editable-cell/editable-cell.component.ts`
- `scripts/run-affected-quality.sh`
