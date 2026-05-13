# Story 104.2: Fix Immediate Removal of Closed Positions From Open Positions List

Status: Approved

**Story Key:** `104-2-fix-close-position-removes-from-open-positions`
**Epic:** 104 — Closing a Position Removes It from Open Positions Immediately
**Source:** [_bmad-output/planning-artifacts/epics-2026-05-13.md](../planning-artifacts/epics-2026-05-13.md) (Story 104.2)
**Type:** Bug fix (production code change in the layer identified by Story 104.1)
**Depends on:** Story 104.1 — diagnosis must be complete and the "Failing Layer" /
"Recommendation for Story 104.2" subsections must be filled in.
**Enables:** Story 104.3 — Playwright E2E regression test for immediate-removal.

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As Dave,
I want a position to disappear from the Open Positions list as soon as I save its
`Mst Rcnt Sll Dt` and a positive `Mst Rcnt Sell $`,
So that I don't have to refresh the page to see an accurate view of what's still open.

## Epic Context

**Epic 104 Goal:** When Dave closes a position on the Open Positions screen by entering a
`Mst Rcnt Sll Dt` and a positive `Mst Rcnt Sell $` and saving, the row should disappear
from the Open Positions list within one rendered frame. Today it stays visible until the
page is hard-refreshed.

This story (104.2) is the **fix** story. It applies the smallest viable change in the
layer identified by Story 104.1's diagnosis, with these hard constraints:

1. Server-side persistence behaviour is **unchanged** from today (R4).
2. Sold Positions screen still shows the now-closed row with its sell date and sell price.
3. Open Positions sort / filter / scroll / edit (other fields) / add must not regress
   (NFR6).
4. The fix is verified by a Playwright MCP repro of the original bug — it must no longer
   reproduce.

The actual regression-pinning E2E test ships in Story 104.3.

## Acceptance Criteria

1. **AC1 — Closed position disappears from Open Positions immediately on save.**
   **Given** an open position visible on the Open Positions screen,
   **When** Dave sets `Mst Rcnt Sll Dt` to a date and `Mst Rcnt Sell $` to a positive
   value and saves (commits the edits via the same blur/Enter interaction the
   investigation in 104.1 confirmed triggers the save),
   **Then** the row is removed from the Open Positions list within one rendered frame
   after the save resolves — no manual refresh required.

