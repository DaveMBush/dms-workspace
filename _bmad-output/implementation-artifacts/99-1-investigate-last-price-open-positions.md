# Story 99.1: Investigate Why `Last $` is Empty on Open Positions

Status: Approved

## Story

As a developer,
I want a documented investigation of exactly where the Open Positions `Last $` value is being
lost — server-side join, DTO mapping, client-side `Trade → OpenPosition` transform, column
definition, or template binding —
So that Story 99.2 applies a precise, surgical fix rather than a speculative one.

**Depends on:** Epics 95–97 are merged (server-side symbol on `Trade`, client `universe.map`
removed, computed open-positions fields restored). This story changes **no production code**;
it produces a diagnosis that Story 99.2 will act on.

## Acceptance Criteria

1. **Given** the current `apps/server/src/app/routes/trades/index.ts` (`mapTradeToResponse`)
   and the Prisma `include`/`select` in `apps/server/src/app/routes/trades/get-open-trades/`,
   **When** the developer inspects the actual JSON returned for an Open Position whose
   symbol has a non-null `Universe.last_price` (capture via Playwright MCP DevTools network
   panel, or by hitting the endpoint directly with `curl`/`http`),
   **Then** Dev Notes record the full JSON shape of one such row verbatim, and explicitly
   answer: **does the response carry the raw `last_price` (or any equivalently-named field)
   for the open position, or only the four computed fields added in Story 97.2
   (`expected_dollars`, `last_dollars_unrealized_gain_percent`, `unrealized_gain_dollars`,
   `target_gain`) plus `target_sell`?**

2. **Given** the Open Positions client column for `Last $` is defined as
   `{ field: 'lastPrice', header: 'Last $', type: 'currency' }` in
   `apps/dms-material/src/app/account-panel/open-positions/open-positions.component.ts`,
   **When** the developer traces the binding from the cell back to its data source,
   **Then** Dev Notes document the full chain:
   - Which template expression renders the cell (it is the default
     `@case ('currency') { {{ row[column.field] | currency }} }` branch — confirm)
   - The shape of `row` (i.e. the `OpenPosition` interface — find the file and quote the
     definition)
   - The exact selector / signal / transform inside
     `apps/dms-material/src/app/account-panel/open-positions/open-positions-component.service.ts`
     that produces `OpenPosition.lastPrice` from a `Trade` (find `transformTradeToPosition`
     or its current equivalent and quote the relevant lines)
   - Whether `OpenPosition.lastPrice` is currently set from a server `Trade` field, derived
     locally, hard-coded, or simply absent / `undefined`

3. **Given** the Epic 97 story files in this directory
   (`97-1-research-open-positions-fields-history.md`,
   `97-2-implement-open-positions-fields-server.md`,
   `97-3-move-target-sell-to-server.md`,
   `97-4-e2e-open-positions-computed-fields.md`),
   **When** the developer reviews their acceptance criteria, file lists, and dev notes,
   **Then** Dev Notes record explicitly:
   - Which fields Story 97 **did** add to the server `Trade` response
   - Whether a raw `last_price` (or `lastPrice`) passthrough was in scope, was attempted
     and removed, or was simply overlooked
   - Whether Story 97.4's E2E test asserts on the `Last $` column at all (if it asserted
     correctly, this bug would have been caught — explain why it wasn't)

4. **Given** Epic 95 deleted `buildUniverseMap` / the client-side universe map lookup
   (Stories 95.1, 95.2, and Epic 96.2),
   **When** the developer reviews the current
   `open-positions-component.service.ts`,
   **Then** Dev Notes confirm there is **no** remaining `universe.map`-style lookup that
   could supply `lastPrice` on the client; if any such code is found, document it (it must
   not be reintroduced — see NFR in epics file).

