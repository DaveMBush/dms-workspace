# Story 111.3: Verify Every Consuming Screen After Base-Table Refactor

Status: Approved

**Story Key:** `111-3-verify-all-screens-after-refactor`
**Epic:** 111 — Eliminate Janky Scroll by Decoupling Sticky Header from Virtualized Body (Round 10)
**Source:** [_bmad-output/planning-artifacts/epics-2026-05-23.md](../planning-artifacts/epics-2026-05-23.md) (Story 111.3)
**Type:** Verification (manual + automated regression check)
**Depends on:** Story 111.2
**Enables:** Story 111.4
**Requirements covered:** R10, R11

## Story

As a developer,
I want to exercise every screen identified in the Story 111.1 consumer inventory — covering sort, filter, scroll (vertical and horizontal), edit, add, delete, row selection, account-change, and filter-change — on both Chromium and Firefox,
So that the Story 111.2 refactor has not broken any consumer (R10) and Round 10 actually eliminates scrolling artifacts everywhere (R11).

## Epic Context

Story 111.2 refactored the base table to a two-region layout. Because the base table is used on every list screen, the refactor must be verified end-to-end on each consumer in both supported browsers before the epic is considered done. Any regression discovered is fixed within **this** story (not deferred). Prior epics' regression suites (101, 105, 106) must continue to pass.

## Acceptance Criteria

1. **AC1 — Each consuming screen exercised end-to-end.** (R10)
   **Given** the Story 111.1 consumer inventory,
   **When** the developer drives each consuming screen via the Playwright MCP
   server,
   **Then** for each screen Dev Notes record: sort works, filter works, vertical
   scrolling is smooth at all tested speeds, horizontal scrolling (when applicable)
   is smooth and header-aligned, edit / add / delete / row-select work, and
   account-change + filter-change do not produce any header artifact.

2. **AC2 — Per-screen × per-browser pass/fail matrix.** (R10, R11)
   **Given** the inventory is swept,
   **When** the developer summarises results,
   **Then** Dev Notes contain a per-screen × per-browser pass/fail matrix, and
   any failures have a recorded fix applied within this story.

3. **AC3 — Prior regression suites still pass.** (R10, R11)
   **Given** the prior scrolling epics' regression suites (Epics 101, 105, 106),
   **When** they are re-run,
   **Then** every assertion still passes — Round 10 has not regressed any prior
   round's gains.

4. **AC4 — Quality gate.**
   **Given** `pnpm all` runs,
   **Then** all tests pass.

## Tasks / Subtasks

