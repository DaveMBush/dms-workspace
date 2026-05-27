# Story 113.1: Reproduce and Investigate When Universe Sort State Is Lost

Status: Approved

**Story Key:** `113-1-investigate-universe-sort-vanishing`
**Epic:** 113 — Fix Universe Sticky Sort State Loss
**Source:** [_bmad-output/planning-artifacts/epics-2026-05-27.md](../planning-artifacts/epics-2026-05-27.md) (Story 113.1)
**Type:** Investigation / Design
**Depends on:** none
**Enables:** Story 113.2, Story 113.3

## Story

As a developer,
I want to systematically reproduce the Universe sort state loss and trace exactly which code path resets the sort state, under which interaction(s),
So that Story 113.2 applies the fix to the correct layer.

## Epic Context

**Epic 113 Goal:** The Universe screen's sticky sort state periodically vanishes under undetermined conditions, forcing Dave to re-sort manually. The sort state was made persistent in Epics 24 and 25 and should survive all normal interactions. This story (113.1) is the **investigation** story — it reproduces the bug, identifies the triggering interaction(s), and traces the code path that causes the reset. **No production code is modified.**

## Acceptance Criteria

1. **AC1 — Reproduction via Playwright MCP across all six interactions.**
   **Given** the Universe screen with a multi-column sort active,
   **When** the developer performs each of the following in turn via the Playwright MCP server: (a) row edit, (b) row add, (c) row delete, (d) account filter change, (e) navigate away and back, (f) page reload,
   **Then** Dev Notes record which interaction(s) cause the sort state to reset and which leave it intact.

2. **AC2 — Code path of sort state reset traced.**
   **Given** the identified trigger interaction(s),
   **When** the developer traces the code path from that interaction to the sort state signal / store slice,
   **Then** Dev Notes record (a) the exact signal, selector, or store key that holds the sort state, (b) where in the code the state is reset (e.g. a SmartSignals context reinitialisation, an NgRx action dispatch, a `contextId` change, or explicit signal assignment), and (c) why that reset is happening.

3. **AC3 — Persistence layer reviewed.**
   **Given** the existing sort persistence mechanism (Epic 24 / 25),
   **When** the developer reviews the persistence layer (local storage key, signal wiring, load-on-init path),
   **Then** Dev Notes confirm whether the persistence layer is called at all on the trigger interaction and whether it is called before or after the state reset.

4. **AC4 — Fix strategy proposed.**
   **Given** the root cause is understood,
   **When** the developer drafts the fix approach,
   **Then** Dev Notes specify: (a) where to intercept or prevent the spurious reset, and (b) any required change to the persistence write-timing so the saved state is not stale when the component re-initialises.

5. **AC5 — No production code changes; quality gate passes.**
   **Given** the investigation is complete,
   **When** `pnpm all` runs,
   **Then** all tests pass.

## Tasks / Subtasks

- [ ] **Task 1 — Reproduce the sort state loss via Playwright MCP** (AC: #1)
  - [ ] Open the Universe screen. Apply a multi-column sort (e.g. primary sort on Symbol ascending, secondary sort on Last Price descending). Confirm sort indicators are visible.
  - [ ] Perform interaction (a): edit a cell value (e.g. change the Risk Group of a row). Confirm or deny that the sort state survived. Record in Dev Notes.
  - [ ] Perform interaction (b): add a new symbol row. Confirm or deny. Record.
  - [ ] Perform interaction (c): delete a row. Confirm or deny. Record.
  - [ ] Perform interaction (d): change the account filter. Confirm or deny. Record.
  - [ ] Perform interaction (e): navigate to another screen and back. Confirm or deny. Record.
  - [ ] Perform interaction (f): reload the page. Confirm or deny. Record.

- [ ] **Task 2 — Locate the sort state signal / store key** (AC: #2)
  - [ ] Search the Universe component and its services for sort-related state: grep for `sort`, `sortState`, `sortColumns`, `multiSort` or similar identifiers in `apps/dms-material/src/app/global/global-universe/`.
  - [ ] Identify whether sort state is stored in a SmartSignals context (SmartNgRX), a plain Angular `signal()`, NgRx store, or local component state.
  - [ ] Record the exact state location (file, class, field name) in Dev Notes.

- [ ] **Task 3 — Trace the reset for each triggering interaction** (AC: #2)
  - [ ] For each interaction identified in Task 1 as triggering a reset, trace the call chain: the user action → the event handler / NgRx action / signal effect → the point where the sort state signal/slice is assigned a new value or reset to default.
  - [ ] Determine whether the reset is intentional (e.g. a data-refresh routine that re-initialises all UI state) or incidental (e.g. a `contextId` change that causes SmartSignals to rebuild, wiping the derived sort signal).

- [ ] **Task 4 — Review the persistence layer** (AC: #3)
  - [ ] Find the persistence write path: where is the sort state written to `localStorage` (or equivalent)?
  - [ ] Find the persistence read path: where is it read back and applied to the sort state signal on init / re-init?
  - [ ] Determine whether the write happens before or after the triggering interaction's reset, explaining why the persisted value might be stale.

- [ ] **Task 5 — Draft fix strategy** (AC: #4)
  - [ ] Describe the exact code location(s) to modify to prevent the spurious reset or to restore state from persistence after the reset.
  - [ ] Note any edge cases (e.g. first-load with no saved state, sort reset intentionally triggered by a user action that should clear it).

- [ ] **Task 6 — Quality gate** (AC: #5)
  - [ ] Run `pnpm all` and confirm all tests pass. No production code was changed.
