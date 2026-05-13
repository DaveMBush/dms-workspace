# Story 104.1: Reproduce and Diagnose Why Closed Positions Stay Visible Until Refresh

Status: Approved

**Story Key:** `104-1-investigate-close-position-not-removed`
**Epic:** 104 — Closing a Position Removes It from Open Positions Immediately
**Source:** [_bmad-output/planning-artifacts/epics-2026-05-13.md](../planning-artifacts/epics-2026-05-13.md) (Story 104.1)
**Type:** Investigation (reproduction + code-only audit; no production code or tests changed)

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want a reproduction and root-cause diagnosis of why a position closed via `Mst Rcnt Sll Dt`
+ `Mst Rcnt Sell $` does not immediately disappear from the Open Positions list — covering
the save HTTP request, the server response, the SmartNgRX/SmartSignals store update, and the
Open Positions selector's reactivity to the changed fields,
So that Story 104.2 fixes the actual broken layer rather than guessing.

## Epic Context

**Epic 104 Goal:** When Dave closes a position on the Open Positions screen by entering a
`Mst Rcnt Sll Dt` and a positive `Mst Rcnt Sell $` and saving, the row should disappear from
the Open Positions list within one rendered frame. Today it stays visible until the page is
hard-refreshed, which means the client-side view is not re-evaluating the open/closed
predicate against the mutated row.

This story (104.1) is the **investigation/diagnosis** story. It must:

1. Reproduce the bug via the Playwright MCP server.
2. Capture the save HTTP request/response, verify server persistence, and trace the
   SmartNgRX/SmartSignals store update path.
3. Document the actual "open vs closed" predicate the Open Positions list uses.
4. Pinpoint the failing layer so Story 104.2 can apply a surgical fix without regressing
   server-side persistence or the Sold Positions screen.

**No production code is modified in this story.**

## Acceptance Criteria

1. **AC1 — Bug reproduced via Playwright MCP and recorded.**
   **Given** the current Open Positions screen and at least one open position,
   **When** the developer reproduces the bug via the Playwright MCP server (set sell date,
   set sell price > 0, save, observe row remains; refresh page; observe row is now gone),
   **Then** Dev Notes record screenshots/observations of the row before save, after save
   (still visible), and after refresh (gone).

2. **AC2 — Save HTTP request/response captured.**
   **Given** the network panel / Playwright MCP request log during the save,
   **When** the request is captured,
   **Then** Dev Notes document the HTTP method, URL, payload, status code, and full
   response body returned by the server.

3. **AC3 — Server-side persistence verified.**
   **Given** the server-side handler for the save (`apps/server/src/app/routes/trades/`),
   **When** the developer traces the code path,
   **Then** Dev Notes record (a) whether the response includes the updated trade row,
   (b) whether `mapTradeToResponse` is applied to the saved row before returning, and
   (c) whether the persisted trade actually has the new sell date and sell price (verified
   by a direct DB query).

4. **AC4 — Store update behaviour and selector predicate documented.**
   **Given** the SmartNgRX/SmartSignals trade store and the Open Positions selector,
   **When** the developer traces the client-side update path,
   **Then** Dev Notes record (a) whether the store entity for that trade is updated with
   the new sell date / sell price after the save, (b) the exact predicate the Open
   Positions selector uses to decide "open vs closed" (server-filtered list, client-side
   filter on sell date, etc.), and (c) whether that predicate would correctly exclude the
   row given the new field values.

5. **AC5 — Failing layer explicitly identified for Story 104.2.**
   **Given** all four diagnostic dimensions (save request, server persistence, store
   update, selector predicate) have been characterised,
   **When** the developer writes a "Failing Layer" subsection in Dev Notes,
   **Then** that subsection states explicitly which layer is broken (one or more of):
   - (i) the save HTTP payload is wrong / missing `sell_date` or `sell`;
   - (ii) the server doesn't actually persist the new field values;
   - (iii) the server response is missing or wrong-shaped, so the store entity is not
     updated client-side;
   - (iv) the store entity IS updated but the Open Positions list is not a filtered
     view — it just renders whatever is in `currentAccount().openTrades`, and the
     "open" collection is never re-pruned to remove the now-closed trade;
   - (v) the predicate is correct but reactivity (signal / change-detection) is not
     firing on the mutated fields.