- [ ] **Task 1 — Build the per-screen verification checklist** (AC: #1, #2)
  - [ ] Copy the consumer list from Story 111.1 Dev Notes. Expected baseline
        (verify each):
    - Universe — [apps/dms-material/src/app/global/global-universe/](../../apps/dms-material/src/app/global/global-universe/)
    - Screener — `apps/dms-material/src/app/global/global-screener/`
    - Open Positions — account-panel-related
    - Sold Positions — account-panel-related
    - Dividend Deposits — account-panel-related
  - [ ] For each screen, list the user actions to exercise: sort by 1 column,
        filter (account / symbol / text), vertical scroll slow + fast, horizontal
        scroll if total column width > viewport, edit a cell (if editable),
        add a row (if supported), delete a row (if supported), select a row
        (if supported), change account, change filter.

- [ ] **Task 2 — Drive each screen via Playwright MCP** (AC: #1, #2)
  - [ ] For every screen × every browser (chromium, firefox), open the screen
        via Playwright MCP, run through the action checklist from Task 1,
        capture any anomaly (header drift, overlap, scrolls-with-content,
        column misalignment, missing button, broken edit, etc.).
  - [ ] Record per-cell PASS / FAIL in the matrix in Dev Notes with a one-line
        note for each FAIL.

- [ ] **Task 3 — Fix any regressions discovered** (AC: #2)
  - [ ] For each FAIL, diagnose the root cause and fix it within this story.
        Do not defer regressions to a later story.
  - [ ] Re-run the affected cell after the fix; update the matrix to PASS.

- [ ] **Task 4 — Re-run prior-epic regression suites** (AC: #3)
  - [ ] Locate the Epic 101/105/106 scrolling regression specs in
        [apps/dms-material-e2e/src/](../../apps/dms-material-e2e/src/) (e.g.
        `scrolling-regression-105.spec.ts`,
        `scrolling-regression-106-investigation.spec.ts`).
  - [ ] Run on both Chromium and Firefox. Record results in Dev Notes.
  - [ ] If any prior assertion fails, treat as a regression to fix within
        this story (NFR2).

- [ ] **Task 5 — Quality gate** (AC: #4)
  - [ ] Run `pnpm e2e:dms-material:chromium`, `pnpm e2e:dms-material:firefox`,
        `pnpm all`. Record all three.

## Dev Notes

### Architecture & Code Pointers

- **Consumer inventory source:** Story 111.1 Dev Notes —
  [111-1-design-base-table-two-region-layout.md](./111-1-design-base-table-two-region-layout.md).
- **Universe screen:** [apps/dms-material/src/app/global/global-universe/](../../apps/dms-material/src/app/global/global-universe/).
- **E2E specs:** [apps/dms-material-e2e/src/](../../apps/dms-material-e2e/src/).

### Verification Matrix Template (fill in during Task 2)

| Screen              | Browser  | Sort | Filter | V-scroll | H-scroll | Edit | Add | Delete | Select | Acct-change | Filter-change | Notes |
|---------------------|----------|------|--------|----------|----------|------|-----|--------|--------|--------------|----------------|-------|
| Universe            | chromium |      |        |          |          |      |     |        |        |              |                |       |
| Universe            | firefox  |      |        |          |          |      |     |        |        |              |                |       |
| Screener            | chromium |      |        |          |          |      |     |        |        |              |                |       |
| Screener            | firefox  |      |        |          |          |      |     |        |        |              |                |       |
| Open Positions      | chromium |      |        |          |          |      |     |        |        |              |                |       |
| Open Positions      | firefox  |      |        |          |          |      |     |        |        |              |                |       |
| Sold Positions      | chromium |      |        |          |          |      |     |        |        |              |                |       |
| Sold Positions      | firefox  |      |        |          |          |      |     |        |        |              |                |       |
| Dividend Deposits   | chromium |      |        |          |          |      |     |        |        |              |                |       |
| Dividend Deposits   | firefox  |      |        |          |          |      |     |        |        |              |                |       |

### Testing Standards

- Use the Playwright MCP server for manual verification (per NFR3).
- Do not weaken any existing test assertion (NFR5). If a regression suite
  fails because the DOM structure changed, **diagnose first** — the structural
  change might be correct (e.g. `tr.mat-mdc-header-row` no longer exists),
  in which case update the selector while preserving the assertion semantics.
- `pnpm all` must pass.

### Project Structure Notes

- Repo memory: [/memories/repo/e2e-timing.md](../../../memories/repo/e2e-timing.md)
  for cross-browser timing gotchas.
- Project conventions per [_bmad-output/project-context.md](../project-context.md).

### References

- Epic source: [_bmad-output/planning-artifacts/epics-2026-05-23.md](../planning-artifacts/epics-2026-05-23.md) — Story 111.3 section
- Story 111.1: [111-1-design-base-table-two-region-layout.md](./111-1-design-base-table-two-region-layout.md)
- Story 111.2: [111-2-refactor-base-table-two-region.md](./111-2-refactor-base-table-two-region.md)
- E2E app: [apps/dms-material-e2e/](../../apps/dms-material-e2e/)

## Definition of Done

- [ ] Every consuming screen exercised per the inventory
- [ ] Per-screen × per-browser pass/fail matrix in Dev Notes
- [ ] Any regression found is fixed within this story
- [ ] Epic 101 / 105 / 106 regression suites all still pass
- [ ] No header drift / flicker / overlap on any screen (R11)
- [ ] `pnpm all` passes

## Dev Agent Record

### Agent Model Used

_To be filled by dev agent._

### Debug Log References

_To be filled by dev agent._

### Completion Notes List

_To be filled by dev agent._

### File List

_To be filled by dev agent._
