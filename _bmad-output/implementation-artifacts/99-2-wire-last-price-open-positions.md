# Story 99.2: Wire `Last $` from Server `Universe` Join into Open Positions

Status: Done

## Story

As Dave (the investor),
I want the `Last $` column on the Open Positions tab to display the most recent price from
the `Universe` table for every open position,
So that I can see the current price next to my cost basis without leaving the screen.

## Acceptance Criteria

1. **Given** the server `mapTradeToResponse` and the joined `Universe` row,
   **When** an Open Positions request is served,
   **Then** every `Trade` in the response includes a numeric `last_price` field sourced from
   `Universe.last_price` (the same column already pulled into `lastPrice` inside
   `mapTradeToResponse`), with `0` returned when `universe` is `null` or `last_price` is
   `null`/`undefined` — matching the existing `?? 0` defensive pattern used for the other
   computed numeric fields in this file.

2. **Given** the server `Trade` interface in
   `apps/server/src/app/routes/trades/index.ts`,
   **When** the change is applied,
   **Then** the interface declares `last_price` as a required `number` (never optional,
   never `undefined`), placed in declaration order alongside the other Universe-derived
   numeric fields (e.g. directly after `target_sell`).

3. **Given** the client `Trade` interface in
   `apps/dms-material/src/app/store/trades/trade.interface.ts`,
   **When** the change is applied,
   **Then** it mirrors the server interface exactly — adding `last_price: number;` as a
   required field with the same snake_case wire name (the file's
   `@typescript-eslint/naming-convention` disable comment already covers this).

