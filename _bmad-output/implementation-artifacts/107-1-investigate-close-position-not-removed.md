# Story 107.1: Investigate Why Closed Positions Stay Visible Until Refresh

Status: Approved

**Story Key:** `107-1-investigate-close-position-not-removed`
**Epic:** 107 — Close Position Should Immediately Remove from Open Positions List
**Source:** [_bmad-output/planning-artifacts/epics-2026-05-19.md](../planning-artifacts/epics-2026-05-19.md) (Story 107.1)
**Type:** Investigation (reproduction + code-only audit + review of Epic 104; no production
code or tests changed)

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want a root-cause diagnosis of why a position closed via `Mst Rcnt Sll Dt` +
`Mst Rcnt Sell $` does not immediately disappear from the Open Positions list — covering
the save HTTP request, the server response, the SmartNgRX/SmartSignals store update, the
Open Positions selector's reactivity, **and an explicit review of what Epic 104 actually
shipped vs. what it planned**, plus an evaluation of the bug report's suggested
`handleSocketNotification('top', 'update', ['1']);` fix path,
So that Story 107.2 fixes the actual broken layer rather than re-attempting work that
Epic 104 may have already done (or, more likely, never finished).

## Epic Context

**Epic 107 Goal:** When Dave closes a position on the Open Positions screen by entering a
`Mst Rcnt Sll Dt` and a positive `Mst Rcnt Sell $` and saving, the row should disappear
from the Open Positions list within one rendered frame. Today it stays visible until the
page is hard-refreshed.

Epic 104 (planning artifact: [_bmad-output/planning-artifacts/epics-2026-05-13.md](../planning-artifacts/epics-2026-05-13.md))
previously attempted to fix this with three stories (104.1 investigate, 104.2 fix, 104.3
E2E). The bug still reproduces, so Epic 107 re-investigates. Story 107.1 is the
**investigation/diagnosis** story. It must:

1. Reproduce the bug via the Playwright MCP server (fresh evidence — do not rely on the
   104.1 captures).
2. Capture the save HTTP request/response, verify server persistence, and trace the
   SmartNgRX/SmartSignals store update path.
3. Document the actual "open vs closed" predicate the Open Positions list uses.
4. **Review what Epic 104 actually changed in the codebase** (commits, file diffs,
   merged PRs) — and explicitly identify the gap between Epic 104's plan and what
   shipped, or the bug in what shipped.
