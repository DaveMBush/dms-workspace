# Story 110.2: Implement New Delete-Button Gating

Status: Approved

**Story Key:** `110-2-implement-universe-delete-gating`
**Epic:** 110 — Restrict Universe Delete Button to Truly Unused Symbols Under "All Accounts" Filter Only
**Source:** [_bmad-output/planning-artifacts/epics-2026-05-23.md](../planning-artifacts/epics-2026-05-23.md) (Story 110.2)
**Type:** Implementation
**Depends on:** Story 110.1
**Enables:** Story 110.3
**Requirements covered:** R4, R5, R6

## Story

As Dave,
I want the Universe delete button to appear only when I'm viewing **All Accounts** and the symbol is referenced in neither `trades` nor `divDeposits` anywhere,
So that I cannot accidentally delete a symbol still in use by another account.

## Epic Context

Universe rows currently expose a delete button whenever the symbol has no open positions **under the current account filter** — wrong: a symbol used by another account's trades or by any account's dividend deposits would be wrongly offered for deletion. Story 110.1 chose the gating strategy (server-derived `deletable` per row, preferred); this story implements it end-to-end.

## Acceptance Criteria

1. **AC1 — Under any specific-account filter, no delete button is rendered.** (R4)
   **Given** the active account filter is set to a specific account,
   **When** the Universe screen renders,
   **Then** no delete button is rendered on any row.

2. **AC2 — Under All Accounts, button appears only on rows with zero usage.** (R5)
   **Given** the active account filter is **All Accounts**,
   **When** the Universe screen renders,
   **Then** the delete button is rendered only on rows whose symbol has **zero**
   `trades` rows and **zero** `divDeposits` rows across all accounts; rows whose
   symbol is referenced in either table do not render a delete button.

3. **AC3 — Existing delete flow unchanged.** (R6)
   **Given** the delete button is shown and clicked,
   **When** Dave confirms the delete,
   **Then** the existing delete behaviour (confirmation, server call, optimistic
   /refetch update, error handling) continues to work exactly as before.

4. **AC4 — Playwright MCP verification of both filter modes.**
   **Given** the change is implemented per Story 110.1,
   **When** the Universe screen is exercised via the Playwright MCP server under
   each filter mode (All Accounts, then at least one specific account),
   **Then** the button visibility matches the rules above on every row.

5. **AC5 — No regression to non-Universe screens.** (NFR6)
   **Given** other screens (Open Positions, Sold Positions, Dividend Deposits,
   Screener) are exercised,
   **Then** none of their behaviour changes.

6. **AC6 — Quality gate.**
   **Given** `pnpm all` runs,
   **Then** all tests pass.

## Tasks / Subtasks

