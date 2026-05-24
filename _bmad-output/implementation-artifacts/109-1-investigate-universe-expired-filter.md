# Story 109.1: Investigate Universe Endpoint and Define Expired-No-Open Filter

Status: Approved

**Story Key:** `109-1-investigate-universe-expired-filter`
**Epic:** 109 — Filter Expired Symbols With No Open Positions from Universe Screen
**Source:** [_bmad-output/planning-artifacts/epics-2026-05-23.md](../planning-artifacts/epics-2026-05-23.md) (Story 109.1)
**Type:** Investigation (code-only audit; no production code or tests changed)
**Depends on:** none
**Enables:** Story 109.2, Story 109.3

## Story

As a developer,
I want to trace the Universe screen's server endpoint, confirm where row assembly happens, and define exactly how "expired with no open positions" is computed on the server,
So that Story 109.2 applies the filter at the right layer with the correct predicate.

## Epic Context

**Epic 109 Goal:** Expired symbols with no open position are noise on the Universe screen — Dave cannot trade them and they crowd out actionable rows. The server-side Universe endpoint must drop them before the client receives the response. Expired symbols that still have an open position remain visible. Non-expired symbols are unaffected.

This story (109.1) is the **investigation/diagnosis** story. It locates the route, identifies the canonical predicates, picks a filter strategy, and writes the recommendation. **No production code is modified.**

## Acceptance Criteria

1. **AC1 — Universe endpoint traced end-to-end.**
   **Given** the current Universe screen,
   **When** the developer traces a Universe page load from the Angular client through the Fastify route to the Prisma query,
   **Then** Dev Notes record (a) the route handler file and function, (b) the Prisma query (or queries) that assemble Universe rows, (c) the shape of the returned row DTO.

2. **AC2 — Expired and open-position predicates identified.**
   **Given** the project's existing schema and conventions,
   **When** the developer identifies the "expired" predicate and the "open position" predicate,
   **Then** Dev Notes record:
   - which symbol field encodes expiration and the exact comparison ("expiration date is strictly in the past relative to server `now()`");
   - the existing canonical "open trade" predicate already used elsewhere, with file + line citation (do NOT re-invent it);
   - confirmation that "no open positions" means **zero** matching `trades` rows whose open-trade predicate evaluates true for that symbol across all accounts.

3. **AC3 — Filter strategy chosen with rationale.**
   **Given** the chosen filter strategy,
   **When** the developer drafts the implementation approach,
   **Then** Dev Notes describe whether the filter will be a single Prisma query (`WHERE` clause with a correlated subquery / aggregation) or a post-query filter in the route handler, **and** justify the choice on (a) correctness, (b) query plan / N+1 risk, (c) consistency with existing Universe code.

4. **AC4 — No production code changes; quality gate passes.**
   **Given** the investigation is complete,
   **When** `pnpm all` runs,
   **Then** all tests pass (no production code is modified in this story; any temporary instrumentation is reverted before commit).

## Tasks / Subtasks

