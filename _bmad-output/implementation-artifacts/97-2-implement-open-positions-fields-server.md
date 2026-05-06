# Story 97.2: Implement Expected$, Last$ Unrlz Gain%, Unrlz Gain$, and Target Gain on the Server

Status: Done

## Story

As Dave (the investor),
I want the Open Positions table to show Expected$, Last$ Unrlz Gain%, Unrlz Gain$, and
Target Gain populated for every row,
So that I can see my position economics without the columns appearing blank.

## Acceptance Criteria

1. **Given** the formulas captured in
   `_bmad-output/implementation-artifacts/open-positions-fields-research.md` (produced by
   Story 97.1),
   **When** `mapTradeToResponse` in `apps/server/src/app/routes/trades/index.ts` is updated,
   **Then** every returned `Trade` row includes numeric values for `expected_dollars`,
   `last_dollars_unrealized_gain_percent`, `unrealized_gain_dollars`, and `target_gain`,
   computed from the joined `Universe` row.

2. **Given** the server `Trade` interface previously omitted these four fields,
   **When** the change is applied,
   **Then** the interface declares each field as a required `number` (never `undefined`); rows
   where a dependency is missing return `0` rather than omitting the field.

3. **Given** the client `Trade` interface in
   `apps/dms-material/src/app/store/trades/trade.interface.ts`,
   **When** the change is applied,
   **Then** it mirrors the server interface (required `number` fields with the same names).

4. **Given** TDD ordering,
   **When** the unit tests in `apps/server/src/app/routes/trades/index.spec.ts` are written,
   **Then** there is a failing test (RED) for each new field's formula before the
   implementation exists, and after implementation `pnpm all` passes (GREEN).

5. **Given** the open-positions component currently displays blank values for these columns,
   **When** Story 97.2 is complete and the app is reloaded,
   **Then** the columns render the server-supplied values.

6. **Given** any code-quality validation,
   **When** `pnpm format` runs,
   **Then** it passes with no formatting changes required.

## Tasks / Subtasks