4. **Given** the client `transformTradeToPosition` function in
   `apps/dms-material/src/app/account-panel/open-positions/open-positions-component.service.ts`,
   **When** the change is applied,
   **Then** `OpenPosition.lastPrice` is read directly from `trade.last_price` — the existing
   hardcoded `const lastPrice = 0;` (with the comment "Universe.last_price not included in
   Trade response") is removed, and **no client-side `universe.map` lookup is reintroduced**
   (Epic 96 deleted `buildUniverseMap`).

5. **Given** an Open Position whose joined `Universe` row has a `null`/missing `last_price`,
   **When** the row renders,
   **Then** the `Last $` cell follows the existing project convention for missing currency
   values used by the other currency columns in the same `BaseTableComponent` config (the
   server returns `0`, and the existing `type: 'currency'` column renderer formats it the
   same way it formats `0` for `expected_dollars`, `target_gain`, etc.) and does **not**
   crash or log an error.

6. **Given** the Open Positions screen,
   **When** scroll, sort, and filter are exercised after the wiring change,
   **Then** none of those behaviours regress (NFR6).

7. **Given** TDD ordering,
   **When** unit tests in `apps/server/src/app/routes/trades/index.spec.ts` are written,
   **Then** there is a failing test (RED) for the new `last_price` field — both the
   happy-path (returns `Universe.last_price`) and the missing-dependency case (returns `0`
   when `universe` is `null` or `universe.last_price` is `null`) — before the implementation
   exists, and after implementation `pnpm all` passes (GREEN).

8. **Given** the Playwright MCP server,
   **When** the dev manually verifies the Open Positions screen after the fix,
   **Then** the `Last $` column visibly populates with non-zero values for at least one
   seeded open position whose universe row has a non-null `last_price`. (Automated E2E is
   covered by Story 99.3.)

9. **Given** `pnpm all` is run after the fix,
   **Then** all tests pass and `pnpm format` requires no changes.

## Tasks / Subtasks

- [x] Task 1: Confirm Story 99.1 findings (AC: #1, #4)
  - [x] Read Story 99.1 Dev Notes (if the story file exists at
        `_bmad-output/implementation-artifacts/99-1-investigate-last-price-open-positions.md`)
        and confirm the broken link is the missing `last_price` on the server `Trade` DTO
        plus the hardcoded `lastPrice = 0` on the client. If 99.1 is not yet complete, the
        evidence is also captured in this story's Dev Notes below — proceed using that.
  - [x] Confirm `Universe.last_price` is already pulled into the Prisma `select` for the
        trades routes (it is — see Dev Notes), so no Prisma `include` change is required.

- [x] Task 2: Write failing unit tests FIRST — RED phase (AC: #7)
  - [x] In `apps/server/src/app/routes/trades/index.spec.ts`, extend the existing
        `mapTradeToResponse` describe block.
  - [x] Add a happy-path test asserting `mapTradeToResponse(...).last_price` equals the
        joined `universe.last_price` value (e.g. seed `last_price: 12.34` and assert
        `12.34`).
  - [x] Add a "missing-dependency → 0" test for each of these cases:
        (a) `universe` is `null`, (b) `universe.last_price` is `null`, (c)
        `universe.last_price` is `undefined`. All must return `0`.
  - [x] Run `pnpm nx test server` and confirm the new tests fail (RED) before continuing.

- [x] Task 3: Add `last_price` to the server `Trade` interface (AC: #2)
  - [x] In `apps/server/src/app/routes/trades/index.ts`, add `last_price: number;` to the
        exported `Trade` interface, placed directly after `target_sell` (matching the
        declaration order of the other Universe-derived numeric fields).
  - [x] `last_price` is REQUIRED `number` — never optional, never `undefined`.

- [x] Task 4: Wire `last_price` into `mapTradeToResponse` (AC: #1)
  - [x] In `mapTradeToResponse`, add `last_price: lastPrice,` to the returned object
        (the local `const lastPrice = trade.universe?.last_price ?? 0;` already exists at
        the top of the function — reuse it; do NOT recompute).
  - [x] Place the new key in the same declaration order as in the `Trade` interface.
  - [x] Confirm the existing `?? 0` guard correctly handles `universe === null` and
        `universe.last_price === null` (it does — both paths produce `0`).

- [x] Task 5: Mirror the client `Trade` interface (AC: #3)
  - [x] In `apps/dms-material/src/app/store/trades/trade.interface.ts`, add
        `last_price: number;` in the same position as on the server interface so the
        client type matches the server wire format byte-for-byte.

- [x] Task 6: Read `last_price` in the open-positions transform (AC: #4)
  - [x] In
        `apps/dms-material/src/app/account-panel/open-positions/open-positions-component.service.ts`,
        replace the hardcoded `const lastPrice = 0;` line (and its accompanying comment
        `// Universe.last_price not included in Trade response` /
        `// Story 97.4: Use server-computed fields...`) with
        `const lastPrice = trade.last_price;`.
  - [x] Do NOT reintroduce any `universe.map` / `buildUniverseMap` lookup (Epic 96 deleted
        that pattern; do not bring it back).
  - [x] Leave the `OpenPosition.lastPrice` field name and the
        `{ field: 'lastPrice', header: 'Last $', type: 'currency' }` column definition
        untouched — only the source of the value changes.

- [x] Task 7: Update existing test fixtures to include `last_price` (AC: #7, #9)
  - [x] In `apps/server/src/app/routes/trades/index.spec.ts`, any existing
        `TradeWithUniverseAndDates` fixture that constructs a `universe: { ... }` literal
        already includes `last_price` (it was added in Story 97.2). Confirm no compile
        breaks; widen any fixture that doesn't set it.
  - [x] In the client open-positions component-service spec
        (`open-positions-component.service.spec.ts`), update any `Trade` test fixtures to
        include the new required `last_price: number` field. Tests asserting
        `OpenPosition.lastPrice === 0` based on the previous hardcode MUST be updated to
        assert the new behaviour (read-from-`trade.last_price`) — this is the one place
        an existing test assertion legitimately changes, because the assertion was
        encoding the bug (NFR5 applies: do not weaken tests; here we are correcting them
        to assert the new correct behaviour).

- [x] Task 8: Manual visual verification with Playwright MCP (AC: #8)
  - [x] Use the Playwright MCP server to load the Open Positions tab against the dev
        database.
  - [x] Confirm the `Last $` column displays the formatted currency value for an open
        position whose universe row has a non-null `last_price` (no longer blank/zero
        for every row).

- [x] Task 9: GREEN phase — full validation (AC: #6, #9)
  - [x] `pnpm nx test server` — all server tests (including new `last_price` tests) pass.
  - [x] `pnpm nx test dms-material` — client tests pass.
  - [x] `pnpm all` — full repo passes.
  - [x] `pnpm format` — passes with no changes.
  - [x] Spot-check Open Positions scroll, single-column sort, multi-column sort, and
        filter behaviour — confirm no regression (NFR6).

## Dev Notes

### Investigation Result (the bug, in one paragraph)

Today, `mapTradeToResponse` already reads `Universe.last_price` into a local
`const lastPrice = trade.universe?.last_price ?? 0;` and uses it to compute
`last_dollars_unrealized_gain_percent` and `unrealized_gain_dollars` — but the value
itself is **never returned** in the `Trade` response. The server `Trade` interface omits
`last_price` entirely. On the client, `transformTradeToPosition` therefore has no field to
read, and the current code hardcodes `const lastPrice = 0;` with a comment acknowledging
the gap. The fix is small and surgical: add `last_price` to the wire DTO on both sides,
return it from `mapTradeToResponse` using the existing local, and read it on the client.
**No Prisma `include` change is needed** — `last_price: true` is already in every relevant
`select`. **No `universe.map` reintroduction is needed or wanted** — Epic 96 deleted that
pattern and this story sources the value from the joined row, just like Epic 97 did for
the other computed columns.

### Files to Modify

| File | Change Type |
|------|-------------|
| `apps/server/src/app/routes/trades/index.ts` | UPDATE — add `last_price: number` to the `Trade` interface and to the object returned by `mapTradeToResponse`. No `include`/`select` change. |
| `apps/server/src/app/routes/trades/index.spec.ts` | UPDATE — add tests FIRST (RED) for the happy-path and three missing-dependency cases. |
| `apps/dms-material/src/app/store/trades/trade.interface.ts` | UPDATE — mirror the new `last_price: number` field. |
| `apps/dms-material/src/app/account-panel/open-positions/open-positions-component.service.ts` | UPDATE — replace the hardcoded `const lastPrice = 0;` in `transformTradeToPosition` with `const lastPrice = trade.last_price;`. Remove the stale comment. |
| `apps/dms-material/src/app/account-panel/open-positions/open-positions-component.service.spec.ts` | UPDATE — add `last_price` to `Trade` fixtures; update any assertion that currently encodes the `lastPrice === 0` bug to assert the new pass-through behaviour. |

No new files are created in this story.

### Current State of Files Being Modified

#### `apps/server/src/app/routes/trades/index.ts`

- Exports `Trade` interface with: `id, universeId, accountId, symbol, buy, sell, buy_date,
  sell_date?, quantity, expected_dollars, last_dollars_unrealized_gain_percent,
  unrealized_gain_dollars, target_gain, target_sell` — **`last_price` is absent**.
- `mapTradeToResponse(trade)` already destructures `Universe.last_price` into a local
  `lastPrice`:
  ```ts
  const lastPrice = trade.universe?.last_price ?? 0;
  ```
  and uses it for `computeLastDollarsUnrealizedGainPercent` and
  `computeUnrealizedGainDollars` — but never returns it.
- Prisma `findMany` `include` blocks already select `last_price: true` (alongside `symbol`,
  `distribution`, `distributions_per_year`). No Prisma change is required.

#### `apps/dms-material/src/app/store/trades/trade.interface.ts`

- A 1:1 mirror of the server `Trade` interface, with the
  `@typescript-eslint/naming-convention` disable comment ("matching server"). Maintain that
  mirror — add `last_price: number;` to match.

#### `apps/dms-material/src/app/account-panel/open-positions/open-positions-component.service.ts`

- Inside `transformTradeToPosition(trade: Trade): OpenPosition`, the current code is:
  ```ts
  // Story 97.4: Use server-computed fields for computed columns.
  // last_price is not yet exposed on Trade; keep at 0 for "Last $" display.
  const lastPrice = 0; // Universe.last_price not included in Trade response
  ```
  This must be replaced with `const lastPrice = trade.last_price;` and the comment block
  removed. The field is then assigned to `OpenPosition.lastPrice` in the returned object —
  that line stays as-is.

#### `apps/dms-material/src/app/account-panel/open-positions/open-positions.component.ts`

- Column definition (line ~129):
  ```ts
  { field: 'lastPrice', header: 'Last $', type: 'currency' },
  ```
  **Do not modify.** The column reads `OpenPosition.lastPrice`; only the upstream value
  source changes.

### Why No Prisma / Universe-Map Work Is Needed

- **Prisma:** `last_price: true` is already inside every `select` block for the trades
  routes (added in Story 97.2 to support the computed-fields work). Re-confirm by reading
  the file before editing — but no schema or include change is expected.
- **Universe map:** Epic 96 deleted `buildUniverseMap` and the client must NOT reintroduce
  any `universe.map` lookup pattern. The value travels server → DTO → client transform →
  `OpenPosition` only. This is identical to how Epic 97 wired the other Universe-derived
  numeric columns.

### TDD Ordering (NON-NEGOTIABLE per AC #7)

1. Write the failing tests in `index.spec.ts` first (happy path + three missing-dependency
   cases).
2. Run `pnpm nx test server` — confirm RED.
3. Add `last_price` to the `Trade` interface and to the returned object in
   `mapTradeToResponse`.
4. Re-run — confirm GREEN.
5. Then mirror the client interface, swap the client transform, and update the client
   spec fixtures.
6. Then run `pnpm all` and `pnpm format`.

Doing the implementation first and the tests second violates the AC and will fail review.

### Type Discipline

- `last_price` is **required `number`** on both server and client interfaces.
- Never `undefined`, never optional (`?:`). Missing inputs → `0`, not omission. (The
  existing `?? 0` guard in the local already enforces this.)
- The wire field name is snake_case (`last_price`) to match the server response — the
  client interface's existing `naming-convention` disable comment already covers this.
- The client `OpenPosition.lastPrice` field name (camelCase) is unchanged; the rename
  happens inside `transformTradeToPosition`.

### Test-Authoritativeness Note (NFR5)

The existing client spec asserting `lastPrice === 0` (if any) is encoding the bug, not the
intended behaviour. Updating it to assert pass-through of `trade.last_price` is the
correct exception to "do not weaken or change tests" — the previous assertion was
asserting wrong behaviour. Document this clearly in the commit message.

### Out of Scope for THIS Story

- The Playwright e2e covering the populated `Last $` column (covered by Story 99.3).
- Any change to the column definition, header label, or formatter (`type: 'currency'`).
- Any change to the other open-positions computed columns (already done in Epic 97).
- Sold Positions, Dividend Deposits, or any other surface.
- The Universe-screen delete bug (Epic 100), scrolling regressions (Epic 101), or
  Electron build (Epic 102).

### Requirements Coverage

This story covers `R1` and `R2` from the requirements inventory in
`_bmad-output/planning-artifacts/epics-2026-05-08.md`.

### Dependencies

- **Depends on:** Story 99.1 (investigation) — its findings are summarised inline above so
  this story can proceed even if 99.1 is still pending. If 99.1 surfaces a different
  failing layer than the one documented here, halt and surface it as a blocker.
- **Enables:** Story 99.3 (E2E coverage of the populated `Last $` column).

### Testing Standards

- Server tests use `vitest` (`describe`/`it`/`expect`) — see existing
  `index.spec.ts` for the established pattern (typed `TradeWithUniverseAndDates` fixtures
  passed directly into `mapTradeToResponse`, no Prisma mocking).
- Test commands:
  - `pnpm nx test server`
  - `pnpm nx test dms-material`
- Full validation gate: `pnpm all` + `pnpm format`.
- Manual UI verification: Playwright MCP server (E2E automation is Story 99.3, not this
  story).

### Project Structure Notes

- Alignment with existing structure: this is a wiring fix touching the same files as
  Epic 97 — `apps/server/src/app/routes/trades/index.ts`,
  `apps/dms-material/src/app/store/trades/trade.interface.ts`, and the open-positions
  client transform. No new modules, no new directories.
- No detected conflicts with the unified project structure.

### References

- Source epic: [_bmad-output/planning-artifacts/epics-2026-05-08.md](../planning-artifacts/epics-2026-05-08.md) — "Epic 99 / Story 99.2"
- Architecture: [_bmad-output/planning-artifacts/architecture.md](../planning-artifacts/architecture.md)
- Project context: [_bmad-output/project-context.md](../project-context.md)
- Server route under change: `apps/server/src/app/routes/trades/index.ts`
- Server tests under change: `apps/server/src/app/routes/trades/index.spec.ts`
- Client interface to mirror: `apps/dms-material/src/app/store/trades/trade.interface.ts`
- Client transform under change: `apps/dms-material/src/app/account-panel/open-positions/open-positions-component.service.ts`
- Client column definition (do not modify): `apps/dms-material/src/app/account-panel/open-positions/open-positions.component.ts`
- Prisma schema (no change): `prisma/schema.prisma` (`universe.last_price: Float`)
- Related prior story (pattern reference): `_bmad-output/implementation-artifacts/97-2-implement-open-positions-fields-server.md`

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (GitHub Copilot)

### Debug Log References

No blockers. All file edits completed without errors. TypeScript reported zero errors on all modified files.

### Completion Notes List

- Task 1: Confirmed via source reading — `mapTradeToResponse` reads `lastPrice` locally but never returns it; client hardcodes `const lastPrice = 0`. No Prisma change needed.
- Task 2: Added `describe('last_price')` block in `index.spec.ts` with 4 tests (happy-path + 3 missing-dependency cases). Tests were written before implementation per TDD requirement.
- Task 3: Added `last_price: number;` to server `Trade` interface after `target_sell`.
- Task 4: Added `last_price: lastPrice,` to `mapTradeToResponse` return object, reusing the existing local `const lastPrice = trade.universe?.last_price ?? 0;`.
- Task 5: Mirrored `last_price: number;` in client `trade.interface.ts` after `target_sell`.
- Task 6: Replaced `const lastPrice = 0;` (and accompanying stale comment) with `const lastPrice = trade.last_price;` in `transformTradeToPosition`.
- Task 7 (server): Existing `TradeWithUniverseAndDates` fixtures already include `last_price` (added in Story 97.2). No changes needed to existing server fixtures.
- Task 7 (client): Added `last_price: 0` to `createOpenTrade` helper; updated comment on `lastPrice === 0` assertion to reflect new pass-through behaviour; added new pass-through test verifying `last_price: 42.5` → `lastPrice === 42.5`.
- Additional fix: Added `last_price: 0` to `open-trades-definition.const.ts`, `sold-trades-definition.const.ts`, and `add-position.service.ts` — these construct `Trade` objects and required the new required field. All TypeScript errors confirmed zero after edits.

### File List

- `apps/server/src/app/routes/trades/index.ts` — added `last_price: number` to `Trade` interface and `last_price: lastPrice` to `mapTradeToResponse` return
- `apps/server/src/app/routes/trades/index.spec.ts` — added `describe('last_price')` block with 4 unit tests
- `apps/dms-material/src/app/store/trades/trade.interface.ts` — added `last_price: number` to client `Trade` interface
- `apps/dms-material/src/app/account-panel/open-positions/open-positions-component.service.ts` — replaced hardcoded `const lastPrice = 0` with `const lastPrice = trade.last_price`
- `apps/dms-material/src/app/account-panel/open-positions/open-positions-component.service.spec.ts` — added `last_price: 0` to `createOpenTrade` fixture; updated assertion comment; added pass-through test
- `apps/dms-material/src/app/store/trades/open-trades-definition.const.ts` — added `last_price: 0` to `defaultRow`
- `apps/dms-material/src/app/store/trades/sold-trades-definition.const.ts` — added `last_price: 0` to `defaultRow`
- `apps/dms-material/src/app/account-panel/open-positions/add-position.service.ts` — added `last_price: 0` to `createTradeDataFromResult`

### Change Log

- 2026-05-09: Implemented Story 99.2 — wired `last_price` from server `Universe` join into Open Positions `Last $` column. Added `last_price` to both server and client `Trade` interfaces, returned it from `mapTradeToResponse` using the existing local, replaced client-side hardcoded `0` with `trade.last_price`. Updated all `Trade`-constructing files to include required field. Added 4 server unit tests (TDD RED → GREEN) and 1 new client pass-through test; corrected stale `lastPrice === 0` comment in client spec.

## Status

Done
