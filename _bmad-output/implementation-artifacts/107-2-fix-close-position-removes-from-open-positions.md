# Story 107.2: Fix Immediate Removal of Closed Positions From Open Positions List

Status: Approved

**Story Key:** `107-2-fix-close-position-removes-from-open-positions`
**Epic:** 107 — Close Position Should Immediately Remove from Open Positions List
**Source:** [_bmad-output/planning-artifacts/epics-2026-05-19.md](../planning-artifacts/epics-2026-05-19.md) (Story 107.2)
**Type:** Bug fix (production code change in the layer identified by Story 107.1)
**Depends on:** Story 107.1 — diagnosis must be complete and the "Failing Layer" /
"Recommendation for Story 107.2" subsections in 107.1 Dev Notes must be filled in.
**Enables:** Story 107.3 — Playwright E2E regression test for immediate-removal.

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As Dave,
I want a position to disappear from the Open Positions list as soon as I save its
`Mst Rcnt Sll Dt` and a positive `Mst Rcnt Sell $`,
So that I don't have to refresh the page to see an accurate view of what's still open.

## Epic Context

**Epic 107 Goal:** When Dave closes a position on the Open Positions screen by entering a
`Mst Rcnt Sll Dt` and a positive `Mst Rcnt Sell $` and saving, the row should disappear
from the Open Positions list within one rendered frame. Today it stays visible until the
page is hard-refreshed.

This story (107.2) is the **fix** story. It applies the smallest viable change in the
layer identified by Story 107.1's diagnosis, with these hard constraints:

1. Server-side persistence behaviour is **unchanged** from today (R6).
2. Sold Positions screen still shows the now-closed row with its sell date and sell
   price (R5).
3. Open Positions sort / filter / scroll / edit (other fields) / add must not regress
   (NFR6).
4. The fix is verified by a Playwright MCP repro of the original bug — it must no longer
   reproduce.

The actual regression-pinning E2E test ships in Story 107.3.

### Why Epic 107 exists at all (the Epic 104 gap)

**Epic 104 already shipped a fix for this exact symptom and it did not resolve the
bug.** Story 107.1 must explicitly identify why — whether (a) Epic 104's fix shipped
but addressed the wrong layer, (b) Epic 104's fix shipped to the right layer but is
defeated by an upstream signal (e.g. SmartNgRX entity refresh re-inserts the closed
row), (c) Epic 104's fix was reverted, or (d) Epic 104 misdiagnosed and the actual
broken layer is somewhere else (server response shape, store entity update, selector
reactivity, missing refetch). The bug report explicitly suggests
`handleSocketNotification('top', 'update', ['1']);` as a possible fix surface —
**107.1 must evaluate whether that is the right surface and 107.2 must follow 107.1's
recommendation rather than blindly repeating Epic 104's `RowProxyDelete.delete()`
approach.**

## Acceptance Criteria

1. **AC1 — Closed position disappears from Open Positions immediately on save.**
   **Given** an open position visible on the Open Positions screen,
   **When** Dave sets `Mst Rcnt Sll Dt` to a date and `Mst Rcnt Sell $` to a positive
   value and saves (commits the edits via the same blur/Enter interaction the
   investigation in 107.1 confirmed triggers the save),
   **Then** the row is removed from the Open Positions list within one rendered frame
   after the save resolves — no manual refresh required (R4).