5. **Evaluate the bug report's suggestion** `handleSocketNotification('top', 'update',
   ['1']);` — is it the right surface for the fix, the wrong API, or the right API
   with the wrong arguments?
6. Pinpoint the failing layer so Story 107.2 can apply a surgical fix without
   regressing server-side persistence or the Sold Positions screen.

**No production code is modified in this story.**

## Acceptance Criteria

1. **AC1 — Bug reproduced via Playwright MCP and recorded.**
   **Given** the current Open Positions screen and at least one open position,
   **When** the developer reproduces the bug via the Playwright MCP server (set sell
   date, set sell price > 0, save, observe row remains; refresh page; observe row is
   now gone),
   **Then** Dev Notes record screenshots/observations of the row before save, after
   save (still visible), and after refresh (gone). Reproduction must be **fresh** as
   of Story 107.1 — do not copy 104.1's screenshots verbatim; the bug must be shown to
   still reproduce on the current `main` HEAD.

2. **AC2 — Save HTTP request/response captured.**
   **Given** the network panel / Playwright MCP request log during the save,
   **When** the request is captured,
   **Then** Dev Notes document the HTTP method, URL, payload, status code, and full
   response body returned by the server (verbatim — do not paraphrase).

3. **AC3 — Server-side persistence verified.**
   **Given** the server-side handler for the save
   ([apps/server/src/app/routes/trades/index.ts](../../apps/server/src/app/routes/trades/index.ts)),
   **When** the developer traces the code path,
   **Then** Dev Notes record (a) whether the response includes the updated trade row,
   (b) whether `mapTradeToResponse` is applied to the saved row before returning, and
   (c) whether the persisted trade actually has the new sell date and sell price
   (verified by a direct DB query against the trade's `id` after the save).

4. **AC4 — Store update behaviour and selector predicate documented.**
   **Given** the SmartNgRX/SmartSignals trade store and the Open Positions selector,
   **When** the developer traces the client-side update path,
   **Then** Dev Notes record (a) whether the store entity for that trade is updated
   with the new sell date / sell price after the save, (b) the exact predicate the
   Open Positions selector uses to decide "open vs closed" (server-filtered list,
   client-side filter on sell date, etc.), and (c) whether that predicate would
   correctly exclude the row given the new field values.

5. **AC5 — Epic 104's prior fix attempt is reviewed and the gap is identified.**
   **Given** the three Epic 104 story files
   ([104-1](./104-1-investigate-close-position-not-removed.md),
   [104-2](./104-2-fix-close-position-removes-from-open-positions.md),
   [104-3](./104-3-e2e-close-position-immediate-removal.md))
   and the git history of every file Epic 104 planned to touch,
   **When** the developer audits what was actually merged to `main`,
   **Then** Dev Notes contain an "Epic 104 Audit" subsection that records, for each
   of the three stories:
   - the documented Status of the story file (Approved / ready-for-dev / review /
     done),
   - whether the Dev Agent Record / Completion Notes / File List fields are populated,
   - the list of commits (if any) on `main` that match the Epic 104 story keys (search
     git log for `104-1`, `104-2`, `104-3`, or merge-commit messages referencing the
     PRs),
   - the actual code state of the files Epic 104 planned to change (does
     `isTradeClosed` exist? does `onSellChange` / `onSellDateChange` contain
     `RowProxyDelete.delete()`? does `OpenPositionsComponentService` have a
     `removeOpenTradeLocally` method? is there an Epic 104 E2E spec under
     `apps/dms-material-e2e/src/`?),
   - and an explicit conclusion: **"Epic 104 [shipped fully / shipped partially /
     never shipped] — therefore the bug reproduces because [reason]"**.

6. **AC6 — `handleSocketNotification('top', 'update', ['1']);` evaluated.**
   **Given** the bug report's suggested fix path
   `handleSocketNotification('top', 'update', ['1']);` and the existing in-repo usages
   of `handleSocketNotification` from `@smarttools/smart-signals`,
   **When** the developer audits the API contract,
   **Then** Dev Notes contain a `"handleSocketNotification` Evaluation" subsection
   that records:
   - the existing in-repo call sites for `handleSocketNotification` (at story-creation
     time: `apps/dms-material/src/app/global/global-universe/global-universe.component.ts`
     lines ~201, ~210; `apps/dms-material/src/app/shared/utils/save-symbol-filter.function.ts`
     line ~23; `apps/dms-material/src/app/shared/utils/handle-sort-change.function.ts`
     line ~30) and what each one is doing (which entity, which event, which IDs),
   - the function's signature from `@smarttools/smart-signals` (read the package
     source under `node_modules/@smarttools/smart-signals` or its `.d.ts`),
   - what the **first argument** identifies (likely the SmartNgRX feature / entity
     name registered in a `*-definition.const.ts` — confirm by reading
     `open-trades-definition.const.ts`, `sold-trades-definition.const.ts`,
     `universes-definition.const.ts`, etc.),
   - what the **second argument** identifies (event type — `update`, `delete`, …),
   - what the **third argument** identifies (entity ID list, parent ID list, or
     pagination token — note `global-universe.component.ts` passes `['1']` which
     suggests a page/token, not a trade ID),
   - whether `'top'` is even a valid entity name **for trades** (it appears to refer
     to the universes-top collection, not trades) — **and therefore whether the bug
     report's suggested call would actually do anything useful on the Open Positions
     screen**,
   - if `handleSocketNotification` IS the right surface but the arguments are wrong,
     state the corrected call (e.g. `handleSocketNotification('openTrades', 'update',
     getAccountIds())` or whatever the actual feature/entity name is).

7. **AC7 — Failing layer explicitly identified for Story 107.2.**
   **Given** all five diagnostic dimensions (save request, server persistence, store
   update, selector predicate, Epic 104 audit) and the `handleSocketNotification`
   evaluation have been characterised,
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
     firing on the mutated fields;
   - (vi) Epic 104's fix shipped but in a way that does not actually solve the bug
     (regression of its own fix — describe the gap).

