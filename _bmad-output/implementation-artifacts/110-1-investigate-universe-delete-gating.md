# Story 110.1: Investigate Current Delete-Button Logic and Choose Gating Strategy

Status: Approved

**Story Key:** `110-1-investigate-universe-delete-gating`
**Epic:** 110 — Restrict Universe Delete Button to Truly Unused Symbols Under "All Accounts" Filter Only
**Source:** [_bmad-output/planning-artifacts/epics-2026-05-23.md](../planning-artifacts/epics-2026-05-23.md) (Story 110.1)
**Type:** Investigation
**Depends on:** none
**Enables:** Story 110.2, Story 110.3

## Story

As a developer,
I want to trace the current Universe delete-button visibility logic (client-side condition, server-side data source) and choose how the new gating will be implemented,
So that Story 110.2 applies the correct condition in the right layer.

## Epic Context

**Epic 110 Goal:** Today the Universe row delete button shows whenever the symbol has no open positions under the *current* account filter — too aggressive: a symbol used in another account's trades or in any account's `divDeposits` would be wrongly deletable. The button must only appear when (a) the active account filter is **All Accounts**, and (b) the symbol has **zero** rows in `trades` and **zero** rows in `divDeposits` across all accounts. Under any specific-account filter, no delete button is shown.

This story (110.1) is the **investigation/diagnosis** story — locate the current visibility expression, identify the active-account-filter source, and choose whether the new "deletable" signal is derived server-side (preferred, per the epic's architecture notes) or client-side. **No production code is modified.**

## Acceptance Criteria

1. **AC1 — Current delete-button visibility logic located and cited.**
   **Given** the Universe row component,
   **When** the developer locates the delete-button visibility expression,
   **Then** Dev Notes record (a) the source file and template snippet (including line
   numbers), (b) the data the expression depends on today (e.g. open-position count
   for the current account).

2. **AC2 — Gating strategy chosen (server-derived flag preferred).**
   **Given** the requirement "zero `trades` rows AND zero `divDeposits` rows across
   all accounts",
   **When** the developer chooses where this is computed,
   **Then** Dev Notes specify whether the Universe row DTO will gain a
   server-derived `deletable: boolean` (preferred) or the client will issue separate
   count queries, **and** justify on (a) N+1 avoidance, (b) consistency with the
   server's existing aggregations (it already includes `trades`), (c) simpler client
   logic.

3. **AC3 — Active-account-filter source identified.**
   **Given** the requirement to only show the button under the **All Accounts**
   filter,
   **When** the developer identifies how the active account filter is exposed to
   the Universe row component,
   **Then** Dev Notes cite the signal / selector / input that the component will
   check (file + line) and document the exact value/shape that represents
   "All Accounts" (e.g. `null`, empty string, or a sentinel).

4. **AC4 — No production code changes; quality gate passes.**
   **Given** the investigation is complete,
   **When** `pnpm all` runs,
   **Then** all tests pass.

## Tasks / Subtasks

- [ ] **Task 1 — Locate the delete-button visibility expression** (AC: #1)
  - [ ] Read
        [apps/dms-material/src/app/global/global-universe/global-universe.component.html](../../apps/dms-material/src/app/global/global-universe/global-universe.component.html)
        around lines 302–311 (the `@if (shouldShowDeleteButton(row))` block with the
        `data-testid="'delete-symbol-' + i"` button).
  - [ ] Read the matching method `shouldShowDeleteButton(row: Universe)` in
        [apps/dms-material/src/app/global/global-universe/global-universe.component.ts](../../apps/dms-material/src/app/global/global-universe/global-universe.component.ts)
        line ~288 (current implementation: `!row.is_closed_end_fund && row.position === 0`).
  - [ ] Note the dependence on `row.position` (computed per current account filter
        on the server) and `row.is_closed_end_fund` — i.e. **today's logic is local
        to the current account view**, which is exactly the bug Epic 110 fixes.

- [ ] **Task 2 — Locate the active-account-filter signal** (AC: #3)
  - [ ] Search the Universe component for the account-filter source — likely
        `selectedAccountId$` (referenced near line ~325 of
        `global-universe.component.ts` per `onAccountChange`).
  - [ ] Trace where the signal is set. Document the value that means
        "All Accounts" (commonly `null`, `''`, or a string like `'all'`).
  - [ ] Cite the file + line.

- [ ] **Task 3 — Locate every reference to `divDeposits` & `trades` aggregations**
      (AC: #2)
  - [ ] Inspect the Universe server route
        [apps/server/src/app/routes/universe/get-all-universes/index.ts](../../apps/server/src/app/routes/universe/get-all-universes/index.ts)
        and confirm it already `include`s `trades` per row (it does — used by
        `mapUniverseToResponse` to compute `position`).
  - [ ] Determine whether `divDeposits` is currently included on the universe
        row. If not, document that Story 110.2 will need to extend the Prisma
        query with `divDeposits: { select: { id: true }, take: 1 }` (or a `_count`
        aggregation) to derive `deletable`.
  - [ ] Confirm `prisma/schema.prisma` shows the relations
        (`model universe { divDeposits divDeposits[] trades trades[] … }` — see
        line 25 area).

- [ ] **Task 4 — Choose the gating strategy** (AC: #2)
  - [ ] Recommend **Option A (preferred): server-derived `deletable: boolean` on
        each Universe row DTO**. The flag is computed in the same Prisma query
        that already loads `trades`. For `divDeposits`, add a minimal
        existence-check `select`/`_count` (avoids fetching rows). The client
        renders the delete button when (active filter == All Accounts) AND
        `row.deletable === true`.
  - [ ] Alternative (Option B): two client-side count queries per row. **Reject**
        — N+1, race conditions, more complex client.
  - [ ] Document the chosen approach plus the exact server contract change
        (`deletable` added to the Universe row interface) and the exact client
        condition.

- [ ] **Task 5 — Quality gate** (AC: #4)
  - [ ] Confirm `git status` shows no production source file changes.
  - [ ] Run `pnpm all` and record result.

## Dev Notes

### Architecture & Code Pointers

- **Delete-button template:**
  [apps/dms-material/src/app/global/global-universe/global-universe.component.html](../../apps/dms-material/src/app/global/global-universe/global-universe.component.html)
  lines 302–311. Already exposes `data-testid="'delete-symbol-' + i"` for
  Playwright assertions.
- **Visibility method:**
  [apps/dms-material/src/app/global/global-universe/global-universe.component.ts](../../apps/dms-material/src/app/global/global-universe/global-universe.component.ts)
  line ~288: `shouldShowDeleteButton(row: Universe): boolean { return !row.is_closed_end_fund && row.position === 0; }`
  — this is the predicate Story 110.2 will rewrite.
- **Account-change handler:** same file, `onAccountChange(value: string)` near
  line ~325 — calls `this.selectedAccountId$.set(value)`. Find where the signal
  is declared and how "All Accounts" is represented.
- **Universe server route:**
  [apps/server/src/app/routes/universe/get-all-universes/index.ts](../../apps/server/src/app/routes/universe/get-all-universes/index.ts)
  already includes `trades`. To add `deletable`, also need a minimal
  `divDeposits` aggregation per row.
- **Universe DTO:**
  [apps/server/src/app/routes/universe/universe.interface.ts](../../apps/server/src/app/routes/universe/universe.interface.ts).
  Story 110.2 will add `deletable: boolean`.
- **Prisma schema:** [prisma/schema.prisma](../../prisma/schema.prisma):
  `model universe` line 25 — has relations `trades trades[]` and
  `divDeposits divDeposits[]`. Both are indexed for `accountId`/`sell_date`/`date`.

### Recommended Strategy (Server-Derived `deletable`)

Server contract addition:

```ts
// universe.interface.ts
export interface Universe {
  // … existing fields …
  /**
   * True iff this symbol has zero rows in `trades` AND zero rows in `divDeposits`
   * across all accounts. The client uses this together with the
   * "All Accounts" filter to decide whether to render the row delete button.
   */
  deletable: boolean;
}
```

Server computation in the existing Prisma call (or a follow-up small query):

```ts
// In get-all-universes/index.ts query, extend include:
include: {
  trades: { /* existing */ },
  _count: { select: { divDeposits: true } },
}
// then per row:
const deletable = row.trades.length === 0 && row._count.divDeposits === 0;
```

Client change:

```ts
shouldShowDeleteButton(row: Universe): boolean {
  return this.isAllAccountsFilter() && row.deletable;
}
```

Plus a computed `isAllAccountsFilter()` reading the existing account-filter
signal.

### Testing Standards

- **No new tests in this story.** Story 110.3 owns unit + E2E tests.
- `pnpm all` must pass as a no-op gate.

### Project Structure Notes

- Universe client code:
  [apps/dms-material/src/app/global/global-universe/](../../apps/dms-material/src/app/global/global-universe/).
- Universe server code:
  [apps/server/src/app/routes/universe/](../../apps/server/src/app/routes/universe/).
- Project conventions per
  [_bmad-output/project-context.md](../project-context.md).

### References

- Epic source: [_bmad-output/planning-artifacts/epics-2026-05-23.md](../planning-artifacts/epics-2026-05-23.md) — Story 110.1 section
- Universe template: [apps/dms-material/src/app/global/global-universe/global-universe.component.html](../../apps/dms-material/src/app/global/global-universe/global-universe.component.html)
- Universe component: [apps/dms-material/src/app/global/global-universe/global-universe.component.ts](../../apps/dms-material/src/app/global/global-universe/global-universe.component.ts)
- Universe server route: [apps/server/src/app/routes/universe/get-all-universes/index.ts](../../apps/server/src/app/routes/universe/get-all-universes/index.ts)
- Universe DTO: [apps/server/src/app/routes/universe/universe.interface.ts](../../apps/server/src/app/routes/universe/universe.interface.ts)
- Prisma schema: [prisma/schema.prisma](../../prisma/schema.prisma)

## Definition of Done

- [ ] Current delete-button visibility logic traced and cited in Dev Notes
- [ ] Server-derived `deletable` flag chosen (or client-side counts chosen) with rationale
- [ ] Active-account-filter source cited
- [ ] No production code changed; `pnpm all` passes

## Dev Agent Record

### Agent Model Used

_To be filled by dev agent._

### Debug Log References

_To be filled by dev agent._

### Completion Notes List

_To be filled by dev agent._

### File List

_To be filled by dev agent._