2. **AC2 — Closed position appears on Sold Positions (no regression).**
   **Given** the same closed position,
   **When** Dave navigates to the Sold Positions screen (or tab),
   **Then** the row appears there with its `sell_date` and `sell` populated (R4 — no
   regression to today's Sold Positions behaviour).

3. **AC3 — Server-side persistence is unchanged.**
   **Given** the underlying server data,
   **When** the developer queries the database directly after the save,
   **Then** the trade row has exactly the `sell_date` and `sell` Dave entered and **no
   other field has changed** (R4 — server behaviour is identical to pre-fix).

4. **AC4 — The original bug no longer reproduces under Playwright MCP.**
   **Given** the fix is applied and the dev stack is running,
   **When** the Playwright MCP server repeats the exact reproduction steps recorded in
   Story 104.1 Dev Notes (set sell date, set positive sell price, save, observe list),
   **Then** the row is absent from the Open Positions list immediately after the save —
   not after a page refresh — and screenshots in this story's Dev Notes confirm it.

5. **AC5 — No regression to Open Positions sort / filter / scroll / edit / add (NFR6).**
   **Given** the fix is applied,
   **When** Dave exercises (a) symbol filter (search box), (b) any sortable column
   header, (c) virtual-scroll through more than 50 rows, (d) editing other editable
   fields (`buy`, `buy_date`, `quantity`, `sell` alone with no `sell_date`,
   `sell_date` alone with no positive `sell`, etc.), and (e) add new position via
   the Add modal,
   **Then** all five flows behave exactly as they did before the fix — no rows
   disappear that shouldn't, no rows linger that shouldn't, no console errors.

6. **AC6 — Partial-close edits do NOT remove the row from Open Positions.**
   **Given** an open position,
   **When** Dave edits **only** `sell_date` (leaving `sell == 0`) **or** edits **only**
   `sell` to a positive value (leaving `sell_date` empty/null),
   **Then** the row stays visible on Open Positions — the row is only removed when the
   trade satisfies the "closed" predicate (both `sell_date` set **and** `sell > 0`),
   matching the server-side `/api/trades/open` filter semantics that Story 104.1
   documented.

7. **AC7 — Quality gate.**
   **Given** the fix is applied,
   **When** `pnpm all` runs,
   **Then** all tests pass — including the existing Open Positions unit tests and
   any unit test added in this story (see Tasks).

## Tasks / Subtasks

> ⚠️ **Read Story 104.1 Dev Notes BEFORE starting.** Specifically the "Failing Layer"
> and "Recommendation for Story 104.2" subsections — they identify the exact layer to
> change and the exact files to touch. The hypothesis below is the **default fix path**
> if 104.1 confirmed it; if 104.1 identified a different layer (server response
> wrong-shaped, store entity not updated, etc.), follow 104.1's recommendation instead.

- [ ] **Task 0 — Re-read Story 104.1 and confirm the fix shape** (gates Tasks 1–7)
  - [ ] Open [104-1-investigate-close-position-not-removed.md](./104-1-investigate-close-position-not-removed.md)
        and read the "Failing Layer" and "Recommendation for Story 104.2" subsections
        in Dev Notes.
  - [ ] If 104.1's recommendation differs from the default hypothesis below, **follow
        104.1**. Update this story's Tasks 1–6 to match the recommended fix shape and
        the recommended file list before coding.
  - [ ] Note the Story 104.1 Status: it should be `done` (or at minimum `review`) before
        this story is implemented. If 104.1 is not yet complete, **stop** and finish
        104.1 first.

- [ ] **Task 1 — Implement the fix in the identified layer** (AC: #1, #6)
  - [ ] **Default path (per 104.1 strong-candidate hypothesis option (a)):** in
        [open-positions.component.ts](../../apps/dms-material/src/app/account-panel/open-positions/open-positions.component.ts),
        update `onSellChange` and `onSellDateChange` so that **after** the proxy
        mutation that sets `trade.sell` / `trade.sell_date`, the handler checks the
        post-mutation state of `trade` and — if the trade is now "closed" per the
        same predicate the server uses (`sell_date` is a non-empty string **and**
        `sell > 0`) — removes the trade from the `openTrades` SmartArray via the
        `RowProxyDelete` pattern already used by `deleteOpenPosition` in
        [open-positions-component.service.ts](../../apps/dms-material/src/app/account-panel/open-positions/open-positions-component.service.ts)
        (lines ~60–72: cast each entry to `RowProxyDelete & Trade` and call
        `trade.delete!()`).
  - [ ] Encapsulate the "is this trade now closed?" predicate in a small named function
        (e.g. `isTradeClosed(trade)`) co-located with the component or in
        `position-validators.ts`, so the rule is single-sourced and testable. The
        predicate must match the server's `/api/trades/open` `where: { sell_date: null }`
        semantics: a trade is "closed" if **both** (a) `sell_date` is a non-empty,
        non-undefined string and (b) `sell` is a finite number > 0. Treat a trade with
        only one of those set as still **open** (AC6).
  - [ ] If 104.1 recommended option (b) — make `selectOpenPositions` a `computed`
        filter — implement the filter in
        [open-positions-component.service.ts](../../apps/dms-material/src/app/account-panel/open-positions/open-positions-component.service.ts)
        instead, using the same `isTradeClosed` predicate, **and** keep the index-based
        loop / placeholder-row handling intact (do not break the in-flight loading
        ellipsis behaviour from Story 87.2 — see lines ~74–96).
  - [ ] If 104.1 recommended option (c) — refetch — wire the refetch via the
        SmartNgRX/SmartSignals API only after the `update` effect resolves; do not
        block the UI on the round-trip.

- [ ] **Task 2 — Preserve server-side persistence behaviour** (AC: #3)
  - [ ] Do **not** modify any file under
        [apps/server/src/app/routes/trades/](../../apps/server/src/app/routes/trades/) —
        the server already persists `sell_date` and `sell` correctly (per Story 104.1
        Task 3) and this story explicitly forbids server changes.
  - [ ] If 104.1 found that the server response is the broken layer (option AC5(iii)
        in 104.1), this story's scope expands minimally to fix the response shape in
        `handleUpdateTradeRoute` / `mapTradeToResponse` — but only so the response
        carries the updated `sell_date` and `sell`. **Do not** change the persistence
        SQL or change which fields the route accepts.

- [ ] **Task 3 — Verify Sold Positions still receives the closed row** (AC: #2)
  - [ ] After the fix, use Playwright MCP to navigate to the Sold Positions screen
        for the same account and confirm the now-closed row appears with its sell
        date and sell price. Capture a screenshot for Dev Notes.
  - [ ] Confirm the Sold Positions list rebuilds correctly on first navigation —
        the existing `/api/trades/closed` (or equivalent) fetch should pick up the
        row because the server has persisted it. Do **not** add a client-side
        "push closed trade into sold list" workaround unless 104.1 explicitly
        identified Sold Positions as also broken.

- [ ] **Task 4 — Regression sweep on Open Positions** (AC: #5, #6)
  - [ ] Via Playwright MCP, exercise on the Open Positions screen:
        (a) symbol search filter; (b) sort by Symbol, Buy Date, Unrlz Gain %, Unrlz
        Gain $, Sell Date; (c) virtual-scroll past row 50 (`visibleRange` widening);
        (d) edit `buy`, `buy_date`, `quantity`, `sell` with no `sell_date`,
        `sell_date` with no `sell` — confirm none of these cause the row to vanish
        (AC6); (e) the Add Position modal flow.
  - [ ] Capture before/after screenshots or row-count assertions in Dev Notes for
        each flow.

- [ ] **Task 5 — Add a unit test for the close-detection predicate** (AC: #1, #6)
  - [ ] Add a Vitest unit test next to wherever `isTradeClosed` lives that covers:
        (i) `sell_date` set + `sell > 0` → closed; (ii) `sell_date` set + `sell == 0`
        → open; (iii) `sell_date` undefined/empty/null + `sell > 0` → open; (iv) both
        absent → open; (v) `sell_date` set + `sell` negative → open (defensive — the
        UI validators reject negative, but the predicate must too).
  - [ ] Do **not** add an Angular component test that drives the SmartArray here —
        that's handled by the Story 104.3 Playwright E2E test. Component-level unit
        coverage in this story is limited to the predicate.

- [ ] **Task 6 — Quality gate** (AC: #7)
  - [ ] Run `pnpm all` and confirm green. Record the result and timestamp in Dev
        Notes.
  - [ ] Run `pnpm e2e:dms-material:chromium` (and `:firefox`) **only if** existing
        Open Positions e2e specs touch the affected handlers — otherwise wait for
        Story 104.3 to add explicit coverage. Record decision in Dev Notes.

- [ ] **Task 7 — Repro the original bug post-fix** (AC: #4)
  - [ ] Replay Story 104.1's Playwright MCP reproduction script verbatim against the
        fixed build. Capture screenshots: row before save, row immediately after save
        (must be **gone** without refresh), Sold Positions tab showing the row.
  - [ ] Paste the screenshot references and a one-line "bug no longer reproduces"
        confirmation into Dev Notes.

## Dev Notes

### Architecture & Code Pointers

> Verified at story-creation time by reading the files. Re-confirm during
> implementation — Story 104.1 may have added evidence that overrides any of these.

#### Layer being fixed (default path — option (a) from 104.1's hypothesis)

- **Component:** [apps/dms-material/src/app/account-panel/open-positions/open-positions.component.ts](../../apps/dms-material/src/app/account-panel/open-positions/open-positions.component.ts)
  - `onSellChange(position, newValue)` (lines ~196–205): sets `trade.sell = newValue`
    via SmartArray proxy mutation.
  - `onSellDateChange(position, newDate)` (lines ~207–228): sets
    `trade.sell_date = dateString` (or `undefined` if cleared) via SmartArray proxy
    mutation.
  - `findTradeById(positionId)` (lines ~237–245): existing helper that returns the
    `Trade` from the SmartArray by id — reuse for the post-mutation close check.
- **Pattern to mirror for the SmartArray delete:**
  [open-positions-component.service.ts](../../apps/dms-material/src/app/account-panel/open-positions/open-positions-component.service.ts)
  `deleteOpenPosition(position)` (lines ~58–71):
  ```ts
  const trades = currentAccount().openTrades as Trade[];
  const tradesArray = trades as SmartArray<Account, Trade> & Trade[];
  for (let i = 0; i < tradesArray.length; i++) {
    const trade = tradesArray[i] as RowProxyDelete & Trade;
    if (trade.id === position.id) {
      trade.delete!();
      break;
    }
  }
  ```
  This is the exact SmartArray entry-removal idiom and is already in use in this
  feature, so it does not introduce a new pattern.

#### Why option (a) is the default (re-read 104.1 to confirm)

`selectOpenPositions` in
[open-positions-component.service.ts](../../apps/dms-material/src/app/account-panel/open-positions/open-positions-component.service.ts)
(lines ~74–96) is a `computed` that maps `currentAccount().openTrades` 1:1 through
`transformTradeToPosition` — there is **no** filter for `sell_date == null && sell == 0`
on the client. The server-side `/api/trades/open` endpoint applies
`where: { sell_date: null }`
([apps/server/src/app/routes/trades/get-open-trades/index.ts](../../apps/server/src/app/routes/trades/get-open-trades/index.ts)),
so on hard refresh the closed row is excluded from the bootstrap fetch and the row
disappears.

The proxy mutation in `onSellChange` / `onSellDateChange` updates the trade's fields in
place but the trade is still a member of the `openTrades` SmartArray. Hence `computed`
re-emits the same number of rows, just with the now-closed row's `sellDate` / `sell`
populated, so the row stays visible. Removing the trade from `openTrades` via
`RowProxyDelete.delete()` makes the SmartArray drop it locally; the server already has
the correct state, so a subsequent navigate-to-Sold-Positions hits the server's
`/api/trades/closed` view and the row appears there.

#### HTTP save (do not change)

- **Service:** [apps/dms-material/src/app/store/trades/trade-effect.service.ts](../../apps/dms-material/src/app/store/trades/trade-effect.service.ts)
  `update(newRow: Trade)` → `this.http.put<Trade[]>('./api/trades', newRow)`.
- **Server handler:** [apps/server/src/app/routes/trades/index.ts](../../apps/server/src/app/routes/trades/index.ts)
  `handleUpdateTradeRoute` (PUT `/`) — persists `sell_date` and `sell` and returns
  `Trade[]` via `mapTradeToResponse`. Story 104.1 Task 3 confirms this works.

#### Stores (do not change unless 104.1 says so)

- [apps/dms-material/src/app/store/trades/open-trades-definition.const.ts](../../apps/dms-material/src/app/store/trades/open-trades-definition.const.ts)
- [apps/dms-material/src/app/store/trades/sold-trades-definition.const.ts](../../apps/dms-material/src/app/store/trades/sold-trades-definition.const.ts)
  Both share `tradeEffectsServiceToken`. Removing a trade from `openTrades` via
  `RowProxyDelete.delete()` does **not** call the server `DELETE /api/trades/:id` —
  it only drops the entry from the local SmartArray. (`SmartArray` row delete vs
  `EffectService.delete()` are distinct concerns — confirm during implementation by
  reading the SmartSignals docs / source if there is any doubt.)

  > ⚠️ **Risk to verify:** if `RowProxyDelete.delete()` on a row that has just been
  > mutated **does** trigger a backend `DELETE /api/trades/:id`, this fix will
  > destructively delete the trade from the database — the exact opposite of the
  > intent. Story 104.1's investigation should clarify the SmartArray semantics; if
  > 104.1 did not, the dev agent must verify this behaviour (read the `@smarttools/
  > smart-signals` source or run a one-off probe in a non-shared local DB) **before**
  > shipping. If `RowProxyDelete.delete()` does fire a backend delete, switch to
  > option (b) — `selectOpenPositions` `computed` filter — instead.

#### "Closed" predicate

The single source of truth must match the server's `where: { sell_date: null }`
semantics, with one extension: the spec / epic also requires `sell > 0` (positive
sell price). Recommended shape:

```ts
function isTradeClosed(trade: Pick<Trade, 'sell_date' | 'sell'>): boolean {
  const hasSellDate =
    typeof trade.sell_date === 'string' && trade.sell_date.trim() !== '';
  const hasPositiveSell =
    typeof trade.sell === 'number' && Number.isFinite(trade.sell) && trade.sell > 0;
  return hasSellDate && hasPositiveSell;
}
```

Place this near `isPositive` / `isValidDate` /  `isValidNumber` in
[position-validators.ts](../../apps/dms-material/src/app/account-panel/open-positions/position-validators.ts)
so the existing validator file is the home for this kind of rule. Confirm the file
exists and follows the same export style before placing.

### Post-Mutation Hook Sketch (option (a))

For both `onSellChange` and `onSellDateChange`, after the existing mutation:

```ts
if (isTradeClosed(trade)) {
  // Drop from local openTrades SmartArray; server already persists the close.
  // SmartNgRX still fires update(newRow) for the proxy mutation, so the server
  // gets the new sell_date/sell — we only stop showing it here.
  this.openPositionsService.removeOpenTradeLocally(trade.id);
}
```

…where `removeOpenTradeLocally(tradeId: string)` is a small method on
`OpenPositionsComponentService` that mirrors `deleteOpenPosition` but takes a raw id
(not an `OpenPosition`) and **does not** show a confirm dialog. Reuse the SmartArray
delete idiom from `deleteOpenPosition`. Add JSDoc that explicitly states "removes the
local SmartArray entry only — does NOT call DELETE /api/trades/:id".

### Constraints (hard)

- Do not modify
  [apps/server/src/app/routes/trades/](../../apps/server/src/app/routes/trades/)
  unless Story 104.1 explicitly identified the server response as the broken layer.
- Do not modify the Sold Positions screen or its store wiring.
- Do not introduce a refetch of `openTrades` per save (option (c)) unless 104.1
  recommended it — it adds a network round-trip per edit and is unlikely to be the
  right answer.
- Do not change `findTradeById` semantics, the existing `EditableCell` /
  `EditableDateCell` contracts, or the `BaseTableComponent` virtual-scroll API.
- Do not change `transformTradeToPosition`'s output shape — Story 104.3 will assert
  on row presence/absence, not on cell content shape.
- Do not commit any temporary `console.log` or Playwright probe code (same rule as
  104.1).

### Testing Standards

- **Unit tests (Vitest):** required for `isTradeClosed` (Task 5). Co-locate the test
  with the predicate (`position-validators.spec.ts` if you add it there).
- **No new component test in this story** — Story 104.3 covers the end-to-end
  immediate-removal behaviour with Playwright. Adding a brittle component test that
  mocks the SmartArray here would duplicate that coverage.
- **`pnpm all` must pass** before this story is moved to review. This is the
  project's quality gate; see
  [_bmad-output/project-context.md](../project-context.md) for the full convention.
- **Do not skip or `xit` any tests** to make `pnpm all` pass.
  `scripts/check-no-skipped-tests.sh` runs as part of the gate.

### Project Structure Notes

- Open Positions UI: `apps/dms-material/src/app/account-panel/open-positions/`.
- Trade store / effects / definitions:
  `apps/dms-material/src/app/store/trades/`.
- Server trade routes: `apps/server/src/app/routes/trades/` with sibling subroutes
  `get-open-trades/` and `get-closed-trades/`.
- Conventions (Angular 21 zoneless, signal-first, `OnPush`, SmartNgRX/SmartSignals
  for entity caching) per
  [_bmad-output/project-context.md](../project-context.md). Code already follows
  these — match the existing style.

### Previous Story Intelligence (from 104.1)

- **Reproduction tooling:** Playwright MCP server is the required reproduction
  tool. The exact reproduction script and screenshots will be in 104.1 Dev Notes —
  reuse them verbatim for AC4 and Task 7.
- **HTTP save shape:** `PUT /api/trades` with `Trade` body, returns `Trade[]`. 104.1
  will have captured the exact request/response — re-read it before changing the
  client-side handlers so you don't accidentally rely on a field that isn't
  populated.
- **Server persistence:** verified to write `sell_date` and `sell` correctly when
  the request body contains them (104.1 Task 3). The Prisma `sell_date: ... :
  undefined` quirk (undefined means "do not update") is **not** a blocker for this
  fix because the client always sends a defined `sell_date` when closing.
- **Open vs closed predicate lives server-side** (`/api/trades/open` filters
  `sell_date: null`); the client-side list does not filter. This is the root cause
  the fix addresses.
- **Strong-candidate hypothesis to confirm:** option (a) — local SmartArray remove
  on close. 104.1's recommendation overrides this if it differs.

### Related Prior Work

- **Story 104.1** ([104-1-investigate-close-position-not-removed.md](./104-1-investigate-close-position-not-removed.md))
  — diagnosis, code pointers, hypothesis. **Required reading.**
- **Story 95.2** — removed universe-map lookup in `transformTradeToPosition`;
  shapes how `selectOpenPositions` reads trade fields today.
- **Story 87.2** — placeholder symbol changed to `\u2026` for in-flight loading
  rows; `selectOpenPositions`'s placeholder branch must remain intact (don't
  accidentally filter placeholders out of view if you change the computed shape).
- **Story 100.x** — Universe row delete bug (different screen, same "row doesn't
  disappear after mutation" symptom). Worth a quick read for any pattern reuse.

### References

- Epic source: [_bmad-output/planning-artifacts/epics-2026-05-13.md](../planning-artifacts/epics-2026-05-13.md) — Story 104.2 section
- Previous story: [104-1-investigate-close-position-not-removed.md](./104-1-investigate-close-position-not-removed.md)
- Project context: [_bmad-output/project-context.md](../project-context.md)
- Open Positions component: [apps/dms-material/src/app/account-panel/open-positions/open-positions.component.ts](../../apps/dms-material/src/app/account-panel/open-positions/open-positions.component.ts)
- Open Positions service: [apps/dms-material/src/app/account-panel/open-positions/open-positions-component.service.ts](../../apps/dms-material/src/app/account-panel/open-positions/open-positions-component.service.ts)
- Position validators: [apps/dms-material/src/app/account-panel/open-positions/position-validators.ts](../../apps/dms-material/src/app/account-panel/open-positions/position-validators.ts)
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
