# Story 110.1: Investigate Current Delete-Button Logic and Choose Gating Strategy

Status: Done

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

- [x] **Task 1 — Locate the delete-button visibility expression** (AC: #1)
  - [x] Read
        [apps/dms-material/src/app/global/global-universe/global-universe.component.html](../../apps/dms-material/src/app/global/global-universe/global-universe.component.html)
        around lines 302–311 (the `@if (shouldShowDeleteButton(row))` block with the
        `data-testid="'delete-symbol-' + i"` button).
  - [x] Read the matching method `shouldShowDeleteButton(row: Universe)` in
        [apps/dms-material/src/app/global/global-universe/global-universe.component.ts](../../apps/dms-material/src/app/global/global-universe/global-universe.component.ts)
        line ~288 (current implementation: `!row.is_closed_end_fund && row.position === 0`).
  - [x] Note the dependence on `row.position` (computed per current account filter
        on the server) and `row.is_closed_end_fund` — i.e. **today's logic is local
        to the current account view**, which is exactly the bug Epic 110 fixes.

- [x] **Task 2 — Locate the active-account-filter signal** (AC: #3)
  - [x] Search the Universe component for the account-filter source — likely
        `selectedAccountId$` (referenced near line ~325 of
        `global-universe.component.ts` per `onAccountChange`).
  - [x] Trace where the signal is set. Document the value that means
        "All Accounts" (commonly `null`, `''`, or a string like `'all'`).
  - [x] Cite the file + line.

- [x] **Task 3 — Locate every reference to `divDeposits` & `trades` aggregations**
      (AC: #2)
  - [x] Inspect the Universe server route
        [apps/server/src/app/routes/universe/get-all-universes/index.ts](../../apps/server/src/app/routes/universe/get-all-universes/index.ts)
        and confirm it already `include`s `trades` per row (it does — used by
        `mapUniverseToResponse` to compute `position`).
  - [x] Determine whether `divDeposits` is currently included on the universe
        row. If not, document that Story 110.2 will need to extend the Prisma
        query with `divDeposits: { select: { id: true }, take: 1 }` (or a `_count`
        aggregation) to derive `deletable`.
  - [x] Confirm `prisma/schema.prisma` shows the relations
        (`model universe { divDeposits divDeposits[] trades trades[] … }` — see
        line 25 area).

- [x] **Task 4 — Choose the gating strategy** (AC: #2)
  - [x] Recommend **Option A (preferred): server-derived `deletable: boolean` on
        each Universe row DTO**. The flag is computed in the same Prisma query
        that already loads `trades`. For `divDeposits`, add a minimal
        existence-check `select`/`_count` (avoids fetching rows). The client
        renders the delete button when (active filter == All Accounts) AND
        `row.deletable === true`.
  - [x] Alternative (Option B): two client-side count queries per row. **Reject**
        — N+1, race conditions, more complex client.
  - [x] Document the chosen approach plus the exact server contract change
        (`deletable` added to the Universe row interface) and the exact client
        condition.

- [x] **Task 5 — Quality gate** (AC: #4)
  - [x] Confirm `git status` shows no production source file changes.
  - [x] Run `pnpm all` and record result.

## Dev Notes

### Architecture & Code Pointers

- **Delete-button template:**
  [apps/dms-material/src/app/global/global-universe/global-universe.component.html](../../apps/dms-material/src/app/global/global-universe/global-universe.component.html)
  **CONFIRMED lines 302–313.** The block is:
  ```html
  } @case ('actions') { @if (shouldShowDeleteButton(row)) {
  <button
    mat-icon-button
    color="warn"
    matTooltip="Delete unused symbol"
    aria-label="Delete unused symbol"
    [attr.data-testid]="'delete-symbol-' + i"
    (click)="deleteUniverse(row)"
  >
    <mat-icon>delete</mat-icon>
  </button>
  } }
  ```
  Already exposes `data-testid="'delete-symbol-' + i"` for Playwright assertions.
- **Visibility method:**
  [apps/dms-material/src/app/global/global-universe/global-universe.component.ts](../../apps/dms-material/src/app/global/global-universe/global-universe.component.ts)
  **CONFIRMED lines 288–290:**
  ```ts
  shouldShowDeleteButton(row: Universe): boolean {
    return !row.is_closed_end_fund && row.position === 0;
  }
  ```
  Depends on `row.position` (server-computed per current account filter) and
  `row.is_closed_end_fund`. Bug: only checks current account's open positions,
  ignores other accounts and `divDeposits`.
- **Account-filter signal:**
  [apps/dms-material/src/app/global/global-universe/global-universe.component.ts](../../apps/dms-material/src/app/global/global-universe/global-universe.component.ts)
  **CONFIRMED line 106:**
  ```ts
  readonly selectedAccountId$ = signal<string>(this.rf.accountId);
  ```
  `onAccountChange(value: string)` at line 328 calls `this.selectedAccountId$.set(value)`.
  **"All Accounts" sentinel = string `'all'`** — confirmed in
  [apps/dms-material/src/app/global/global-universe/restore-universe-filters.function.ts](../../apps/dms-material/src/app/global/global-universe/restore-universe-filters.function.ts)
  lines 18 and 30: `accountId: 'all'` (default) and `accountId: (filters['account_id'] as string) ?? 'all'`.
- **Universe server route:**
  [apps/server/src/app/routes/universe/get-all-universes/index.ts](../../apps/server/src/app/routes/universe/get-all-universes/index.ts)
  **CONFIRMED** Prisma query includes `trades: true` (alongside `risk_group: true`).
  `divDeposits` is **NOT** currently included — Story 110.2 must add it.
  `mapUniverseToResponse` uses `trades` to compute `position` via
  `universeHelpers.calculatePosition(openTrades)`.
- **Universe DTO:**
  [apps/server/src/app/routes/universe/universe.interface.ts](../../apps/server/src/app/routes/universe/universe.interface.ts).
  **CONFIRMED** 16 fields. No `deletable` field yet. Story 110.2 will add `deletable: boolean`.
- **Prisma schema:** [prisma/schema.prisma](../../prisma/schema.prisma):
  **CONFIRMED** `model universe` lines 23–54 — has both `divDeposits divDeposits[]`
  and `trades trades[]` relations.

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

- [x] Current delete-button visibility logic traced and cited in Dev Notes
- [x] Server-derived `deletable` flag chosen (or client-side counts chosen) with rationale
- [x] Active-account-filter source cited
- [x] No production code changed; `pnpm all` passes

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

None — investigation only, no production code changed.

### Completion Notes List

- **Delete button template confirmed:** `global-universe.component.html` line 302 — `@case ('actions') { @if (shouldShowDeleteButton(row)) {` block with `data-testid="'delete-symbol-' + i"` button (lines 302–313).
- **shouldShowDeleteButton confirmed:** `global-universe.component.ts` line 288–290 — `return !row.is_closed_end_fund && row.position === 0;`. Depends on `row.position` (server-computed per current account filter only) — this is the bug.
- **selectedAccountId$ confirmed:** `global-universe.component.ts` line 106 — `signal<string>(this.rf.accountId)`. Sentinel for "All Accounts" = string `'all'` (from `restore-universe-filters.function.ts` lines 18 and 30).
- **Server route trades inclusion confirmed:** `get-all-universes/index.ts` Prisma query has `include: { risk_group: true, trades: true }`. `divDeposits` is NOT currently included.
- **divDeposits NOT in current query:** Story 110.2 must add `_count: { select: { divDeposits: true } }` to derive `deletable`.
- **Prisma schema confirmed:** `model universe` (lines 23–54) has both `divDeposits divDeposits[]` and `trades trades[]` relations.
- **Chosen strategy:** Option A — server-derived `deletable: boolean` flag. Avoids N+1, consistent with existing server aggregations, simpler client logic. Client condition: `this.selectedAccountId$() === 'all' && row.deletable`.
- **pnpm all:** PASS (no production files changed).

### File List

**Files read (investigation only — no production files changed):**

- `apps/dms-material/src/app/global/global-universe/global-universe.component.html`
- `apps/dms-material/src/app/global/global-universe/global-universe.component.ts`
- `apps/dms-material/src/app/global/global-universe/restore-universe-filters.function.ts`
- `apps/server/src/app/routes/universe/get-all-universes/index.ts`
- `apps/server/src/app/routes/universe/universe.interface.ts`
- `prisma/schema.prisma`
- `_bmad-output/implementation-artifacts/110-1-investigate-universe-delete-gating.md` (this file — updated with findings)

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-05-25 | 1.0 | Investigation complete - findings documented | AI Agent |
