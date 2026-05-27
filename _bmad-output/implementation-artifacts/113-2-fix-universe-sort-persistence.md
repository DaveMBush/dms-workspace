# Story 113.2: Fix Universe Sort State Persistence

Status: Approved

**Story Key:** `113-2-fix-universe-sort-persistence`
**Epic:** 113 — Fix Universe Sticky Sort State Loss
**Source:** [_bmad-output/planning-artifacts/epics-2026-05-27.md](../planning-artifacts/epics-2026-05-27.md) (Story 113.2)
**Type:** Implementation
**Depends on:** Story 113.1
**Enables:** Story 113.3
**Requirements covered:** R5, R6

## Story

As Dave,
I want the Universe screen's sort state to survive all normal interactions — row edits, adds, deletes, account filter changes, navigation away and back, and page reloads — so that I never have to re-sort the screen manually.

## Epic Context

Story 113.1 identified the exact trigger(s) for the sort state loss and proposed a fix strategy. This story applies that fix and verifies all six scenarios via the Playwright MCP server.

## Acceptance Criteria

1. **AC1 — Sort survives row edit.** (R5)
   **Given** a multi-column sort is active on the Universe screen,
   **When** Dave edits a row value,
   **Then** the sort state is unchanged after the edit completes and the table re-renders.

2. **AC2 — Sort survives row add.** (R5)
   **Given** a multi-column sort is active,
   **When** Dave adds a new symbol row,
   **Then** the sort state is preserved and the new row appears in the correct sorted position.

3. **AC3 — Sort survives row delete.** (R5)
   **Given** a multi-column sort is active,
   **When** Dave deletes a row,
   **Then** the remaining rows stay sorted in the prior order.

4. **AC4 — Sort survives account filter change.** (R5)
   **Given** a multi-column sort is active,
   **When** Dave changes the account filter,
   **Then** the sort state is preserved and the filtered rows appear in the correct sorted order.

5. **AC5 — Sort survives navigation away and back.** (R5)
   **Given** a multi-column sort is active,
   **When** Dave navigates to another screen and then back to the Universe screen,
   **Then** the sort state is restored to what it was before navigation.

6. **AC6 — Sort survives page reload.** (R5)
   **Given** a multi-column sort is active,
   **When** Dave reloads the page,
   **Then** the sort state is restored from persistent storage.

7. **AC7 — Sort indicators are visually correct at all times.** (R6)
   **Given** a sort state is active after any of the above interactions,
   **When** the column headers are inspected,
   **Then** the sort indicator icons correctly reflect the active sort column(s) and direction(s).

8. **AC8 — Quality gate.**
   **Given** `pnpm all` runs,
   **Then** all tests pass.

## Tasks / Subtasks

- [ ] **Task 1 — Re-read Story 113.1 design (gate)** (AC: #1–#7)
  - [ ] Open [_bmad-output/implementation-artifacts/113-1-investigate-universe-sort-vanishing.md](./113-1-investigate-universe-sort-vanishing.md) and quote the fix strategy at the top of this story's Dev Agent Record before touching any code.

- [ ] **Task 2 — Implement the fix** (AC: #1–#6)
  - [ ] Apply the fix described in Story 113.1 Dev Notes to prevent the spurious sort state reset on the triggering interaction(s).
  - [ ] If the persistence write-timing is the root cause (write occurs before the reset), adjust the write to occur after the triggering interaction completes (e.g. in an effect that reacts to the post-reset state, or by flushing persistence before the reinit happens).
  - [ ] If the read-on-init path does not restore the saved sort state after a SmartSignals context rebuild, add a restore call in the appropriate lifecycle hook / effect.
  - [ ] Verify the sort indicator binding (R6) is derived from the same signal that is being persisted, so indicators and state are always in sync.

- [ ] **Task 3 — Verify all six scenarios via Playwright MCP** (AC: #1–#7)
  - [ ] Apply a multi-column sort to the Universe screen.
  - [ ] Perform (a) row edit — verify sort state and indicators survive.
  - [ ] Perform (b) row add — verify.
  - [ ] Perform (c) row delete — verify.
  - [ ] Perform (d) account filter change — verify.
  - [ ] Perform (e) navigate away and back — verify.
  - [ ] Perform (f) page reload — verify.
  - [ ] Record each result in Dev Notes.

- [ ] **Task 4 — Confirm no regression to other screens** (NFR7)
  - [ ] Open Open Positions and Sold Positions screens. Apply a sort. Confirm sort behaviour is unchanged.
  - [ ] Confirm no other screen's sort state is affected.

- [ ] **Task 5 — Quality gate** (AC: #8)
  - [ ] Run `pnpm all` and confirm all tests pass.