- [ ] **Task 1 — Trace Universe page load end-to-end** (AC: #1)
  - [ ] Locate the Angular Universe component and its data service:
        [apps/dms-material/src/app/global/global-universe/global-universe.component.ts](../../apps/dms-material/src/app/global/global-universe/global-universe.component.ts)
        and surrounding files. Note the HTTP call (URL, method, query string).
  - [ ] Locate the Fastify route registration:
        [apps/server/src/app/routes/universe/get-all-universes/index.ts](../../apps/server/src/app/routes/universe/get-all-universes/index.ts).
        Note the route path, method, and handler function.
  - [ ] Walk the handler and record (a) the Prisma query call(s), (b) the `include`/`select`
        shape, (c) any post-query mapping (cite
        [apps/server/src/app/routes/universe/universe-helpers.ts](../../apps/server/src/app/routes/universe/universe-helpers.ts)
        functions used).
  - [ ] Record the returned row DTO shape (cite
        [apps/server/src/app/routes/universe/universe.interface.ts](../../apps/server/src/app/routes/universe/universe.interface.ts)).

- [ ] **Task 2 — Identify the expired predicate** (AC: #2)
  - [ ] Inspect [prisma/schema.prisma](../../prisma/schema.prisma) `model universe`
        lines 25–50 and note both relevant fields: the boolean `expired` flag and the
        `ex_date DateTime?` field.
  - [ ] Decide and document whether the predicate uses (a) the persisted `expired`
        boolean column or (b) a real-time comparison `ex_date < now()`. Justify based
        on (i) which value the existing handler already mapper uses (see
        `mapUniverseToResponse` in [universe/index.ts](../../apps/server/src/app/routes/universe/index.ts)
        line ~36 and the `expired` field on `UniverseWithTrades`), (ii) whether `expired`
        is recomputed on read or written once and may go stale.
  - [ ] If `expired` is authoritative (already kept in sync), prefer it (simpler WHERE
        clause). If not, prefer `ex_date < server now()` — document the precise SQL/Prisma
        shape in either case.

- [ ] **Task 3 — Cite the canonical open-trade predicate** (AC: #2)
  - [ ] Locate `getOpenTrades` in
        [apps/server/src/app/routes/universe/universe-helpers.ts](../../apps/server/src/app/routes/universe/universe-helpers.ts)
        (lines 7–11). Confirm the predicate is `sell_date === null`.
  - [ ] Confirm by searching for any other open-position predicate in the codebase
        (`apps/server/src/app/routes/trades/get-open-trades`,
        `apps/server/src/app/routes/positions`, etc.). If multiple variants exist,
        cite each and choose the canonical one to reuse.
  - [ ] Document the exact Prisma shape that expresses "this universe row has at
        least one open trade" — e.g. `trades: { some: { sell_date: null, deletedAt: null } }`
        — paying attention to soft-delete (`deletedAt`) conventions used elsewhere.

- [ ] **Task 4 — Choose the filter strategy** (AC: #3)
  - [ ] Compare Option A (single Prisma `WHERE` clause that excludes rows where
        `expired = true AND NOT (trades has any open)`) vs. Option B (post-query
        filter on the already-fetched row list).
  - [ ] Option A is preferred for correctness (zero N+1 risk, server never sends the
        rows) and aligns with the existing handler which already loads `trades` via
        `include`. Option B is acceptable if the existing handler maps over trades to
        derive `position` and the boolean is already on the row.
  - [ ] Write the chosen approach with one paragraph of justification and the exact
        Prisma fragment (`where: { NOT: { AND: [{ expired: true }, { trades: { none: { sell_date: null } } }] } }`
        or equivalent) that Story 109.2 will use.

- [ ] **Task 5 — Quality gate** (AC: #4)
  - [ ] Confirm `git status` shows no production source file changes (only this story
        file's Dev Notes were updated).
  - [ ] Run `pnpm all` and record the result in Dev Notes.

## Dev Notes

### Architecture & Code Pointers

- **Server route entry:** [apps/server/src/app/routes/universe/index.ts](../../apps/server/src/app/routes/universe/index.ts)
  registers child routes including `get-all-universes`.
- **List handler:** [apps/server/src/app/routes/universe/get-all-universes/index.ts](../../apps/server/src/app/routes/universe/get-all-universes/index.ts)
  is the route that returns rows to the Universe screen. Existing code already
  includes the `trades` relation per row — i.e. open/closed information is already
  available at row-assembly time.
- **Helpers:** [apps/server/src/app/routes/universe/universe-helpers.ts](../../apps/server/src/app/routes/universe/universe-helpers.ts)
  exports `getOpenTrades` (line ~7) — the canonical open-trade predicate.
- **Row DTO:** [apps/server/src/app/routes/universe/universe.interface.ts](../../apps/server/src/app/routes/universe/universe.interface.ts).
  Includes `expired: boolean` and `position: number`.
- **Schema:** [prisma/schema.prisma](../../prisma/schema.prisma) `model universe`
  (line 25) — `expired Boolean @default(false)`, `ex_date DateTime?`,
  `@@index([expired])` already exists, so a `WHERE expired = true` clause is
  cheap. `model trades` (line 63) — `sell_date DateTime?` is the open/closed marker
  (`null` = open).
- **Client consumer:** [apps/dms-material/src/app/global/global-universe/global-universe.component.ts](../../apps/dms-material/src/app/global/global-universe/global-universe.component.ts).
  Read-only context for this story — the client should require **no** changes once
  the server filter is in place (R1 says "filtered out server-side before being
  sent to the client").

### Strong-Candidate Hypothesis (verify, do not assume)

The simplest correct shape is a single Prisma `WHERE` clause on the existing
`get-all-universes` query:

```ts
where: {
  deletedAt: null,
  NOT: {
    AND: [
      { expired: true },
      { trades: { none: { sell_date: null } } },
    ],
  },
}
```

Justification:

- The `universe.expired` boolean is already indexed (`@@index([expired])` in the
  schema).
- `trades.sell_date` is indexed (`@@index([sell_date])`).
- The existing handler already includes `trades`, so this does not change the
  shape of the returned data — only the filter set.
- The post-query mapping in `mapUniverseToResponse` (universe/index.ts line ~36)
  already derives `position` and `expired` via `universeHelpers`, so the client
  contract is unchanged.

Verify whether `expired` is authoritatively kept in sync at write time vs. being
stale data that should be recomputed; if the latter, switch the WHERE predicate
to compare `ex_date < now()` (less efficient — no exact index — but correct).

### Testing Standards

- **No new tests in this story** — Story 109.3 owns the unit + E2E tests. This
  story only reads code; no production source files or test files are modified.
- `pnpm all` must pass at the end as a no-op gate (proves nothing was inadvertently
  modified).

### Project Structure Notes

- Universe server code: [apps/server/src/app/routes/universe/](../../apps/server/src/app/routes/universe/).
- Universe client code: [apps/dms-material/src/app/global/global-universe/](../../apps/dms-material/src/app/global/global-universe/).
- Prisma schema: [prisma/schema.prisma](../../prisma/schema.prisma).
- Project conventions per [_bmad-output/project-context.md](../project-context.md).

### References

- Epic source: [_bmad-output/planning-artifacts/epics-2026-05-23.md](../planning-artifacts/epics-2026-05-23.md) — Story 109.1 section
- Project context: [_bmad-output/project-context.md](../project-context.md)
- Universe list route: [apps/server/src/app/routes/universe/get-all-universes/index.ts](../../apps/server/src/app/routes/universe/get-all-universes/index.ts)
- Universe route registration: [apps/server/src/app/routes/universe/index.ts](../../apps/server/src/app/routes/universe/index.ts)
- Universe helpers (`getOpenTrades`): [apps/server/src/app/routes/universe/universe-helpers.ts](../../apps/server/src/app/routes/universe/universe-helpers.ts)
- Universe row DTO: [apps/server/src/app/routes/universe/universe.interface.ts](../../apps/server/src/app/routes/universe/universe.interface.ts)
- Prisma schema: [prisma/schema.prisma](../../prisma/schema.prisma)
- Universe component: [apps/dms-material/src/app/global/global-universe/global-universe.component.ts](../../apps/dms-material/src/app/global/global-universe/global-universe.component.ts)

## Definition of Done

- [ ] Universe endpoint traced end-to-end in Dev Notes
- [ ] Expired predicate defined and source field cited
- [ ] Open-position predicate cited from existing code (not re-invented)
- [ ] Filter approach (Prisma query vs post-query) chosen with rationale
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