5. **Given** the diagnosis is complete,
   **When** the Dev Notes' "Conclusion" section is written,
   **Then** it contains a single clear statement of which layer is the broken link,
   chosen from this list (or a documented alternative):

   - **(a)** Server `mapTradeToResponse` does not include a raw `last_price`/`lastPrice`
     passthrough field on the `Trade` response (most likely, given the code as it stands).
   - **(b)** Server includes the field but under a name the client transform doesn't read.
   - **(c)** Server returns the field correctly, but the client `Trade → OpenPosition`
     transform doesn't copy it into `OpenPosition.lastPrice`.
   - **(d)** `OpenPosition.lastPrice` is populated but the column is reading the wrong
     property name.
   - **(e)** Some other root cause — describe in detail.

   The conclusion must include the **exact file path(s) and line number(s)** Story 99.2
   will need to touch.

6. **Given** this story is investigation-only,
   **When** the work is finished,
   **Then** **no production source files have been modified** (only the story file's Dev
   Notes are updated; `git diff` against `main` should show changes only in this story
   file). `pnpm all` must pass unchanged.

## Tasks / Subtasks

- [ ] Task 1: Read all "Files to Read Before Starting" listed in Dev Notes (AC: #1–#5)
  - [ ] Open every file in the list and read in full — do not skim
  - [ ] Note any deviations from what this story spec documents (the source of truth is
        the live code, not this spec — flag mismatches in Dev Notes)

- [ ] Task 2: Capture the live server response for an Open Position (AC: #1)
  - [ ] Identify a symbol in the dev DB with a non-null, non-zero `last_price`
        (`pnpm exec prisma studio` or `sqlite3 dms.db 'SELECT symbol, last_price FROM
        universe WHERE last_price > 0 LIMIT 5;'`)
  - [ ] Ensure that symbol has at least one open trade in `trades`
        (`SELECT * FROM trades WHERE universeId = '<id>' AND sell_date IS NULL LIMIT 1;`)
  - [ ] Start the dev server (`pnpm exec nx run server:serve`) **OR** boot the full app
        (`pnpm exec nx run dms-material:serve`) and use the Playwright MCP server to
        navigate to the Open Positions tab while watching the Network panel
  - [ ] Capture the full response body for the open-positions request (whichever route
        actually serves the Open Positions tab — most likely
        `apps/server/src/app/routes/trades/get-open-trades/`; verify by inspecting the
        `Network` panel)
  - [ ] Paste the verbatim JSON for one row into Dev Notes under
        "Server Response Sample"

- [ ] Task 3: Trace the client binding chain end-to-end (AC: #2, #4)
  - [ ] Quote the `columns` array entry for `lastPrice` from
        `open-positions.component.ts`
  - [ ] Quote the cell template branch that renders `lastPrice` from
        `open-positions.component.html` (confirm it is the default
        `@case ('currency') { {{ row[column.field] | currency }} }` arm)
  - [ ] Find and quote the `OpenPosition` interface (search the open-positions folder and
        the store; record the absolute path)
  - [ ] Find and quote the `transformTradeToPosition` (or equivalent) function in
        `open-positions-component.service.ts` — show how each `OpenPosition` field is
        derived from `Trade`
  - [ ] Confirm in writing that no `universe.map`/`buildUniverseMap` lookup remains
        (Stories 95.2 and 96.2 deleted these — verify and record)

- [ ] Task 4: Audit Epic 97's coverage of `Last $` (AC: #3)
  - [ ] Read 97-1, 97-2, 97-3, 97-4 story files (in this directory)
  - [ ] Record which fields Story 97.2 added to the server `Trade` interface
        (check the current state of
        `apps/server/src/app/routes/trades/index.ts` — the live source is authoritative)
  - [ ] State explicitly whether a raw `last_price` passthrough was in scope
  - [ ] Read 97-4's E2E spec (likely under `apps/dms-material-e2e/src/`) and record
        whether it asserts the `Last $` cell value; if it does, explain why the bug
        slipped past

- [ ] Task 5: Write the Conclusion in Dev Notes (AC: #5)
  - [ ] Pick one of (a)–(e) from AC #5 (or document a new option)
  - [ ] List the exact file path(s) and line range(s) Story 99.2 will touch
  - [ ] Propose the field name to use on the server `Trade` response
        (recommendation: add `last_price: number` to the server `Trade` interface to match
        the existing snake_case convention used by `expected_dollars`,
        `last_dollars_unrealized_gain_percent`, etc., and have the client transform map
        it to `OpenPosition.lastPrice`; alternatively, add `lastPrice: number` directly
        if that fits the existing client conventions better — document the chosen name
        and why)
  - [ ] Note the null/missing-price convention to follow (Universe.`last_price` is
        non-nullable `Float` in the schema; the existing server code defaults missing
        values to `0` via `?? 0` — confirm and recommend whether `0` should render as
        blank, em-dash, or `$0.00` per project convention; check what other zero-currency
        columns render today on the same screen)

- [ ] Task 6: Verify no production code was changed and quality gates pass (AC: #6)
  - [ ] `git status` and `git diff` should show only this story file modified
  - [ ] `pnpm all` passes
  - [ ] `pnpm format` produces zero diffs

## Dev Notes

### Why This Story Exists Before Story 99.2

The `Last $` column is empty for every Open Position row, despite:

- The `Universe` table having a non-nullable `last_price Float` column (populated by the
  existing price-update flows).
- The server already joining `universe` into `trades` and selecting `last_price` in
  `mapTradeToResponse`'s Prisma `include` (see file analysis below).
- Epic 97 having explicitly restored "missing Open Positions computed fields on the
  server" — yet the symptom remains.

That contradiction means the bug is in **one specific layer**, and an unscoped fix is
likely to either miss the actual broken link or accidentally re-introduce a deleted
client-side `universe.map` lookup (which Epics 95 and 96 spent multiple stories
eliminating). Story 99.1 nails down the broken layer; Story 99.2 fixes only that layer.

### Server-Side State (Snapshot of `mapTradeToResponse` as of this story)

`apps/server/src/app/routes/trades/index.ts` currently exports:

```typescript
export interface Trade {
  id: string;
  universeId: string;
  accountId: string;
  symbol: string;
  buy: number;
  sell: number;
  buy_date: string;
  sell_date?: string;
  quantity: number;
  expected_dollars: number;
  last_dollars_unrealized_gain_percent: number;
  unrealized_gain_dollars: number;
  target_gain: number;
  target_sell: number;
}
```

Note what is **not** present: a raw `last_price` (or `lastPrice`) field. The Prisma
`include` does select `last_price: true`, and `mapTradeToResponse` consumes
`trade.universe?.last_price` internally to compute the gain fields — but it never copies
the raw value into the response. **This is the prime suspect for AC #5 option (a).**

### Client-Side State (What the column expects)

`apps/dms-material/src/app/account-panel/open-positions/open-positions.component.ts`
declares the column as:

```typescript
{ field: 'lastPrice', header: 'Last $', type: 'currency' }
```

The default `cellTemplate` arm renders `{{ row[column.field] | currency }}`, so the cell
will display whatever `OpenPosition.lastPrice` resolves to. If `OpenPosition.lastPrice`
is `undefined`, the `currency` pipe returns `null` and the cell renders blank — which
matches the reported symptom.

The investigation must locate `OpenPosition.lastPrice`'s actual definition and the
`Trade → OpenPosition` transform to confirm where the value goes missing.

### Files to Read Before Starting (do not skip)

- `apps/server/src/app/routes/trades/index.ts` — `Trade` interface,
  `TradeWithUniverseAndDates`, `mapTradeToResponse`, Prisma `include` selections
- `apps/server/src/app/routes/trades/get-open-trades/index.ts` — confirm this is the
  route the Open Positions tab actually hits, and whether it uses
  `mapTradeToResponse`
- `apps/server/src/app/routes/trades/index.spec.ts` — existing assertions on the
  shape of `mapTradeToResponse` output
- `apps/dms-material/src/app/store/trades/trade.interface.ts` — client `Trade`
  interface (must mirror the server shape per Stories 95–97)
- `apps/dms-material/src/app/account-panel/open-positions/open-positions.component.ts`
  — `columns` array (esp. the `lastPrice` entry), template binding
- `apps/dms-material/src/app/account-panel/open-positions/open-positions.component.html`
  — cell template
- `apps/dms-material/src/app/account-panel/open-positions/open-positions-component.service.ts`
  — the `Trade → OpenPosition` transform (`transformTradeToPosition` or equivalent),
  the `selectOpenPositions` signal/selector, and any remaining (or absent)
  `universe.map` references
- `apps/dms-material/src/app/account-panel/open-positions/open-positions-component.service.spec.ts`
  — existing assertions on the transform shape
- The `OpenPosition` interface — search the open-positions folder and the
  `apps/dms-material/src/app/store/` tree; record the absolute path in Dev Notes
- `prisma/schema.prisma` — confirm `universe.last_price Float` is non-nullable
- Story 97 files in this directory: `97-1-...md`, `97-2-...md`, `97-3-...md`,
  `97-4-...md`
- Story 95 files in this directory: `95-1-...md`, `95-2-...md`
- Story 96 files in this directory: `96-1-...md`, `96-2-...md`
- The Epic 97 E2E spec file under `apps/dms-material-e2e/src/` — find it and check
  whether it asserts on the `Last $` cell

### Snake_case vs camelCase — Naming Convention Note

The server `Trade` interface uses snake_case for new fields
(`expected_dollars`, `last_dollars_unrealized_gain_percent`,
`unrealized_gain_dollars`, `target_gain`, `target_sell`). The client `OpenPosition`
column uses camelCase (`lastPrice`, `expectedYield`, `unrealizedGainPercent`,
`unrealizedGain`, `targetGain`, `targetSell`). That implies a snake → camel
translation must be happening in the client `Trade → OpenPosition` transform.

The investigation must confirm:

1. Whether the transform is field-by-field and missing the `last_price` mapping, or
2. Whether the transform is generic/automatic (e.g. via a key mapper) and the bug is
   that the source field doesn't exist at all on the server response.

This is the primary discriminator between AC #5 options (a) and (c).

### Null / Missing Price Convention

`universe.last_price` is declared `Float` (non-nullable) in `prisma/schema.prisma`, so
in normal operation the value is always present. The existing server code defaults
missing/zero universe data to `0` (e.g. `trade.universe?.last_price ?? 0`). For the
fix in Story 99.2, the convention is:

- If the server value is a positive number → render via `| currency` (default behaviour)
- If the server value is `0` or missing → match what other zero-currency columns on the
  same screen do today (Buy, Sell). The investigation should record what those columns
  render for a zero value so Story 99.2 can be consistent. **Do not invent a new
  convention.**

### What NOT to Do in This Story

- Do **not** modify `mapTradeToResponse`, the `Trade` interface, or any client transform.
  This is an investigation-only story.
- Do **not** re-introduce a client-side `universe.map`/`buildUniverseMap` lookup, even
  to "test" a hypothesis (see NFR R2 in epics-2026-05-08.md and Epic 96.2 which deleted
  the helper).
- Do **not** add new tests in this story — Story 99.3 owns the E2E coverage.
- Do **not** propose a fix that ships a raw `last_price` AND keeps the existing
  derived fields without checking whether `last_dollars_unrealized_gain_percent`
  should also be re-evaluated; that is Story 99.2's call once the diagnosis is in
  hand.

### Files to Create (NEW)

None.

### Files to Modify (UPDATE)

None — investigation only. The only file written to is **this story file** (Dev Notes
sections appended during the investigation).

### Project Structure Notes

- All file paths above are relative to repo root `/home/dave/code/dms-workspace`.
- The Open Positions feature lives entirely under
  `apps/dms-material/src/app/account-panel/open-positions/` on the client and
  `apps/server/src/app/routes/trades/` on the server. No other folders should need to
  be opened during the investigation.

### Testing Standards

- No new tests are added in this story.
- `pnpm all` must continue to pass; if it does not pass on `main` before this story
  starts, that is a separate problem and must be flagged in Dev Notes (do not work
  around it).

### Useful Commands

```bash
# Inspect the dev DB
sqlite3 dms.db "SELECT symbol, last_price FROM universe WHERE last_price > 0 LIMIT 5;"
sqlite3 dms.db "SELECT t.id, t.universeId, u.symbol, u.last_price, t.buy, t.quantity \
  FROM trades t JOIN universe u ON u.id = t.universeId \
  WHERE t.sell_date IS NULL AND u.last_price > 0 LIMIT 5;"

# Boot the server alone for direct API inspection
pnpm exec nx run server:serve

# Boot the full app (server + client) — use Playwright MCP to drive
pnpm exec nx run dms-material:serve

# Quality gates (must pass with no production-code changes)
pnpm all
pnpm format
```

### Dependency Notes

Hard prerequisites (already merged on `main`):

- Epic 95 — server-side symbol on `Trade` (`Stories 95.1, 95.2`)
- Epic 96 — final removal of client-side universe map (`Stories 96.1, 96.2`)
- Epic 97 — restored Open Positions computed fields on the server
  (`Stories 97.1, 97.2, 97.3, 97.4`)

This story has **no** soft dependencies — it is pure forensic work on the merged state.

### References

- [Source: _bmad-output/planning-artifacts/epics-2026-05-08.md#Epic 99]
- [Source: _bmad-output/planning-artifacts/epics-2026-05-08.md#Story 99.1]
- [Source: _bmad-output/implementation-artifacts/97-1-research-open-positions-fields-history.md]
- [Source: _bmad-output/implementation-artifacts/97-2-implement-open-positions-fields-server.md]
- [Source: _bmad-output/implementation-artifacts/97-3-move-target-sell-to-server.md]
- [Source: _bmad-output/implementation-artifacts/97-4-e2e-open-positions-computed-fields.md]
- [Source: _bmad-output/implementation-artifacts/95-1-enforce-symbol-required-in-trade.md]
- [Source: _bmad-output/implementation-artifacts/95-2-client-remove-universe-map-open-positions.md]
- [Source: _bmad-output/implementation-artifacts/96-1-client-remove-universe-map-sold-positions.md]
- [Source: _bmad-output/implementation-artifacts/96-2-delete-build-universe-map.md]
- [Source: apps/server/src/app/routes/trades/index.ts]
- [Source: apps/server/src/app/routes/trades/get-open-trades/index.ts]
- [Source: apps/dms-material/src/app/store/trades/trade.interface.ts]
- [Source: apps/dms-material/src/app/account-panel/open-positions/open-positions.component.ts]
- [Source: apps/dms-material/src/app/account-panel/open-positions/open-positions.component.html]
- [Source: apps/dms-material/src/app/account-panel/open-positions/open-positions-component.service.ts]
- [Source: prisma/schema.prisma]

## Dev Agent Record

### Context Reference

- Created via bmad-create-story (non-interactive)
- Source epic file: `_bmad-output/planning-artifacts/epics-2026-05-08.md`

### Agent Model Used

_To be filled in during implementation._

### Debug Log References

_To be populated during implementation._

### Completion Notes List

_To be populated during implementation._

### File List

_To be populated during implementation. Investigation-only story — expected to be
empty at completion._

## Change Log

| Date       | Author | Description                                          |
| ---------- | ------ | ---------------------------------------------------- |
| 2026-05-08 | Dave   | Story created (Approved) via bmad-create-story flow. |