- [ ] **Task 1 — Re-read Story 110.1 (gate)** (AC: #1, #2)
  - [ ] Open
        [_bmad-output/implementation-artifacts/110-1-investigate-universe-delete-gating.md](./110-1-investigate-universe-delete-gating.md)
        and quote (a) the chosen strategy (server-derived `deletable` vs.
        client-side counts), (b) the active-account-filter signal and its
        "All Accounts" representation.

- [ ] **Task 2 — Add `deletable` to the server Universe row DTO** (AC: #2)
  - [ ] Extend
        [apps/server/src/app/routes/universe/universe.interface.ts](../../apps/server/src/app/routes/universe/universe.interface.ts)
        with `deletable: boolean`.
  - [ ] Update
        [apps/server/src/app/routes/universe/get-all-universes/index.ts](../../apps/server/src/app/routes/universe/get-all-universes/index.ts)
        to extend the Prisma query with a `divDeposits` existence check
        (e.g. `_count: { select: { divDeposits: true } }` or
        `divDeposits: { select: { id: true }, take: 1 }`). The existing
        `trades` include already provides the trade count.
  - [ ] Compute `deletable = (trades.length === 0) && (divDepositsCount === 0)`
        in the row mapper. Do **not** restrict `trades` to a specific
        `accountId` — the check is across all accounts.
  - [ ] If `mapUniverseToResponse` in
        [apps/server/src/app/routes/universe/index.ts](../../apps/server/src/app/routes/universe/index.ts)
        (line ~36) is the shared mapper, add `deletable` there. If the
        `get-all-universes` route maps separately, add it there.

- [ ] **Task 3 — Add the matching client field** (AC: #2)
  - [ ] Extend the client `Universe` interface (whatever the equivalent type in
        [apps/dms-material/src/app/store/universe/](../../apps/dms-material/src/app/store/universe/)
        or the global-universe component imports — search for the existing
        type used by `shouldShowDeleteButton(row: Universe)`).
  - [ ] Add `deletable: boolean`. Make non-optional so the API contract is
        enforced by the type system.

- [ ] **Task 4 — Update `shouldShowDeleteButton`** (AC: #1, #2)
  - [ ] In
        [apps/dms-material/src/app/global/global-universe/global-universe.component.ts](../../apps/dms-material/src/app/global/global-universe/global-universe.component.ts)
        replace the line ~288 method:
        ```ts
        shouldShowDeleteButton(row: Universe): boolean {
          return this.isAllAccountsFilter() && row.deletable;
        }
        ```
  - [ ] Add a `computed`/method `isAllAccountsFilter()` that reads the existing
        account-filter signal (per Story 110.1, value documented). Use signal-based
        reactivity per project conventions (signal-first, OnPush, no zone).
  - [ ] **Do not change** `deleteUniverse(row)` (line ~292) — R6 requires the
        existing delete flow to keep working unchanged.
  - [ ] Remove (or note as preserved) the `!row.is_closed_end_fund` clause if
        Story 110.1's strategy supersedes it. If the team wants to keep
        closed-end funds always undeletable, fold that into the server-side
        `deletable` derivation (`deletable = !is_closed_end_fund && trades==0 && divDeposits==0`)
        and document the choice in Dev Notes.

- [ ] **Task 5 — Verify with Playwright MCP** (AC: #4)
  - [ ] Seed the database with rows covering: (a) specific-account filter (any
        row); (b) All Accounts + symbol used in trades (button hidden);
        (c) All Accounts + symbol used in divDeposits (button hidden); (d) All
        Accounts + symbol used in neither (button visible).
  - [ ] Drive the Universe screen via the Playwright MCP server in both filter
        modes. Capture snapshots showing button presence/absence matches the
        rules. Paste summary into Dev Notes.

- [ ] **Task 6 — Regression sweep** (AC: #5)
  - [ ] Visit Open Positions, Sold Positions, Dividend Deposits, Screener via
        Playwright MCP. Confirm no visible change in behaviour.

- [ ] **Task 7 — Quality gate** (AC: #6)
  - [ ] Run `pnpm all`. Record result.

## Dev Notes

### Architecture & Code Pointers

- **Visibility method to replace:**
  [apps/dms-material/src/app/global/global-universe/global-universe.component.ts](../../apps/dms-material/src/app/global/global-universe/global-universe.component.ts)
  line ~288.
- **Template:**
  [apps/dms-material/src/app/global/global-universe/global-universe.component.html](../../apps/dms-material/src/app/global/global-universe/global-universe.component.html)
  lines 302–311 — `@if (shouldShowDeleteButton(row))` block; no template changes
  needed (template already calls `shouldShowDeleteButton`).
- **Server DTO:**
  [apps/server/src/app/routes/universe/universe.interface.ts](../../apps/server/src/app/routes/universe/universe.interface.ts)
  — add `deletable: boolean`.
- **Server mapper:**
  [apps/server/src/app/routes/universe/index.ts](../../apps/server/src/app/routes/universe/index.ts)
  `mapUniverseToResponse` line ~36 — add `deletable: …` to the returned object.
- **Server query:**
  [apps/server/src/app/routes/universe/get-all-universes/index.ts](../../apps/server/src/app/routes/universe/get-all-universes/index.ts)
  — extend the Prisma `include` to count `divDeposits` cheaply.
- **Prisma relations:** [prisma/schema.prisma](../../prisma/schema.prisma)
  line 25 `model universe` — has `trades trades[]` and `divDeposits divDeposits[]`.
  No schema migration needed.
- **Client store:** [apps/dms-material/src/app/store/universe/](../../apps/dms-material/src/app/store/universe/)
  — extend whatever Universe interface the SmartNgRX entity uses to include
  `deletable`.

### Constraints

- **Cross-all-accounts check.** `trades` and `divDeposits` counts MUST be
  unfiltered by `accountId` (Epic 110's whole point).
- **Soft delete.** If the codebase respects `deletedAt`, exclude
  soft-deleted rows from the counts (`trades: { where: { deletedAt: null } }`,
  `divDeposits: { where: { deletedAt: null } }`).
- **R6 — preserve delete flow.** Only the visibility predicate changes;
  `deleteUniverse(row)` and `findAndDeleteUniverseRow(...)` are unchanged.
- **Signal-first.** Use computed signals for `isAllAccountsFilter` to maintain
  OnPush + zoneless reactivity.

### Testing Standards

- This story does not add new tests (110.3 owns the new tests). Existing tests
  must continue to pass.
- `pnpm all` is the quality gate.
- Playwright MCP verification is manual here; automated E2E lives in 110.3.

### Project Structure Notes

- Universe client: [apps/dms-material/src/app/global/global-universe/](../../apps/dms-material/src/app/global/global-universe/).
- Universe server: [apps/server/src/app/routes/universe/](../../apps/server/src/app/routes/universe/).
- Universe store: [apps/dms-material/src/app/store/universe/](../../apps/dms-material/src/app/store/universe/).
- Project conventions per [_bmad-output/project-context.md](../project-context.md).

### References

- Epic source: [_bmad-output/planning-artifacts/epics-2026-05-23.md](../planning-artifacts/epics-2026-05-23.md) — Story 110.2 section
- Story 110.1 diagnosis: [110-1-investigate-universe-delete-gating.md](./110-1-investigate-universe-delete-gating.md)
- Universe component (line 288): [apps/dms-material/src/app/global/global-universe/global-universe.component.ts](../../apps/dms-material/src/app/global/global-universe/global-universe.component.ts)
- Universe template (lines 302–311): [apps/dms-material/src/app/global/global-universe/global-universe.component.html](../../apps/dms-material/src/app/global/global-universe/global-universe.component.html)
- Universe server route: [apps/server/src/app/routes/universe/get-all-universes/index.ts](../../apps/server/src/app/routes/universe/get-all-universes/index.ts)
- Universe row DTO: [apps/server/src/app/routes/universe/universe.interface.ts](../../apps/server/src/app/routes/universe/universe.interface.ts)

## Definition of Done

- [ ] No delete button under any specific-account filter (R4)
- [ ] Delete button only on truly-unused symbols under All Accounts (R5)
- [ ] Existing delete flow unchanged (R6)
- [ ] Playwright MCP verifies both filter modes
- [ ] No regression to other screens
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