- [x] Task 1: Confirm prerequisites (AC: #1)
  - [x] Verify Story 97.1 is complete and that
        `_bmad-output/implementation-artifacts/open-positions-fields-research.md` exists
  - [x] Read the research doc and confirm the exact formulas, source columns, and
        precision/rounding rules for: Expected$, Last$ Unrlz Gain%, Unrlz Gain$, Target Gain
  - [x] Confirm which `Universe` columns must be selected via Prisma `include` (see Dev
        Notes — likely `last_price`, `distribution`, `distributions_per_year`)

- [x] Task 2: Write failing unit tests FIRST — RED phase (AC: #4)
  - [x] In `apps/server/src/app/routes/trades/index.spec.ts`, extend the existing
        `mapTradeToResponse` describe block
  - [x] Add a happy-path test for each of the 4 new fields:
        `expected_dollars`, `last_dollars_unrealized_gain_percent`,
        `unrealized_gain_dollars`, `target_gain` — each asserts the exact numeric value
        produced by the formula in the research doc
  - [x] Add a "missing-dependency → 0" test for each field (e.g., `universe` is `null`, or a
        required universe field such as `last_price` is `0`/`null` per the research doc's
        edge-case rules)
  - [x] Run `pnpm nx test server` and confirm the new tests fail (RED) before continuing

- [x] Task 3: Extend the server `Trade` interface and `TradeWithUniverseAndDates` shape
        (AC: #1, #2)
  - [x] In `apps/server/src/app/routes/trades/index.ts`, add to the exported `Trade`
        interface (in declaration order, after `quantity`):
        `expected_dollars: number;`,
        `last_dollars_unrealized_gain_percent: number;`,
        `unrealized_gain_dollars: number;`,
        `target_gain: number;`
  - [x] Extend `TradeWithUniverseAndDates.universe` to include any additional `Universe`
        columns the formulas need (e.g., `last_price`, `distribution`,
        `distributions_per_year`) so the Prisma row type matches the `include` in Task 5
  - [x] All four fields are REQUIRED `number` (never optional, never `undefined`)

- [x] Task 4: Implement `mapTradeToResponse` formulas (AC: #1, #2)
  - [x] In `mapTradeToResponse`, compute each of the four fields using the exact formulas
        from the research doc
  - [x] When any required dependency is missing (`universe` is `null`, or a required field
        is `null`/`undefined`), return `0` for that field — DO NOT omit and DO NOT return
        `undefined` or `NaN`
  - [x] Preserve existing behavior for `id`, `universeId`, `accountId`, `symbol`, `buy`,
        `sell`, `buy_date`, `sell_date`, `quantity`

- [x] Task 5: Update Prisma `include` clauses for the four call sites (AC: #1)
  - [x] In `apps/server/src/app/routes/trades/index.ts`, the `prisma.trades.findMany` calls
        in `handleGetTradesRoute`, `handleAddTradeRoute`, and `handleUpdateTradeRoute`
        currently use `include: { universe: { select: { symbol: true } } }`. Extend each
        `select` to include every additional `Universe` column required by the formulas
        (e.g., `last_price: true, distribution: true, distributions_per_year: true`)
  - [x] If `apps/server/src/app/routes/trades/get-open-trades/index.ts` and
        `apps/server/src/app/routes/trades/get-closed-trades/index.ts` also call
        `mapTradeToResponse`, extend their `include`/`select` the same way (read those
        files first to confirm)

- [x] Task 6: Mirror the client `Trade` interface (AC: #3)
  - [x] In `apps/dms-material/src/app/store/trades/trade.interface.ts`, add the same four
        required `number` fields with identical names so the client type matches the server
        wire format

- [x] Task 7: GREEN phase — confirm all tests pass and quality gates green (AC: #4, #6)
  - [x] `pnpm nx test server` — new tests pass
  - [x] `pnpm all` — full repo passes
  - [x] `pnpm format` — passes
  - [x] Spot-check: launch the app locally (or run the existing open-positions e2e if
        available — note the dedicated e2e is Story 97.4) and confirm the four columns
        render non-blank

## Dev Notes

### Files to Modify

| File | Change Type |
|------|-------------|
| `apps/server/src/app/routes/trades/index.ts` | UPDATE — extend `Trade` interface, extend `TradeWithUniverseAndDates`, extend `mapTradeToResponse`, extend Prisma `include` `select` blocks |
| `apps/server/src/app/routes/trades/index.spec.ts` | UPDATE — add tests FIRST (RED) for each formula and missing-dependency case |
| `apps/server/src/app/routes/trades/get-open-trades/index.ts` | LIKELY UPDATE — extend Prisma `include`/`select` if it calls `mapTradeToResponse` (verify) |
| `apps/server/src/app/routes/trades/get-closed-trades/index.ts` | LIKELY UPDATE — same as above (verify) |
| `apps/dms-material/src/app/store/trades/trade.interface.ts` | UPDATE — mirror the four new required `number` fields |

No new files are created in this story. The open-positions component is NOT modified here —
removing client-side computation is part of the larger epic (covered by Stories 97.3 / 97.4
per the epic scope statement).

### Current State of Files Being Modified

#### `apps/server/src/app/routes/trades/index.ts`

- Exports `Trade` interface with: `id, universeId, accountId, symbol, buy, sell, buy_date,
  sell_date?, quantity` — **all four new fields are absent today**.
- Exports `TradeWithUniverseAndDates` with `universe: { symbol: string } | null` — must be
  widened to expose the additional Universe columns the formulas need.
- `mapTradeToResponse(trade)` currently maps the existing nine fields and uses
  `trade.universe?.symbol ?? ''` — the same defensive pattern (`?? 0`) must be applied for
  the four new numeric fields when a dependency is missing.
- Prisma `findMany` calls in `handleGetTradesRoute`, `handleAddTradeRoute`, and
  `handleUpdateTradeRoute` use `include: { universe: { select: { symbol: true } } }` — must
  be extended.
- `handleDeleteTradeRoute` does not need changes (it does not return a `Trade`).

#### `apps/server/src/app/routes/trades/index.spec.ts`

- Currently has four tests, all targeting the `symbol` field on `mapTradeToResponse`.
- Imports `mapTradeToResponse` and `TradeWithUniverseAndDates` from `./index` — the
  fixture `TradeWithUniverseAndDates` literals MUST be updated to include any new Universe
  fields once `TradeWithUniverseAndDates` is widened, otherwise existing tests will fail
  to compile.

#### `apps/dms-material/src/app/store/trades/trade.interface.ts`

- Currently a 1:1 mirror of the server `Trade` interface (with the
  `naming-convention` ESLint disable comment "matching server"). Maintain that mirror.

### Universe Columns Available (from Prisma `universe` model)

The `Universe` row joined to a `trade` exposes (relevant subset for formulas):

- `last_price: Float`
- `distribution: Float`
- `distributions_per_year: Int`
- `most_recent_sell_price: Float | null`
- `most_recent_sell_date: DateTime | null`
- `ex_date: DateTime | null`
- `is_closed_end_fund: Boolean`

The exact subset the formulas require is dictated by the Story 97.1 research doc — defer to
that doc as the authoritative source. The dev MUST NOT guess the formulas; if the research
doc is missing or ambiguous, halt and surface that as a blocker rather than inventing
arithmetic.

### Formulas — DEFER TO RESEARCH DOC

The four field names and their semantic meaning:

| Wire Field | Display Name | Source Truth |
|------------|--------------|--------------|
| `expected_dollars` | Expected$ | `open-positions-fields-research.md` |
| `last_dollars_unrealized_gain_percent` | Last$ Unrlz Gain% | `open-positions-fields-research.md` |
| `unrealized_gain_dollars` | Unrlz Gain$ | `open-positions-fields-research.md` |
| `target_gain` | Target Gain | `open-positions-fields-research.md` |

**Edge-case rule (per AC #2):** when any required input is missing (`universe` is `null`,
or a required `Universe` column is `null`/`undefined`), return `0` for that field. This
matches the existing `symbol ?? ''` defensive pattern used in `mapTradeToResponse`.

### TDD Ordering (NON-NEGOTIABLE per AC #4)

1. Write the failing tests in `index.spec.ts` first.
2. Run `pnpm nx test server` — confirm RED.
3. Then implement the four formulas in `mapTradeToResponse`.
4. Re-run — confirm GREEN.
5. Then run `pnpm all` and `pnpm format`.

Doing the implementation first and the tests second violates the AC and will fail review.

### Type Discipline

- All four new fields are **required `number`** on both server and client interfaces.
- Never `undefined`, never optional (`?:`). Missing inputs → `0`, not omission.
- The `naming-convention` ESLint disable comment in the client interface stays — wire field
  names use snake_case to match the server response.

### Out of Scope for THIS Story

- `target_sell` (covered by Story 97.3).
- Removing client-side computation from `open-positions-component.service.ts` (covered by
  Stories 97.3 / 97.4).
- The Playwright e2e covering all five restored columns (covered by Story 97.4 per R67).
- Sold Positions or Dividend Deposits computed fields.

### Requirements Coverage

This story covers `R61`, `R62`, `R63`, `R64` from the requirements inventory in
`_bmad-output/planning-artifacts/epics-2026-05-05.md`.

### Dependencies

- **Depends on:** Story 97.1 (research doc must exist).
- **Enables:** Story 97.3 (Target Sell server move), Story 97.4 (e2e coverage).

### Testing Standards

- Server tests use `vitest` (`describe`/`it`/`expect`) — see existing
  `index.spec.ts` for the established pattern (typed `TradeWithUniverseAndDates` fixtures
  passed directly into `mapTradeToResponse`, no Prisma mocking).
- Test command for the affected project: `pnpm nx test server`.
- Full validation gate: `pnpm all` + `pnpm format`.

### References

- Source story spec: [_bmad-output/planning-artifacts/epics-2026-05-05.md](../planning-artifacts/epics-2026-05-05.md) — "Story 97.2"
- Story metadata: [_bmad-output/planning-artifacts/story-meta/2026-05-05/97-2-implement-open-positions-fields-server.yaml](../planning-artifacts/story-meta/2026-05-05/97-2-implement-open-positions-fields-server.yaml)
- Server route under change: `apps/server/src/app/routes/trades/index.ts`
- Server tests under change: `apps/server/src/app/routes/trades/index.spec.ts`
- Client interface to mirror: `apps/dms-material/src/app/store/trades/trade.interface.ts`
- Prisma schema: `prisma/schema.prisma` (`universe` and `trades` models)
- Research doc (prerequisite, produced by Story 97.1): `_bmad-output/implementation-artifacts/open-positions-fields-research.md`

## Dev Agent Record

### Agent Notes

Implementation complete. All four new fields added to server `Trade` interface, `TradeWithUniverseAndDates`, and `mapTradeToResponse` using exact formulas from the research doc. Prisma selects extended in all three call sites (handleGetTradesRoute, handleAddTradeRoute, handleUpdateTradeRoute). Client interface mirrored. 17 new tests added (4 happy-path + 13 edge-case) covering all formulas and missing-dependency → 0 guards. get-open-trades and get-closed-trades were verified to use their own local mapToResponse and do not call mapTradeToResponse, so no changes were needed there.

## File List

- `apps/server/src/app/routes/trades/index.ts` — extended `Trade` interface, `TradeWithUniverseAndDates`, `mapTradeToResponse`, and all three Prisma `include`/`select` blocks
- `apps/server/src/app/routes/trades/index.spec.ts` — added 17 new tests (4 describe blocks, each with happy-path + edge cases)
- `apps/dms-material/src/app/store/trades/trade.interface.ts` — mirrored four new required `number` fields

## Change Log

- Added `expected_dollars`, `last_dollars_unrealized_gain_percent`, `unrealized_gain_dollars`, `target_gain` to server `Trade` interface
- Widened `TradeWithUniverseAndDates.universe` to include `last_price`, `distribution`, `distributions_per_year`
- Implemented four formulas in `mapTradeToResponse` with `?? 0` edge-case guards
- Extended all three `prisma.trades.findMany` selects to include new Universe columns
- Mirrored four fields in client `Trade` interface
- Updated existing test fixtures to include new universe fields (TypeScript compilation)
- Added 17 new unit tests covering formulas and null/zero guards