8. **AC8 — Recommendation handed off to Story 107.2.**
   **Given** the failing layer is identified and Epic 104's gap is characterised,
   **When** the developer writes a "Recommendation for Story 107.2" subsection in Dev
   Notes,
   **Then** that subsection states the smallest viable fix shape, choosing
   **explicitly** between:
   - **(a)** local SmartArray remove on close (the option Epic 104 planned but did not
     ship — re-evaluate whether it's still the right choice);
   - **(b)** rewrite `selectOpenPositions` as a `computed` that also filters
     `(sellDate == null) && (sell == 0)` (cheaper but introduces client/server
     predicate divergence);
   - **(c)** trigger a refetch via SmartNgRX after `update` settles;
   - **(d)** use `handleSocketNotification(<correct entity>, 'update', <correct IDs>)`
     to invalidate the openTrades collection — only if AC6 concluded this is the
     right surface and identified the correct arguments;
   - **(e)** something else identified by the investigation,
   **and** lists the exact files Story 107.2 will need to touch, with one-line
   descriptions, **and** explicitly addresses why this recommendation is expected to
   succeed where Epic 104's recommendation did not.

9. **AC9 — No production code changes; quality gate passes.**
   **Given** the investigation is complete,
   **When** `pnpm all` runs,
   **Then** all tests pass (no production code is modified in this story).

## Tasks / Subtasks

- [ ] **Task 1 — Reproduce the bug with Playwright MCP** (AC: #1)
  - [ ] Start the local dev stack (`./scripts/start-local-dev.sh` or `pnpm nx serve …`)
        and ensure at least one account has at least one open position. Note the
        account ID and the trade's symbol/ID for cross-referencing in later tasks.
  - [ ] Use the Playwright MCP server to navigate to the Open Positions screen for
        that account and capture a screenshot of the target row before any change.
  - [ ] Edit `Mst Rcnt Sll Dt` (the `sellDate` column) on the row to today's date and
        `Mst Rcnt Sell $` (the `sell` column) to a positive value, then commit each
        edit (blur / Enter / save action — confirm which interaction actually triggers
        the save).
  - [ ] Capture a screenshot immediately after save and confirm the row is still
        visible in the list.
  - [ ] Hard-refresh the page (`F5` / `Ctrl-R`), capture a screenshot, and confirm
        the row is now gone.
  - [ ] Save all three screenshots and the reproduction script/snippet into Dev Notes
        "Reproduction" subsection.

- [ ] **Task 2 — Capture the save HTTP request/response** (AC: #2)
  - [ ] During the same Playwright MCP session (or a fresh repro), capture the
        network request fired by the save: HTTP method, URL, request body, status
        code, and the full response body.
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
  - [ ] Run a direct DB query (`pnpm prisma studio`, or a one-off
        `prisma.trades.findUnique` in a `tools/` script, or a SQL query) against the
        closed trade's `id` after the Playwright save and record the persisted
        `sell_date` and `sell` values.
  - [ ] If `mapTradeToResponse` is NOT applied, or if `sell_date` is being silently
        dropped on the server, capture that in Dev Notes — that would directly
        explain the bug (option AC7(ii)/(iii)).

- [ ] **Task 4 — Trace the SmartSignals store update on save** (AC: #4)
  - [ ] Read [apps/dms-material/src/app/store/trades/trade-effect.service.ts](../../apps/dms-material/src/app/store/trades/trade-effect.service.ts)
        — confirm `update(newRow)` does `PUT ./api/trades` and returns
        `Observable<Trade[]>`.
  - [ ] Read [apps/dms-material/src/app/store/trades/open-trades-definition.const.ts](../../apps/dms-material/src/app/store/trades/open-trades-definition.const.ts)
        and the surrounding store wiring (the `openTradesDefinition`
        SmartEntityDefinition, and how `currentAccount.openTrades` is populated).
        Confirm in Dev Notes:
        - that the proxy mutation pattern used in
          [open-positions.component.ts](../../apps/dms-material/src/app/account-panel/open-positions/open-positions.component.ts)
          (`onSellDateChange` / `onSellChange`, lines ~211–245) does in fact trigger
          `TradeEffectsService.update()`;
        - that the store entity for the trade is updated with the new `sell` and
          `sell_date` after the save (instrument via Playwright MCP `evaluate` to
          read the SmartArray entry, or via a temporary `console.log` if necessary
          — but revert any code changes before finishing the story);
        - that the trade is **still present** in the `openTrades` SmartArray after
          the save (this is the strong-candidate hypothesis — see Dev Notes).

- [ ] **Task 5 — Document the Open Positions "open vs closed" predicate** (AC: #4)
  - [ ] Read [open-positions-component.service.ts](../../apps/dms-material/src/app/account-panel/open-positions/open-positions-component.service.ts)
        `selectOpenPositions` computed (lines ~74–96) and document explicitly in Dev
        Notes that **it does NOT filter by sell date** — it transforms every entry
        in `currentAccount().openTrades` 1:1 into an `OpenPosition`.
  - [ ] Read [apps/server/src/app/routes/trades/get-open-trades/index.ts](../../apps/server/src/app/routes/trades/get-open-trades/index.ts)
        and confirm the `/api/trades/open` endpoint applies `where: { sell_date: null }`
        — i.e. the open/closed split lives **server-side**, and the client list only
        re-prunes when it re-fetches.
  - [ ] Verify on hard refresh that the client re-fetches `/api/trades/open` (or
        whatever the SmartNgRX bootstrap fetch does for `openTrades`) and that the
        closed row is absent from that response.
  - [ ] Document in Dev Notes: "the predicate is server-side; client-side mutation
        of `sell_date` does not cause re-pruning of the local `openTrades`
        collection".

- [ ] **Task 6 — Epic 104 audit** (AC: #5)
  - [ ] Read all three Epic 104 story files end-to-end:
        [104-1-investigate-close-position-not-removed.md](./104-1-investigate-close-position-not-removed.md),
        [104-2-fix-close-position-removes-from-open-positions.md](./104-2-fix-close-position-removes-from-open-positions.md),
        [104-3-e2e-close-position-immediate-removal.md](./104-3-e2e-close-position-immediate-removal.md).
        For each, record in Dev Notes "Epic 104 Audit" subsection:
        - the `Status:` header value;
        - whether the "Dev Agent Record" / "Completion Notes List" / "File List"
          sections are populated.
  - [ ] Run `git log --oneline -- apps/dms-material/src/app/account-panel/open-positions/`
        and `git log --oneline -- apps/dms-material-e2e/src/` and search for any
        commits whose message references Epic 104 / Story 104.2 / Story 104.3 /
        `close-position` / `RowProxyDelete` / `isTradeClosed` / `removeOpenTradeLocally`.
        Record findings (or lack thereof) verbatim in Dev Notes.
  - [ ] Inspect the current state of the files Epic 104 planned to change. For each
        check, record the observed state in Dev Notes:
        - Does an `isTradeClosed` function exist anywhere under
          `apps/dms-material/src/`? (At story-creation time:
          `grep -r 'isTradeClosed' apps/dms-material/src` returns nothing.)
        - Do `onSellChange` and `onSellDateChange` in
          [open-positions.component.ts](../../apps/dms-material/src/app/account-panel/open-positions/open-positions.component.ts)
          contain any `RowProxyDelete`, `.delete!()`, or
          `removeOpenTradeLocally` call after the mutation? (At story-creation time:
          they do NOT — they only do `trade.sell = newValue` /
          `trade.sell_date = dateString`.)
        - Does
          [open-positions-component.service.ts](../../apps/dms-material/src/app/account-panel/open-positions/open-positions-component.service.ts)
          export a `removeOpenTradeLocally(tradeId: string)` method? (At
          story-creation time: it does NOT — only `deleteOpenPosition(position)`
          exists, which performs `RowProxyDelete.delete()` and is used by the
          explicit delete button, not by the close-on-save path.)
        - Does any spec under `apps/dms-material-e2e/src/` mention
          `close-position-immediate-removal`, `sell_date`+`sell` close flow, or
          Story 104.3?
  - [ ] Synthesise: write an explicit one-paragraph conclusion in the form **"Epic
        104 shipped [fully | partially | not at all]. Specifically: [what shipped, if
        anything] / [what did not ship]. Therefore the bug reproduces today because
        [reason]."** Cite the evidence from the bullets above. (At story-creation
        time, the strong-candidate conclusion — to be verified by the dev agent —
        is that **Epic 104 did not ship**: 104.2 and 104.3 stayed at `Approved`,
        Dev Agent Records are empty, and the code files do not contain the planned
        `isTradeClosed` / `RowProxyDelete` additions.)

- [ ] **Task 7 — Evaluate `handleSocketNotification('top', 'update', ['1']);`** (AC: #6)
  - [ ] List every in-repo call site of `handleSocketNotification` (use
        `grep -rn 'handleSocketNotification(' apps/`) and tabulate, in Dev Notes
        "`handleSocketNotification` Evaluation" subsection, each call's arguments
        and the file/line.
  - [ ] Read the `handleSocketNotification` declaration in
        `node_modules/@smarttools/smart-signals` (search for its `.d.ts` or `.ts`
        source: `find node_modules/@smarttools/smart-signals -name '*.d.ts' |
        xargs grep -l 'handleSocketNotification'`) and quote the signature
        verbatim into Dev Notes. Identify what each parameter means (feature /
        entity name, event type, IDs / page token).
  - [ ] Read
        [apps/dms-material/src/app/store/trades/open-trades-definition.const.ts](../../apps/dms-material/src/app/store/trades/open-trades-definition.const.ts)
        and identify the actual `feature` and `entityName` registered for open
        trades in the SmartNgRX/SmartSignals store. Record both in Dev Notes.
  - [ ] Compare `'top'` to the actual openTrades feature/entity name. If `'top'`
        does not match, state in Dev Notes: **"the bug report's suggested call as
        written would not invalidate the openTrades collection; the correct call,
        if `handleSocketNotification` is the right surface, would be
        `handleSocketNotification('<feature>', 'update', <ids>)`"** — filling in
        the correct values from the previous bullet.
  - [ ] State the final verdict on the bug report's suggestion: **"right API +
        right args"**, **"right API + wrong args (corrected form is X)"**, or
        **"wrong API for this layer — use option (a)/(b)/(c)/(e) instead"**.

- [ ] **Task 8 — State the failing layer and write the Story 107.2 recommendation**
      (AC: #7, #8)
  - [ ] Synthesise Tasks 1–7 into a single "Failing Layer" subsection that picks
        explicitly from AC7 options (i)–(vi), with a one-paragraph justification
        citing the evidence captured above (including the Epic 104 audit and the
        `handleSocketNotification` verdict).
  - [ ] Write a "Recommendation for Story 107.2" subsection that names:
        - the smallest viable fix shape, choosing explicitly from AC8 options
          (a)–(e);
        - the exact files Story 107.2 will need to touch (with one-line
          descriptions of the change in each);
        - any test files (unit + Playwright) Stories 107.2 / 107.3 will need to
          update or add;
        - **and a one-paragraph "why this won't repeat Epic 104's failure"**
          explanation — e.g. "Epic 104 planned option (a) but never shipped — the
          remediation here is to actually code it, plus add the Playwright E2E in
          107.3 that pins it" — or, if 107.2 chooses a different option, why that
          option is preferable to Epic 104's plan.

- [ ] **Task 9 — Quality gate** (AC: #9)
  - [ ] Confirm no production source files were modified (only this story file's
        Dev Notes was updated). Run `git status` and ensure only this file is dirty.
  - [ ] Run `pnpm all` and confirm all tests pass. Record the result in Dev Notes.

## Dev Notes

### Architecture & Code Pointers

The investigation must trace four layers end-to-end, **plus** a fifth dimension: the
prior Epic 104 work. Concrete starting points (verified by code-read at story-creation
time — re-confirm during investigation):

#### 1. The edit handlers on the Open Positions row

- **Component:** [apps/dms-material/src/app/account-panel/open-positions/open-positions.component.ts](../../apps/dms-material/src/app/account-panel/open-positions/open-positions.component.ts)
- **Relevant handlers (current state on `main`):**
  - `onSellChange(position, newValue)` (lines ~211–220): sets `trade.sell = newValue`
    via SmartArray proxy mutation. **No post-mutation close check.**
  - `onSellDateChange(position, newDate)` (lines ~222–243): sets
    `trade.sell_date = dateString` (or `undefined` if cleared) via SmartArray proxy
    mutation. **No post-mutation close check.**
  - `findTradeById(positionId)` (lines ~252–261): helper that returns the `Trade`
    from the SmartArray by id.
- **Pattern:** these are proxy mutations on the SmartNgRX SmartArray entry. Per the
  inline comment ("SmartNgRX automatically detects mutation and persists to backend"),
  each mutation is expected to fire `TradeEffectsService.update(newRow)`.
- **Notable absence:** there is no `isTradeClosed` predicate, no
  `RowProxyDelete.delete()` call, and no `removeOpenTradeLocally` invocation in these
  handlers. This matches the symptom that the row stays visible.

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
  - calls `prisma.trades.update({ where: { id }, data: { …, sell_date: sell_date ?
    new Date(sell_date) : undefined, … } })`;
  - re-reads via `prisma.trades.findMany({ where: { id }, include: { universe: {
    select: { symbol, last_price, distribution, distributions_per_year } } } })`;
  - returns `trades.map(mapTradeToResponse)` — so the response IS a `Trade[]` with
    `sell` and `sell_date` fields populated (see `mapTradeToResponse` at lines
    ~82–112).
- **Important nuance to verify:** the Prisma update uses `sell_date: … : undefined`.
  In Prisma, `undefined` means "do not update this column". So if the client ever
  sends `sell_date: null` (intending to clear the date), the server will **not**
  clear the column. For this epic's scenario the client should be sending a defined
  `sell_date`, but worth confirming during the repro that the request body actually
  contains the new sell date.

#### 4. The SmartSignals store and the Open Positions selector

- **Open trades collection:** [apps/dms-material/src/app/store/trades/open-trades-definition.const.ts](../../apps/dms-material/src/app/store/trades/open-trades-definition.const.ts)
  (`openTradesDefinition`, entityName `openTrades`, effect service
  `tradeEffectsServiceToken`).
- **Sold trades collection:** [apps/dms-material/src/app/store/trades/sold-trades-definition.const.ts](../../apps/dms-material/src/app/store/trades/sold-trades-definition.const.ts).
- **Selector currently used by the Open Positions screen:** the
  `selectOpenPositions` computed in
  [open-positions-component.service.ts](../../apps/dms-material/src/app/account-panel/open-positions/open-positions-component.service.ts)
  (lines ~74–96). It reads `this.trades()` (which is
  `currentAccount().openTrades as Trade[]`) and maps each entry through
  `transformTradeToPosition` 1:1. **There is no `filter(sell_date == null && sell ==
  0)` step** — the open/closed predicate is not applied client-side here.
- **Server-side predicate:** [apps/server/src/app/routes/trades/get-open-trades/index.ts](../../apps/server/src/app/routes/trades/get-open-trades/index.ts)
  applies `where: { sell_date: null }`. This is what makes the row disappear on hard
  refresh.

#### 5. Epic 104 prior-work surface

- **Story files** (all under `_bmad-output/implementation-artifacts/`):
  - [104-1-investigate-close-position-not-removed.md](./104-1-investigate-close-position-not-removed.md)
    — diagnosis. **At story-creation time:** `Status: Approved`. Contains the
    full hypothesis tree and the "Strong-Candidate Hypothesis" pointing at option
    (a) (local SmartArray remove on close).
  - [104-2-fix-close-position-removes-from-open-positions.md](./104-2-fix-close-position-removes-from-open-positions.md)
    — planned fix (option (a) default). **At story-creation time:** `Status:
    Approved`. **Dev Agent Record / Completion Notes / File List sections are
    empty.** No matching commit on `main` for the planned `isTradeClosed` /
    `removeOpenTradeLocally` additions.
  - [104-3-e2e-close-position-immediate-removal.md](./104-3-e2e-close-position-immediate-removal.md)
    — planned E2E. **At story-creation time:** `Status: Approved`. **Dev Agent
    Record empty.** No matching spec file in `apps/dms-material-e2e/src/`.
- **Git history on the planned-touch files** (at story-creation time, last 5
  commits on `open-positions.component.ts` /
  `open-positions-component.service.ts`):
  - `ed77114f` story 105.2 sticky-header fix
  - `8c649a63` story-1229 last_price wiring
  - `09cf1cd3` story 97.4 E2E for computed fields
  - `287c6c2a` story 97.3 target sell server move
  - `7c782ce0` story 95.2 remove universe map
  None of these are Epic 104 commits.
- **Strong-candidate conclusion (verify):** Epic 104 produced the planning artifacts
  but **the code change in 104.2 and the E2E in 104.3 were never implemented**.
  The bug reproduces today because the planned fix simply did not ship. Story
  107.2's job is therefore to actually code the fix (re-evaluating whether option
  (a) is still the right choice, or whether the bug report's
  `handleSocketNotification`-based path is preferable).

### Strong-Candidate Hypothesis (verify, do not assume)

Given the code shape above **and** the Epic 104 audit prediction, the most likely
failing layer is **AC7(iv) — the Open Positions list is not a filtered view**,
compounded by **AC7(vi) — Epic 104's planned fix for (iv) was never shipped**:

- The save fires `PUT /api/trades`, the server persists the new `sell_date` and `sell`,
  and the store entity for the trade is updated correctly with the new fields.
- BUT the trade row is still a member of the `openTrades` SmartArray (membership is
  determined at fetch time, server-side, by `sell_date: null`).
- `selectOpenPositions` re-emits when the trade entity changes (because
  `transformTradeToPosition` reads `trade.sell_date` etc.) — but it produces **the
  same number of `OpenPosition` rows as before**, just with the now-closed row's
  `sellDate` and `sell` populated. So the row stays visible.
- On hard refresh, the SmartNgRX bootstrap re-fetches `openTrades` (server-filtered
  to `sell_date: null`), the now-closed trade is absent, and the row finally
  disappears.
- Epic 104 planned to fix this by adding `isTradeClosed` + `RowProxyDelete.delete()`
  to the post-mutation path (Story 104.2 default option (a)), but the audit
  (Task 6) is expected to show this code was never merged.

If this hypothesis holds, the fix shape for Story 107.2 is one of:

- **(a)** In `onSellChange` / `onSellDateChange`, after the proxy mutation, if the
  new trade state is "closed" (i.e. `sell_date` set AND `sell > 0`), call
  `RowProxyDelete.delete()` on the trade in `openTrades` (the same pattern
  `deleteOpenPosition` already uses, lines ~58–71 of
  `open-positions-component.service.ts`) so the SmartArray drops it locally. The
  server already persists correctly. **This is exactly Epic 104.2's plan, never
  shipped.**
- **(b)** Rewrite `selectOpenPositions` as a `computed` that also filters
  `(sellDate == null || sellDate === undefined) && (sell == 0 || sell == null)`.
  Cheaper to ship but introduces a divergence between client-side and server-side
  predicates.
- **(c)** Trigger a refetch of `openTrades` via SmartNgRX after the update settles.
  Heavy and adds a network round-trip per edit.
- **(d)** `handleSocketNotification(<openTrades feature>, 'update', getAccountIds())`
  — invalidate the openTrades collection so SmartNgRX re-pulls. **Only viable if
  Task 7 confirms the correct arguments.** The bug report's literal
  `handleSocketNotification('top', 'update', ['1']);` is almost certainly wrong:
  `'top'` is the feature used by the global Universe screen
  (`global-universe.component.ts` lines ~201 and ~210), not the trades screen.

The investigation must **confirm or refute** this hypothesis with reproduction
evidence, direct code reading, the Epic 104 audit, and the `handleSocketNotification`
evaluation, then write the Story 107.2 recommendation accordingly. Do not assume —
verify.

### `handleSocketNotification` Background (for Task 7)

In-repo usages at story-creation time (verified via `grep`):

| File                                                                                                                                       | Line  | Call                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ----- | ----------------------------------------------------------------- |
| `apps/dms-material/src/app/global/global-universe/global-universe.component.ts`                                                            | ~201  | `handleSocketNotification('top', 'update', ['1']);`               |
| `apps/dms-material/src/app/global/global-universe/global-universe.component.ts`                                                            | ~210  | `handleSocketNotification('top', 'update', ['1']);`               |
| `apps/dms-material/src/app/shared/utils/save-symbol-filter.function.ts`                                                                    | ~23   | `handleSocketNotification('accounts', 'update', getAccountIds());`|
| `apps/dms-material/src/app/shared/utils/handle-sort-change.function.ts`                                                                    | ~30   | `handleSocketNotification('accounts', 'update', getAccountIds());`|

Observations the investigator should validate:

- First argument is a **feature / entity name** (e.g. `'top'`, `'accounts'`) — must
  match the registered SmartNgRX feature for the collection you want to invalidate.
- Third argument is an **ID list**: `['1']` (a page/parent token) for the global
  universe-top screen, vs. `getAccountIds()` for account-scoped invalidations.
- The bug report's literal call `handleSocketNotification('top', 'update', ['1'])`
  copies the universe-top form verbatim. It would invalidate the **universe-top**
  collection, not the **openTrades** collection. So either:
  - the bug-report author confused which entity name to use, and the right call
    would be something like `handleSocketNotification('openTrades', 'update',
    getAccountIds())` (or the actual entity name registered in
    `open-trades-definition.const.ts`); **or**
  - the bug-report author meant the suggestion as a pattern, not a literal —
    intending option (c) "invalidate + refetch" via this API.

Task 7's job is to make the call (right API, wrong args / right API, right args /
wrong API) **explicitly** so Story 107.2 has a clean decision.

### Reproduction tooling

- Playwright MCP server is the required reproduction tool (per epic AC1). Capture
  screenshots and HTTP request/response snapshots verbatim — do not paraphrase.
- For inspecting the SmartArray contents at runtime, the cleanest approach is a
  short-lived `evaluate` via Playwright MCP that reads
  `window.ng.getComponent($0)` style probes, or a temporary `console.log` in
  `selectOpenPositions` that you must revert before finishing the story. **Do not
  commit any temporary debug code.**

### Testing standards

- **No new tests in this story** — Story 107.3 owns the regression E2E test. This
  story only reads code, audits git history, audits Epic 104 artifacts, and runs the
  app via Playwright MCP; no production source files or test files are modified.
- `pnpm all` (lint + format + unit + build, per repo convention) must pass at the
  end. This is mostly a no-op gate for an investigation story but proves nothing was
  inadvertently modified.

### Project Structure Notes

- Open Positions UI lives under `apps/dms-material/src/app/account-panel/open-positions/`.
- Trade store / effects / definitions live under `apps/dms-material/src/app/store/trades/`.
- Server trade routes live under `apps/server/src/app/routes/trades/` with sibling
  subroutes `get-open-trades/` and `get-closed-trades/`.
- `handleSocketNotification` is imported from `@smarttools/smart-signals`.
- Project conventions (Angular 21 zoneless, signal-first, `OnPush`, SmartNgRX/SmartSignals
  for entity caching) per [_bmad-output/project-context.md](../project-context.md).

### Related Prior Work

- **Epic 104 (stories 104.1 / 104.2 / 104.3)** — prior attempt at this exact bug.
  104.1's investigation is solid and reusable as background; 104.2 and 104.3 appear
  to have stalled at `Approved`. **Task 6 of this story formally audits this.**
- **Story 95.2** — removed the universe-map lookup in `transformTradeToPosition`;
  relevant because it shapes how `selectOpenPositions` reads trade fields today.
- **Story 99.x / 97.x** — Open Positions field plumbing (last price, computed
  fields). Same screen, adjacent code; review the diffs to understand current state
  machinery.
- **Story 100.x** — Universe row delete bug (different screen, similar "row doesn't
  disappear after mutation" symptom). Worth a quick read for any pattern reuse.

### References

- Epic source: [_bmad-output/planning-artifacts/epics-2026-05-19.md](../planning-artifacts/epics-2026-05-19.md) — Story 107.1 section
- Story metadata: [_bmad-output/planning-artifacts/story-meta/2026-05-19/107-1-investigate-close-position-not-removed.yaml](../planning-artifacts/story-meta/2026-05-19/107-1-investigate-close-position-not-removed.yaml)
- Project context: [_bmad-output/project-context.md](../project-context.md)
- Prior Epic 104 stories:
  - [104-1-investigate-close-position-not-removed.md](./104-1-investigate-close-position-not-removed.md)
  - [104-2-fix-close-position-removes-from-open-positions.md](./104-2-fix-close-position-removes-from-open-positions.md)
  - [104-3-e2e-close-position-immediate-removal.md](./104-3-e2e-close-position-immediate-removal.md)
- Open Positions component: [apps/dms-material/src/app/account-panel/open-positions/open-positions.component.ts](../../apps/dms-material/src/app/account-panel/open-positions/open-positions.component.ts)
- Open Positions service: [apps/dms-material/src/app/account-panel/open-positions/open-positions-component.service.ts](../../apps/dms-material/src/app/account-panel/open-positions/open-positions-component.service.ts)
- Position validators: [apps/dms-material/src/app/account-panel/open-positions/position-validators.ts](../../apps/dms-material/src/app/account-panel/open-positions/position-validators.ts)
- Trade effect service: [apps/dms-material/src/app/store/trades/trade-effect.service.ts](../../apps/dms-material/src/app/store/trades/trade-effect.service.ts)
- Open trades definition: [apps/dms-material/src/app/store/trades/open-trades-definition.const.ts](../../apps/dms-material/src/app/store/trades/open-trades-definition.const.ts)
- Sold trades definition: [apps/dms-material/src/app/store/trades/sold-trades-definition.const.ts](../../apps/dms-material/src/app/store/trades/sold-trades-definition.const.ts)
- Server trade routes (PUT/POST/DELETE + `mapTradeToResponse`): [apps/server/src/app/routes/trades/index.ts](../../apps/server/src/app/routes/trades/index.ts)
- Server `/api/trades/open` (server-side filter): [apps/server/src/app/routes/trades/get-open-trades/index.ts](../../apps/server/src/app/routes/trades/get-open-trades/index.ts)
- `handleSocketNotification` reference usages:
  - [apps/dms-material/src/app/global/global-universe/global-universe.component.ts](../../apps/dms-material/src/app/global/global-universe/global-universe.component.ts) (lines ~201, ~210)
  - [apps/dms-material/src/app/shared/utils/save-symbol-filter.function.ts](../../apps/dms-material/src/app/shared/utils/save-symbol-filter.function.ts) (line ~23)
  - [apps/dms-material/src/app/shared/utils/handle-sort-change.function.ts](../../apps/dms-material/src/app/shared/utils/handle-sort-change.function.ts) (line ~30)

## Dev Agent Record

### Agent Model Used

(to be filled in by the dev agent)

### Debug Log References

### Completion Notes List

### File List