2. **AC2 — Closed position appears on Sold Positions (no regression).**
   **Given** the same closed position,
   **When** Dave navigates to the Sold Positions screen (or tab),
   **Then** the row appears there with its `sell_date` and `sell` populated (R5 — no
   regression to today's Sold Positions behaviour).

3. **AC3 — Server-side persistence is unchanged.**
   **Given** the underlying server data,
   **When** the developer queries the database directly after the save,
   **Then** the trade row has exactly the `sell_date` and `sell` Dave entered and **no
   other field has changed** (R6 — server behaviour is identical to pre-fix).

4. **AC4 — The original bug no longer reproduces under Playwright MCP.**
   **Given** the fix is applied and the dev stack is running,
   **When** the Playwright MCP server repeats the exact reproduction steps recorded in
   Story 107.1 Dev Notes (set sell date, set positive sell price, save, observe list),
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
   matching the server-side `/api/trades/open` filter semantics that Story 107.1
   documented.

7. **AC7 — Quality gate.**
   **Given** the fix is applied,
   **When** `pnpm all` runs,
   **Then** all tests pass — including the existing Open Positions unit tests and
   any unit test added in this story (see Tasks).

## Tasks / Subtasks

> ⚠️ **Read Story 107.1 Dev Notes BEFORE starting.** Specifically the "Failing Layer"
> and "Recommendation for Story 107.2" subsections — they identify the exact layer to
> change and the exact files to touch. **Do not assume Epic 104's approach is still
> correct** — Epic 104 shipped and the bug still reproduces, so the default hypothesis
> below is provisional.

- [ ] **Task 0 — Re-read Story 107.1 and confirm the fix shape** (gates Tasks 1–7)
  - [ ] Open [107-1-investigate-close-position-not-removed.md](./107-1-investigate-close-position-not-removed.md)
        and read the "Failing Layer" and "Recommendation for Story 107.2" subsections
        in Dev Notes.
  - [ ] Read 107.1's analysis of **what Epic 104 actually changed** (which file, which
        function, what the `RowProxyDelete.delete()` call did or didn't do) and **why
        that change does not resolve the bug today**.
  - [ ] If 107.1's recommendation differs from any of the hypothesis paths listed
        below, **follow 107.1**. Update this story's Tasks 1–6 to match the recommended
        fix shape and the recommended file list before coding.
  - [ ] Note the Story 107.1 Status: it should be `done` (or at minimum `review`) before
        this story is implemented. If 107.1 is not yet complete, **stop** and finish
        107.1 first.
  - [ ] If 107.1 recommended the `handleSocketNotification('top', 'update', ['1']);`
        path suggested by the bug report, read 107.1's notes on **what that call does
        today**, **where it lives**, **what arguments it expects**, and **whether
        calling it from the save handler triggers an entity refresh that re-applies
        the server's open/closed filter** — do not just paste the snippet from the bug
        report into the save handler without understanding it.

- [ ] **Task 1 — Implement the fix in the layer 107.1 identifies** (AC: #1, #6)

  The hypotheses below are **alternatives**, not a menu to combine. Pick the one
  107.1 explicitly recommends. Do not implement more than one.

  - [ ] **Hypothesis (a) — Local SmartArray remove (the Epic 104 path):** in
        [open-positions.component.ts](../../apps/dms-material/src/app/account-panel/open-positions/open-positions.component.ts),
        update `onSellChange` and `onSellDateChange` so that **after** the proxy
        mutation that sets `trade.sell` / `trade.sell_date`, the handler checks the
        post-mutation state of `trade` and — if the trade is now "closed" per the
        predicate (`sell_date` non-empty string **and** `sell > 0`) — removes the
        trade from the `openTrades` SmartArray via the `RowProxyDelete` pattern
        already used by `deleteOpenPosition` in
        [open-positions-component.service.ts](../../apps/dms-material/src/app/account-panel/open-positions/open-positions-component.service.ts).
        **Only choose this path if 107.1 establishes that Epic 104 never actually
        shipped this code, or shipped it incorrectly** — otherwise repeating Epic
        104 will repeat Epic 104's failure.

  - [ ] **Hypothesis (b) — `computed` filter on `selectOpenPositions`:** implement a
        client-side filter in
        [open-positions-component.service.ts](../../apps/dms-material/src/app/account-panel/open-positions/open-positions-component.service.ts)'s
        `selectOpenPositions` `computed` using the same `isTradeClosed` predicate,
        **and** keep the index-based loop / placeholder-row handling intact (do not
        break the in-flight loading ellipsis behaviour from Story 87.2). Choose this
        path if 107.1 establishes that local SmartArray remove fights the
        SmartNgRX/SmartSignals entity refresh layer.

  - [ ] **Hypothesis (c) — SmartNgRX socket-notification surface (the bug report
        suggestion):** wire the close detection to fire
        `handleSocketNotification('top', 'update', ['1']);` (or its real signature —
        confirm in 107.1) after the save resolves, so the store re-applies the
        server's open/closed split. Choose this path if 107.1 establishes that the
        store is the right reactivity surface and that the socket notification
        triggers the open-trades refetch the screen needs.

  - [ ] **Hypothesis (d) — Refetch `openTrades` after save:** wire the refetch via
        the SmartNgRX/SmartSignals API only after the `update` effect resolves; do not
        block the UI on the round-trip. Choose this path only if 107.1 rules out
        (a)–(c) — it adds a network round-trip per edit.

  - [ ] Encapsulate the "is this trade now closed?" predicate in a small named
        function (e.g. `isTradeClosed(trade)`) co-located with the component or in
        `position-validators.ts`, so the rule is single-sourced and testable. The
        predicate must match the server's `/api/trades/open` `where: { sell_date: null }`
        semantics, extended to also require `sell > 0`: a trade is "closed" if
        **both** (i) `sell_date` is a non-empty, non-undefined string and (ii) `sell`
        is a finite number > 0. Treat a trade with only one of those set as still
        **open** (AC6). If Epic 104 already added this predicate, **reuse it
        verbatim** — do not duplicate. 107.1 should have noted whether it exists.

- [ ] **Task 2 — Preserve server-side persistence behaviour** (AC: #3)
  - [ ] Do **not** modify any file under
        [apps/server/src/app/routes/trades/](../../apps/server/src/app/routes/trades/) —
        the server already persists `sell_date` and `sell` correctly and this story
        explicitly forbids server changes (R6 forbids any change to server data
        produced by the fix).
  - [ ] If 107.1 found that the server response is the broken layer, this story's
        scope expands minimally to fix the response shape in `handleUpdateTradeRoute`
        / `mapTradeToResponse` — but only so the response carries the updated
        `sell_date` and `sell`. **Do not** change the persistence SQL or change which
        fields the route accepts.

- [ ] **Task 3 — Verify Sold Positions still receives the closed row** (AC: #2)
  - [ ] After the fix, use Playwright MCP to navigate to the Sold Positions screen
        for the same account and confirm the now-closed row appears with its sell
        date and sell price. Capture a screenshot for Dev Notes.
  - [ ] Confirm the Sold Positions list rebuilds correctly on first navigation —
        the existing `/api/trades/closed` (or equivalent) fetch should pick up the
        row because the server has persisted it. Do **not** add a client-side
        "push closed trade into sold list" workaround unless 107.1 explicitly
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
  - [ ] If Epic 104 already added this test, confirm it still covers all five cases
        and add any missing cases rather than duplicating the file.
  - [ ] Do **not** add an Angular component test that drives the SmartArray here —
        that's handled by the Story 107.3 Playwright E2E test. Component-level unit
        coverage in this story is limited to the predicate.

- [ ] **Task 6 — Quality gate** (AC: #7)
  - [ ] Run `pnpm all` and confirm green. Record the result and timestamp in Dev
        Notes.
  - [ ] Run `pnpm e2e:dms-material:chromium` (and `:firefox`) **only if** existing
        Open Positions e2e specs touch the affected handlers — otherwise wait for
        Story 107.3 to add explicit coverage. Record decision in Dev Notes.

- [ ] **Task 7 — Repro the original bug post-fix** (AC: #4)
  - [ ] Replay Story 107.1's Playwright MCP reproduction script verbatim against the
        fixed build. Capture screenshots: row before save, row immediately after save
        (must be **gone** without refresh), Sold Positions tab showing the row.
  - [ ] Paste the screenshot references and a one-line "bug no longer reproduces"
        confirmation into Dev Notes.

## Dev Notes

### Architecture & Code Pointers

> Verified at story-creation time by reading the files. Re-confirm during
> implementation — Story 107.1 may have added evidence that overrides any of these,
> especially around what Epic 104 actually shipped.

#### What Epic 104 left behind (re-read 107.1 to confirm)

Epic 104 ([_bmad-output/planning-artifacts/epics-2026-05-13.md](../planning-artifacts/epics-2026-05-13.md))
attempted hypothesis (a) — the local SmartArray remove path. Its implementation lives
in (or was supposed to live in) the same handlers this story will touch
(`onSellChange` / `onSellDateChange` in `open-positions.component.ts`, with a
`removeOpenTradeLocally` helper on `OpenPositionsComponentService`). **107.1 must
report the actual current state of this code** before this story modifies it:

- Is the post-mutation `isTradeClosed` check present? If so, in which handler(s)?
- Does the `RowProxyDelete.delete()` call actually fire? If so, does it remove the
  entry from the SmartArray, or does SmartNgRX re-insert it on the next entity
  refresh?
- Was `isTradeClosed` added to `position-validators.ts`? Does it match the spec
  (both `sell_date` non-empty **and** `sell > 0`)?

If Epic 104's code is present but ineffective, the fix is **not** "do hypothesis (a)
again" — it is to identify the upstream signal that defeats it (likely an entity
refresh from SmartNgRX) and either suppress that signal for the closed row, switch to
hypothesis (b) (`computed` filter, which is resilient to entity refresh), or use
hypothesis (c) (socket notification to trigger the server's open/closed split).

#### Likely layers being fixed (default pointers)

- **Component:** [apps/dms-material/src/app/account-panel/open-positions/open-positions.component.ts](../../apps/dms-material/src/app/account-panel/open-positions/open-positions.component.ts)
  - `onSellChange(position, newValue)`: sets `trade.sell = newValue`
    via SmartArray proxy mutation.
  - `onSellDateChange(position, newDate)`: sets
    `trade.sell_date = dateString` (or `undefined` if cleared) via SmartArray proxy
    mutation.
  - `findTradeById(positionId)`: existing helper that returns the
    `Trade` from the SmartArray by id — reuse for the post-mutation close check.
- **Service:** [open-positions-component.service.ts](../../apps/dms-material/src/app/account-panel/open-positions/open-positions-component.service.ts)
  - `deleteOpenPosition(position)`: existing SmartArray entry-removal idiom (cast
    each entry to `RowProxyDelete & Trade`, find by id, call `trade.delete!()`).
  - `selectOpenPositions` `computed`: maps `currentAccount().openTrades` 1:1 through
    `transformTradeToPosition` with **no** client-side open/closed filter.
- **Pattern to mirror for the SmartArray delete (if hypothesis (a)):**

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

#### Server endpoints (do not change)

- `/api/trades/open`: applies `where: { sell_date: null }`
  ([apps/server/src/app/routes/trades/get-open-trades/index.ts](../../apps/server/src/app/routes/trades/get-open-trades/index.ts)) —
  so on hard refresh the closed row is excluded from the bootstrap fetch and the row
  disappears. This is why "refresh fixes the bug" today.
- `/api/trades/closed` (or equivalent): used by the Sold Positions screen.
- `PUT /api/trades`: `handleUpdateTradeRoute` persists `sell_date` and `sell` and
  returns `Trade[]` via `mapTradeToResponse`. Story 107.1 should confirm this still
  works.

#### HTTP save (do not change)

- **Service:** [apps/dms-material/src/app/store/trades/trade-effect.service.ts](../../apps/dms-material/src/app/store/trades/trade-effect.service.ts)
  `update(newRow: Trade)` → `this.http.put<Trade[]>('./api/trades', newRow)`.

#### Stores (do not change unless 107.1 says so)

- [apps/dms-material/src/app/store/trades/open-trades-definition.const.ts](../../apps/dms-material/src/app/store/trades/open-trades-definition.const.ts)
- [apps/dms-material/src/app/store/trades/sold-trades-definition.const.ts](../../apps/dms-material/src/app/store/trades/sold-trades-definition.const.ts)
  Both share `tradeEffectsServiceToken`. Removing a trade from `openTrades` via
  `RowProxyDelete.delete()` does **not** call the server `DELETE /api/trades/:id` —
  it only drops the entry from the local SmartArray.

  > ⚠️ **Risk to verify (carry-over from Epic 104):** if `RowProxyDelete.delete()`
  > on a row that has just been mutated **does** trigger a backend
  > `DELETE /api/trades/:id`, this fix will destructively delete the trade from the
  > database — the exact opposite of the intent. If 107.1 did not clarify this,
  > the dev agent must verify it (read the `@smarttools/smart-signals` source or
  > run a one-off probe in a non-shared local DB) **before** shipping. If
  > `RowProxyDelete.delete()` does fire a backend delete, switch to hypothesis (b)
  > or (c).

#### The `handleSocketNotification('top', 'update', ['1']);` hypothesis

The bug report explicitly suggests this snippet as a fix path. 107.1 is required to
evaluate it. Before adopting hypothesis (c), the dev agent must confirm from
107.1's notes:

1. **What function** the snippet refers to (which file exports `handleSocketNotification`
   — likely a SmartNgRX entry point), **what arguments it accepts** in its real
   signature, and **what it does** when called (does it broadcast to subscribers,
   trigger a refetch, force a selector re-evaluation, all of the above?).
2. **Where to call it from** — the save handler in the component? the effect service?
   the store definition?
3. **What ID(s)** to pass — the literal `'1'` from the bug report is almost certainly
   illustrative; 107.1 must say what real value belongs there (account id? trade id?
   feature key? store key?).
4. **What side effects** it has — calling it from every save would hammer the server
   if it triggers a refetch.

**Do not paste the bug-report snippet verbatim into production code.** Use it as a
pointer to the right surface, and write the call against the real API 107.1
documented.

#### "Closed" predicate

The single source of truth must match the server's `where: { sell_date: null }`
semantics, with one extension: the spec also requires `sell > 0` (positive sell
price). Recommended shape (reuse Epic 104's version verbatim if it already exists
and matches):

```ts
function isTradeClosed(trade: Pick<Trade, 'sell_date' | 'sell'>): boolean {
  const hasSellDate =
    typeof trade.sell_date === 'string' && trade.sell_date.trim() !== '';
  const hasPositiveSell =
    typeof trade.sell === 'number' && Number.isFinite(trade.sell) && trade.sell > 0;
  return hasSellDate && hasPositiveSell;
}
```

Place this near `isPositive` / `isValidDate` / `isValidNumber` in
[position-validators.ts](../../apps/dms-material/src/app/account-panel/open-positions/position-validators.ts)
so the existing validator file is the home for this kind of rule. Confirm the file
exists, that the predicate is not already there from Epic 104, and that it follows
the same export style before placing.

### Post-Mutation Hook Sketch (hypothesis (a) — only if 107.1 recommends it)

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
  unless Story 107.1 explicitly identified the server response as the broken layer
  (R6 forbids any change to persisted server data).
- Do not modify the Sold Positions screen or its store wiring.
- Do not introduce a refetch of `openTrades` per save (hypothesis (d)) unless 107.1
  recommended it — it adds a network round-trip per edit.
- Do not change `findTradeById` semantics, the existing `EditableCell` /
  `EditableDateCell` contracts, or the `BaseTableComponent` virtual-scroll API.
- Do not change `transformTradeToPosition`'s output shape — Story 107.3 will assert
  on row presence/absence, not on cell content shape.
- Do not commit any temporary `console.log` or Playwright probe code.
- Do not paste the `handleSocketNotification('top', 'update', ['1']);` snippet
  verbatim — use it only as a pointer to the right API; call the real signature
  107.1 documented.
- Do not implement more than one hypothesis from Task 1 — pick the one 107.1
  recommends.

### Testing Standards

- **Unit tests (Vitest):** required for `isTradeClosed` (Task 5). Co-locate the test
  with the predicate (`position-validators.spec.ts` if you add it there).
- **No new component test in this story** — Story 107.3 covers the end-to-end
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

### Previous Story Intelligence (from 107.1)

- **Reproduction tooling:** Playwright MCP server is the required reproduction
  tool. The exact reproduction script and screenshots will be in 107.1 Dev Notes —
  reuse them verbatim for AC4 and Task 7.
- **HTTP save shape:** `PUT /api/trades` with `Trade` body, returns `Trade[]`. 107.1
  will have captured the exact request/response — re-read it before changing the
  client-side handlers so you don't accidentally rely on a field that isn't
  populated.
- **Server persistence:** expected to write `sell_date` and `sell` correctly when
  the request body contains them — 107.1 must verify this still holds. The Prisma
  `sell_date: ... : undefined` quirk (undefined means "do not update") is **not** a
  blocker because the client always sends a defined `sell_date` when closing.
- **Open vs closed predicate lives server-side** (`/api/trades/open` filters
  `sell_date: null`); the client-side list does not filter today. This is the root
  cause the fix addresses.
- **Epic 104's gap:** 107.1 must explicitly identify what Epic 104 changed, what
  shipped vs what was reverted, and why the bug still reproduces. Hypothesis
  selection in Task 1 depends entirely on this finding.

### Related Prior Work

- **Story 107.1** ([107-1-investigate-close-position-not-removed.md](./107-1-investigate-close-position-not-removed.md))
  — diagnosis, code pointers, Epic 104 gap analysis, hypothesis selection.
  **Required reading.**
- **Epic 104 — Story 104.2** ([104-2-fix-close-position-removes-from-open-positions.md](./104-2-fix-close-position-removes-from-open-positions.md))
  — the previous attempt at this fix. Read to understand what was tried and why
  107.1 thinks it didn't work.
- **Epic 104 — Story 104.1** ([104-1-investigate-close-position-not-removed.md](./104-1-investigate-close-position-not-removed.md))
  — Epic 104's diagnosis. 107.1 should call out where 104.1's diagnosis was right,
  wrong, or incomplete.
- **Epic 104 — Story 104.3** ([104-3-e2e-close-position-immediate-removal.md](./104-3-e2e-close-position-immediate-removal.md))
  — the E2E test Epic 104 shipped. If this test was passing while the bug still
  reproduced manually, 107.1 must explain the gap (test asserts on the wrong thing,
  test runs against a different code path, test is skipped, etc.) and 107.3 will
  close it.
- **Story 95.2** — removed universe-map lookup in `transformTradeToPosition`;
  shapes how `selectOpenPositions` reads trade fields today.
- **Story 87.2** — placeholder symbol changed to `\u2026` for in-flight loading
  rows; `selectOpenPositions`'s placeholder branch must remain intact (don't
  accidentally filter placeholders out of view if you change the computed shape).
- **Story 100.x** — Universe row delete bug (different screen, same "row doesn't
  disappear after mutation" symptom). Worth a quick read for any pattern reuse.

### References

- Epic source: [_bmad-output/planning-artifacts/epics-2026-05-19.md](../planning-artifacts/epics-2026-05-19.md) — Story 107.2 section
- Story metadata: [_bmad-output/planning-artifacts/story-meta/2026-05-19/107-2-fix-close-position-removes-from-open-positions.yaml](../planning-artifacts/story-meta/2026-05-19/107-2-fix-close-position-removes-from-open-positions.yaml)
- Previous story: [107-1-investigate-close-position-not-removed.md](./107-1-investigate-close-position-not-removed.md)
- Reference style: [104-2-fix-close-position-removes-from-open-positions.md](./104-2-fix-close-position-removes-from-open-positions.md)
- Project context: [_bmad-output/project-context.md](../project-context.md)
- Open Positions component: [apps/dms-material/src/app/account-panel/open-positions/open-positions.component.ts](../../apps/dms-material/src/app/account-panel/open-positions/open-positions.component.ts)
- Open Positions service: [apps/dms-material/src/app/account-panel/open-positions/open-positions-component.service.ts](../../apps/dms-material/src/app/account-panel/open-positions/open-positions-component.service.ts)
- Position validators: [apps/dms-material/src/app/account-panel/open-positions/position-validators.ts](../../apps/dms-material/src/app/account-panel/open-positions/position-validators.ts)
- Trade effect service: [apps/dms-material/src/app/store/trades/trade-effect.service.ts](../../apps/dms-material/src/app/store/trades/trade-effect.service.ts)
- Open trades definition: [apps/dms-material/src/app/store/trades/open-trades-definition.const.ts](../../apps/dms-material/src/app/store/trades/open-trades-definition.const.ts)
- Sold trades definition: [apps/dms-material/src/app/store/trades/sold-trades-definition.const.ts](../../apps/dms-material/src/app/store/trades/sold-trades-definition.const.ts)
- Server open-trades route: [apps/server/src/app/routes/trades/get-open-trades/index.ts](../../apps/server/src/app/routes/trades/get-open-trades/index.ts)
- Server trades route handler: [apps/server/src/app/routes/trades/index.ts](../../apps/server/src/app/routes/trades/index.ts)