6. **AC6 — Recommendation handed off to Story 104.2.**
   **Given** the failing layer is identified,
   **When** the developer writes a "Recommendation for Story 104.2" subsection in Dev
   Notes,
   **Then** that subsection states the smallest viable fix shape (e.g. "remove from
   `openTrades` SmartArray on save", "switch the list to a `computed` filter", "trigger a
   refetch", "fix the server response", etc.) **and** lists the exact files Story 104.2
   will need to touch.

7. **AC7 — No production code changes; quality gate passes.**
   **Given** the investigation is complete,
   **When** `pnpm all` runs,
   **Then** all tests pass (no production code is modified in this story).

## Tasks / Subtasks

- [ ] **Task 1 — Reproduce the bug with Playwright MCP** (AC: #1)
  - [ ] Start the local dev stack (`./scripts/start-local-dev.sh` or `pnpm nx serve …`)
        and ensure at least one account has at least one open position.
  - [ ] Use the Playwright MCP server to navigate to the Open Positions screen for that
        account and capture a screenshot of the target row before any change.
  - [ ] Edit `Mst Rcnt Sll Dt` (the `sellDate` column) on the row to today's date and
        `Mst Rcnt Sell $` (the `sell` column) to a positive value, then commit each edit
        (blur / Enter / save action — confirm via reproduction which interaction
        actually triggers the save).
  - [ ] Capture a screenshot immediately after save and confirm the row is still visible
        in the list.
  - [ ] Hard-refresh the page (`F5` / `Ctrl-R`), capture a screenshot, and confirm the
        row is now gone.
  - [ ] Save all three screenshots and the reproduction script/snippet into the Dev Notes
        "Reproduction" subsection.

- [ ] **Task 2 — Capture the save HTTP request/response** (AC: #2)
  - [ ] During the same Playwright MCP session (or a fresh repro), capture the network
        request fired by the save: HTTP method, URL, request body, status code, and the
        full response body.
  - [ ] Confirm whether the URL is `PUT /api/trades` (the existing
        `handleUpdateTradeRoute`) or something else — see Dev Notes for the expected
        wiring via `TradeEffectsService.update()`.
  - [ ] Save the captured request/response into Dev Notes "Save HTTP" subsection
        (verbatim — do not paraphrase).

- [ ] **Task 3 — Verify server-side persistence** (AC: #3)
  - [ ] Read [apps/server/src/app/routes/trades/index.ts](../../apps/server/src/app/routes/trades/index.ts)
        `handleUpdateTradeRoute` (the `PUT /` handler) and confirm in Dev Notes:
        - whether `sell_date` and `sell` from the request body are written to Prisma;
        - whether the response is built via `mapTradeToResponse` (which DOES include
          `sell_date` — see lines 82–112 of that file);
        - whether the response array contains the updated row.
  - [ ] Run a direct DB query (`pnpm prisma studio`, or a one-off `prisma.trades.findUnique`
        in a `tools/` script, or a SQL query) against the closed trade's `id` after the
        Playwright save and record the persisted `sell_date` and `sell` values.
  - [ ] If `mapTradeToResponse` is NOT applied, or if `sell_date` is being silently
        dropped on the server, capture that in Dev Notes — that would directly explain the
        bug (option AC5(ii)/(iii)).

- [ ] **Task 4 — Trace the SmartSignals store update on save** (AC: #4)
  - [ ] Read [apps/dms-material/src/app/store/trades/trade-effect.service.ts](../../apps/dms-material/src/app/store/trades/trade-effect.service.ts)
        — confirm `update(newRow)` does `PUT ./api/trades` and returns
        `Observable<Trade[]>`.
  - [ ] Read [apps/dms-material/src/app/store/trades/open-trades-definition.const.ts](../../apps/dms-material/src/app/store/trades/open-trades-definition.const.ts)
        and the surrounding store wiring (the `openTradesDefinition` SmartEntityDefinition,
        and how `currentAccount.openTrades` is populated). Confirm in Dev Notes:
        - that the proxy mutation pattern used in
          [open-positions.component.ts](../../apps/dms-material/src/app/account-panel/open-positions/open-positions.component.ts)
          (`onSellDateChange` / `onSellChange`, lines ~201–230) does in fact trigger
          `TradeEffectsService.update()`;
        - that the store entity for the trade is updated with the new `sell` and
          `sell_date` after the save (instrument via Playwright MCP `evaluate` to read
          the SmartArray entry, or via a temporary `console.log` if necessary — but
          revert any code changes before finishing the story);
        - that the trade is **still present** in the `openTrades` SmartArray after the
          save (this is the strong-candidate hypothesis — see Dev Notes).

- [ ] **Task 5 — Document the Open Positions "open vs closed" predicate** (AC: #4)
  - [ ] Read [open-positions-component.service.ts](../../apps/dms-material/src/app/account-panel/open-positions/open-positions-component.service.ts)
        `selectOpenPositions` computed (lines 74–96) and document explicitly in Dev Notes
        that **it does NOT filter by sell date** — it transforms every entry in
        `currentAccount().openTrades` 1:1 into an `OpenPosition`.
  - [ ] Read [apps/server/src/app/routes/trades/get-open-trades/index.ts](../../apps/server/src/app/routes/trades/get-open-trades/index.ts)
        and confirm the `/api/trades/open` endpoint applies `where: { sell_date: null }`
        — i.e. the open/closed split lives **server-side**, and the client list only
        re-prunes when it re-fetches.
  - [ ] Verify on hard refresh that the client re-fetches `/api/trades/open` (or whatever
        the SmartNgRX bootstrap fetch does for `openTrades`) and that the closed row is
        absent from that response.
  - [ ] Document in Dev Notes: "the predicate is server-side; client-side mutation of
        `sell_date` does not cause re-pruning of the local `openTrades` collection".

- [ ] **Task 6 — State the failing layer and write the Story 104.2 recommendation**
      (AC: #5, #6)
  - [ ] Synthesise Tasks 1–5 into a single "Failing Layer" subsection that picks
        explicitly from AC5 options (i)–(v), with a one-paragraph justification citing
        the evidence captured above.
  - [ ] Write a "Recommendation for Story 104.2" subsection that names:
        - the smallest viable fix shape (e.g. on `onSellDateChange` / `onSellChange`,
          if the new state makes the row "closed" — i.e. `sell_date` set and `sell > 0`
          — then call `RowProxyDelete.delete()` on the trade in `openTrades` so the
          SmartArray drops it; or alternatively switch `selectOpenPositions` to a
          `computed` that filters out closed trades; or trigger a refetch of `openTrades`
          after the update settles);
        - the exact files Story 104.2 will need to touch (with one-line description of
          the change in each);
        - any test files (unit + Playwright) Stories 104.2 / 104.3 will need to update
          or add.

- [ ] **Task 7 — Quality gate** (AC: #7)
  - [ ] Confirm no production source files were modified (only this story file's Dev
        Notes was updated).
  - [ ] Run `pnpm all` and confirm all tests pass. Record the result in Dev Notes.

## Dev Notes

### Architecture & Code Pointers

The investigation must trace four layers end-to-end. Concrete starting points (verified by
code search at story-creation time — confirm during investigation):

#### 1. The edit handlers on the Open Positions row

- **Component:** [apps/dms-material/src/app/account-panel/open-positions/open-positions.component.ts](../../apps/dms-material/src/app/account-panel/open-positions/open-positions.component.ts)
- **Relevant handlers:**
  - `onSellChange(position, newValue)` — sets `trade.sell = newValue` via SmartArray proxy
    mutation (lines ~201–210).
  - `onSellDateChange(position, newDate)` — sets `trade.sell_date = dateString` via
    SmartArray proxy mutation (lines ~213–230).
- **Pattern:** these are proxy mutations on the SmartNgRX SmartArray entry. Per the inline
  comment ("SmartNgRX automatically detects mutation and persists to backend"), each
  mutation is expected to fire `TradeEffectsService.update(newRow)`.

#### 2. The HTTP save

- **Service:** [apps/dms-material/src/app/store/trades/trade-effect.service.ts](../../apps/dms-material/src/app/store/trades/trade-effect.service.ts)
- **Method:** `update(newRow: Trade)` → `this.http.put<Trade[]>('./api/trades', newRow)`
- **Token:** `tradeEffectsServiceToken` (used by both `openTradesDefinition` and
  `soldTradesDefinition` — confirm both definitions point at the same effect service).

#### 3. The server-side handler and persistence

- **Route:** [apps/server/src/app/routes/trades/index.ts](../../apps/server/src/app/routes/trades/index.ts)
- **Handler:** `handleUpdateTradeRoute` → `PUT /` (lines ~207–256).
- **Behaviour at story-creation time:**
  - destructures `id, universeId, accountId, buy, sell, buy_date, sell_date, quantity`
    from request body;
  - calls `prisma.trades.update({ where: { id }, data: { …, sell_date: sell_date ? new
    Date(sell_date) : undefined, … } })`;
  - re-reads via `prisma.trades.findMany({ where: { id }, include: { universe: { select: {
    symbol, last_price, distribution, distributions_per_year } } } })`;
  - returns `trades.map(mapTradeToResponse)` — so the response IS a `Trade[]` with `sell`
    and `sell_date` fields populated (see `mapTradeToResponse` at lines ~82–112).
- **Important nuance to verify:** the Prisma update uses `sell_date: … : undefined`. In
  Prisma, `undefined` means "do not update this column". So if the client ever sends
  `sell_date: null` (intending to clear the date), the server will **not** clear the column
  — it will leave whatever was there before. For this epic's scenario the client should be
  sending a defined `sell_date`, but worth confirming during the repro that the request
  body actually contains the new sell date.

#### 4. The SmartSignals store and the Open Positions selector

- **Open trades collection:** [apps/dms-material/src/app/store/trades/open-trades-definition.const.ts](../../apps/dms-material/src/app/store/trades/open-trades-definition.const.ts)
  (`openTradesDefinition`, entityName `openTrades`, effect service
  `tradeEffectsServiceToken`).
- **Sold trades collection:** [apps/dms-material/src/app/store/trades/sold-trades-definition.const.ts](../../apps/dms-material/src/app/store/trades/sold-trades-definition.const.ts).
- **Selector currently used by the Open Positions screen:** the `selectOpenPositions`
  computed in [open-positions-component.service.ts](../../apps/dms-material/src/app/account-panel/open-positions/open-positions-component.service.ts)
  (lines 74–96). It reads `this.trades()` (which is `currentAccount().openTrades as Trade[]`)
  and maps each entry through `transformTradeToPosition` 1:1. **There is no
  `filter(sell_date == null && sell == 0)` step** — the open/closed predicate is not
  applied client-side here.
- **Server-side predicate:** [apps/server/src/app/routes/trades/get-open-trades/index.ts](../../apps/server/src/app/routes/trades/get-open-trades/index.ts)
  applies `where: { sell_date: null }`. This is what makes the row disappear on hard
  refresh.

### Strong-Candidate Hypothesis (verify, do not assume)

Given the code shape above, the most likely failing layer is **AC5(iv) — the Open Positions
list is not a filtered view**:

- The save fires `PUT /api/trades`, the server persists the new `sell_date` and `sell`, and
  the store entity for the trade is updated correctly with the new fields.
- BUT the trade row is still a member of the `openTrades` SmartArray (membership is
  determined at fetch time, server-side, by `sell_date: null`).
- The `selectOpenPositions` computed re-emits when the trade entity changes (because
  `transformTradeToPosition` reads `trade.sell_date` etc.) — but it produces **the same
  number of `OpenPosition` rows as before, just with the now-closed row's `sellDate` and
  `sell` populated**. So the row stays visible.
- On hard refresh, the SmartNgRX bootstrap re-fetches `openTrades` (server-filtered to
  `sell_date: null`), the now-closed trade is absent, and the row finally disappears.

If this hypothesis holds, the fix shape for Story 104.2 is one of:

- **(a)** In `onSellChange` / `onSellDateChange`, after the proxy mutation, if the new
  trade state is "closed" (i.e. `sell_date` set AND `sell > 0`), call
  `RowProxyDelete.delete()` on the trade in `openTrades` (the same pattern
  `deleteOpenPosition` already uses, lines 60–72 of `open-positions-component.service.ts`)
  so the SmartArray drops it locally. The server already persists correctly.
- **(b)** Rewrite `selectOpenPositions` as a `computed` that also filters
  `(sellDate == null || sellDate === undefined) && (sell == 0 || sell == null)`. Cheaper
  to ship but introduces a divergence between client-side and server-side predicates.
- **(c)** Trigger a refetch of `openTrades` via SmartNgRX after the update settles. Heavy
  and adds a network round-trip per edit; unlikely to be the right answer.

The investigation must **confirm or refute** this hypothesis with reproduction evidence
and direct code reading, then write the Story 104.2 recommendation accordingly. Do not
assume — verify.

### Reproduction tooling

- Playwright MCP server is the required reproduction tool (per epic AC1). Capture
  screenshots and HTTP request/response snapshots verbatim — do not paraphrase.
- For inspecting the SmartArray contents at runtime, the cleanest approach is a
  short-lived `evaluate` via Playwright MCP that reads
  `window.ng.getComponent($0)` style probes, or a temporary `console.log` in
  `selectOpenPositions` that you must revert before finishing the story. **Do not commit
  any temporary debug code.**

### Testing standards

- **No new tests in this story** — Story 104.3 owns the regression E2E test. This story
  only reads code and the running app; no production source files or test files are
  modified.
- `pnpm all` (lint + format + unit + build, per repo convention) must pass at the end.
  This is mostly a no-op gate for an investigation story but proves nothing was
  inadvertently modified.

### Project Structure Notes

- Open Positions UI lives under `apps/dms-material/src/app/account-panel/open-positions/`.
- Trade store / effects / definitions live under `apps/dms-material/src/app/store/trades/`.
- Server trade routes live under `apps/server/src/app/routes/trades/` with sibling
  subroutes `get-open-trades/` and `get-closed-trades/`.
- Project conventions (Angular 21 zoneless, signal-first, `OnPush`, SmartNgRX/SmartSignals
  for entity caching) per [_bmad-output/project-context.md](../project-context.md). The
  existing handlers already follow these conventions.

### Related Prior Work

- **Story 95.2** — removed the universe-map lookup in `transformTradeToPosition`; relevant
  because it shapes how `selectOpenPositions` reads trade fields today.
- **Story 99.x / 97.x** — Open Positions field plumbing (last price, computed fields).
  Same screen, adjacent code; review the diffs to understand current state machinery.
- **Story 100.x** — Universe row delete bug (different screen, similar "row doesn't
  disappear after mutation" symptom). Worth a quick read for any pattern reuse.

### References

- Epic source: [_bmad-output/planning-artifacts/epics-2026-05-13.md](../planning-artifacts/epics-2026-05-13.md) — Story 104.1 section
- Project context: [_bmad-output/project-context.md](../project-context.md)
- Open Positions component: [apps/dms-material/src/app/account-panel/open-positions/open-positions.component.ts](../../apps/dms-material/src/app/account-panel/open-positions/open-positions.component.ts)
- Open Positions service: [apps/dms-material/src/app/account-panel/open-positions/open-positions-component.service.ts](../../apps/dms-material/src/app/account-panel/open-positions/open-positions-component.service.ts)
- Trade effect service: [apps/dms-material/src/app/store/trades/trade-effect.service.ts](../../apps/dms-material/src/app/store/trades/trade-effect.service.ts)
- Open trades definition: [apps/dms-material/src/app/store/trades/open-trades-definition.const.ts](../../apps/dms-material/src/app/store/trades/open-trades-definition.const.ts)
- Sold trades definition: [apps/dms-material/src/app/store/trades/sold-trades-definition.const.ts](../../apps/dms-material/src/app/store/trades/sold-trades-definition.const.ts)
- Server trade routes (PUT/POST/DELETE + `mapTradeToResponse`): [apps/server/src/app/routes/trades/index.ts](../../apps/server/src/app/routes/trades/index.ts)
- Server `/api/trades/open` (server-side filter): [apps/server/src/app/routes/trades/get-open-trades/index.ts](../../apps/server/src/app/routes/trades/get-open-trades/index.ts)

## Dev Agent Record

### Agent Model Used

(to be filled in by the dev agent)

### Debug Log References

### Completion Notes List

### File List
