# Story 105.2: Root-Cause and Fix Scrolling Artifacts on Account / Filter Change

Status: Approved

**Story Key:** `105-2-root-cause-and-fix-scrolling-on-context-change`
**Epic:** 105 — Janky Scrolling After Account / Filter Change (Round 8)
**Source:** [_bmad-output/planning-artifacts/epics-2026-05-13.md](../planning-artifacts/epics-2026-05-13.md) (Story 105.2)
**Type:** Implementation (root-cause investigation + targeted production-code fix)
**Depends on:** Story 105.1 (reproduction matrix + live root-cause candidate list — must be `Done`)
**Enables:** Story 105.3 (persistent regression suite for the context-change scenario)

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As Dave,
I want the scrolling artifacts that reappear after I change the active account or change a
filter to be eliminated by a fix that targets the actual root cause — without regressing
the Epic-101 freshly-loaded fix,
So that I can switch accounts / apply filters and keep scrolling cleanly without having to
refresh the page.

## Epic Context

**Epic 105 Goal:** Epic 101 (Round 7) eliminated header-under-header, flicker, and
header-with-content drag on **freshly loaded** screens. The artifacts return when Dave
changes the active account on the Universe screen — and, by extension, when a filter is
applied or cleared without a full page reload. Something in the account-change /
filter-change pipeline is leaving the virtual scroller, the sticky header, or their shared
layout state in a different condition than a freshly loaded screen.

This story (105.2) is the **root-cause + fix** story for Round 8. It must:

1. Consume Story 105.1's reproduction matrix and live root-cause candidate list as
   the specification — do NOT speculate or open new candidates without evidence.
2. Confirm exactly which candidate(s) are present in the live DOM via Playwright MCP.
3. Apply a targeted, minimal fix that eliminates the artifact at its root cause.
4. Re-run Story 105.1's reproduction matrix and prove every previously-failing cell
   is now `clean` — across every screen, both browsers, every viewport.
5. Re-run the Epic-101 freshly-loaded regression suite (`scrolling-regression-101.spec.ts`)
   and prove no Round-7 regression.
6. Add the Round-8 entry to the SCROLLING REGRESSION HISTORY comment block in
   `base-table.component.ts` so Round 9 never starts.

**Hard rule:** The fix MUST target the root cause directly. A "force a full reload on
account change" workaround (e.g. `router.navigateByUrl(url, { onSameUrlNavigation: 'reload' })`
or destroying the table component on context change) is explicitly forbidden — that is a
symptom-level patch and is rejected by AC4.

## Acceptance Criteria

1. **AC1 — Story 105.1 evidence is the specification.**
   **Given** Story 105.1 (`105-1-reproduce-scrolling-after-account-filter-change.md`) is
   `Done` and contains the reproduction matrix + Live Root-Cause Candidates list,
   **When** the developer begins this story,
   **Then** Dev Notes record (a) confirmation that 105.1 is `Done`, (b) a verbatim copy
   (or summary with explicit cell-by-cell coverage) of 105.1's reproduction matrix as the
   target inventory of cells that must flip from `FAIL` → `clean`, and (c) the candidate
   list 105.1 enumerated. **HALT** if 105.1 is not `Done`.

2. **AC2 — Root cause is confirmed with live-DOM evidence (not assumed).**
   **Given** the candidates from 105.1 (CDK viewport `_renderedRange` not reset on
   data-source swap; sticky containing-block re-creation by a structural directive on
   context change; row-identity churn from a SmartNgRX/SmartSignals selector returning a
   new array reference but stale row identities; conditional ancestor
   `transform`/`will-change`/`contain` during the loading state; `isLoading → null` array
   shrink — Epic 60 mechanism),
   **When** the developer investigates each candidate per `FAIL` cell using Playwright
   MCP against the live app (port 4301, real data, both Chromium and Firefox),
   **Then** Dev Notes identify exactly which candidate(s) are confirmed present, with
   evidence per candidate (DOM ancestor walk, computed-style snapshot, CDK viewport
   `_renderedRange` value, `trackBy` identity log, signal/effect trace, or DevTools
   Performance/Layers capture). Candidates not supported by live evidence are explicitly
   marked **eliminated** with the reason.

3. **AC3 — Fix targets the root cause directly (not a workaround).**
   **Given** the actual root cause is identified per AC2,
   **When** the fix is implemented,
   **Then** the change targets the root cause directly with rationale documented in Dev
   Notes, and is **NOT** any of:
   - A forced full-page reload on account change (e.g. `location.reload()`,
     `router.navigateByUrl(url, { onSameUrlNavigation: 'reload' })`, or any code path
     whose effect is to destroy/recreate the screen component on context change).
   - Another `rowHeight` adjustment (Epic 29 territory).
   - Another `isLoading` placeholder tweak (Epic 60 / 64 territory).
   - A re-introduction of `contain: paint` / `contain: strict` / `contain: layout` on the
     virtual-scroll viewport or its ancestors (would re-break Round 7 — Story 101.2's fix
     was to REMOVE `contain: paint`).
   - A `position: sticky` / `will-change: transform` band-aid masking another problem.

4. **AC4 — Reproduction matrix from 105.1 fully passes after the fix.**
   **Given** the fix is applied,
   **When** the Playwright MCP server is used against the **live application** (port 4301,
   real production-scale data, logged in as Dave) to re-run the **exact** failure
   sequences from Story 105.1's reproduction matrix across every previously-failing
   `screen × browser × trigger × artifact` cell,
   **Then** every previously-failing cell now passes — no header-under-header, no flicker,
   no header-with-content drift — at all tested scroll speeds and viewport sizes.

5. **AC5 — Worst-failing cell verified consistent (not a fluke).**
   **Given** AC4 passes,
   **When** the developer repeats the worst-failing scroll sequence (per affected screen)
   **3 additional times** via Playwright MCP,
   **Then** none of the artifacts reappear on any of the 3 additional attempts.

6. **AC6 — Epic-101 freshly-loaded suite still green (no Round-7 regression).**
   **Given** the existing Round-7 spec
   `apps/dms-material-e2e/src/scrolling-regression-101.spec.ts` and the Round-1..6 specs
   (`universe-scrolling-regression.spec.ts`, `scrolling-regression-87.spec.ts`, the
   per-screen `*-scrolling-regression.spec.ts` and `*-smooth-scroll.spec.ts` files),
   **When** they are re-run in both Chromium and Firefox,
   **Then** every assertion passes. The Round-8 fix has not regressed any prior round.

7. **AC7 — Optional: 105.1 reproduction spec, if committed, is un-`test.fail()`-ed.**
   **Given** Story 105.1 may have committed
   `apps/dms-material-e2e/src/scrolling-regression-105.spec.ts` as a `test.fail()`-annotated
   reproduction spec (Story 105.1 AC5),
   **When** this story's fix is applied,
   **Then** every `test.fail()` annotation in that spec is removed (or the
   `test.describe.skip()` wrapper removed) and every test passes for real. If 105.1 did
   not commit the spec, this AC is **N/A** and Dev Notes state so — Story 105.3 still
   owns the persistent regression suite.

8. **AC8 — Citation comment block updated (Round-8 entry).**
   **Given** the fix is implemented,
   **When** a code reviewer inspects the change,
   **Then** the SCROLLING REGRESSION HISTORY comment block at the top of
   `apps/dms-material/src/app/shared/components/base-table/base-table.component.ts`
   has a new Round-8 / Epic-105 entry stating: stated root cause, what changed, structural
   constraint preserved. The comment style matches the existing Epic 29 → Epic 101 entries
   (see Story 87.2 / 101.2 for the established pattern). Every file modified in this story
   that is a primary site of the fix MUST also include a brief reference comment pointing
   back to the central history block (so future readers find it).

9. **AC9 — Angular zoneless / OnPush / signal-first conventions preserved (NFR4).**
   **Given** Angular 21 zoneless change detection, signal-first state, OnPush change
   detection, `inject()` (no constructor injection), and SmartNgRX/SmartSignals are
   project conventions,
   **When** the fix is implemented,
   **Then** no test assertion is weakened to make tests pass, no `inject()` is replaced
   with constructor injection, OnPush is preserved on every component touched, and any
   signal updates introduced are batched (via `untracked` or a single `set`) so they
   render once per scroll frame.

10. **AC10 — `pnpm all` passes (NFR1) and `pnpm format` is a no-op.**
    **Given** the fix is complete,
    **When** `pnpm all` and then `pnpm format` are run,
    **Then** all tests pass and `pnpm format` reports no changes required.

11. **AC11 — Hand-off note for Story 105.3 written.**
    **Given** the fix is verified,
    **When** Dev Notes are finalised,
    **Then** Dev Notes contain a "Hand-off Note for Story 105.3" subsection stating
    exactly which DOM invariant(s) the persistent regression suite must encode for the
    context-change scenario (i.e. the assertion that would have caught Round 8 if it had
    existed) and which seed-helper / context-change driver Story 105.3 should reuse.

## Tasks / Subtasks

- [ ] **Task 1 — Read Story 105.1 Dev Notes; confirm `Done`** (AC: #1)
  - [ ] Open
        [`_bmad-output/implementation-artifacts/105-1-reproduce-scrolling-after-account-filter-change.md`](./105-1-reproduce-scrolling-after-account-filter-change.md)
        and read it in full — especially the reproduction matrix, the per-cell live-DOM
        evidence, the prior-epic review, and the Live Root-Cause Candidates section.
  - [ ] Confirm 105.1 status is `Done`. **HALT** if not — this story cannot start without
        the reproduction matrix and candidate list.
  - [ ] Copy the reproduction matrix into Dev Notes under "Target Inventory (from 105.1)"
        as the explicit list of cells that must flip from `FAIL` → `clean`.
  - [ ] Copy the Live Root-Cause Candidates list into Dev Notes under "Candidates Under
        Investigation" as the closed set this story is allowed to investigate. Do NOT add
        speculative candidates not in 105.1's list — if a new candidate is needed, it
        means 105.1 was incomplete; loop back through `correct-course` first.

- [ ] **Task 2 — Start the local stack and reconfirm baseline + reproduction** (AC: #2)
  - [ ] `pnpm start:server` (Fastify API).
  - [ ] `pnpm start:dms-material` (Angular dev server, port 4301).
  - [ ] Use Playwright MCP to re-run **one** representative `FAIL` cell from 105.1's
        matrix and confirm the artifact still reproduces on `main` before changing any
        production code. If the artifact has spontaneously stopped reproducing, **HALT**
        and investigate before proceeding (something else fixed it; 105.1's matrix may be
        stale).
  - [ ] Re-run a `clean` baseline cell from 105.1 (freshly-loaded screen, no context
        change) and confirm it still passes. If not, that is a Round-7 regression — stop
        and escalate (do NOT bury it in this story's diff).

- [ ] **Task 3 — Confirm-or-eliminate each candidate per `FAIL` cell** (AC: #2)
  - [ ] For each candidate from 105.1, capture live-DOM evidence via Playwright MCP
        (DevTools or `page.evaluate`) **at the moment the artifact is reproducing** (i.e.
        immediately after the context change, mid-slow-scroll). Per candidate, record
        CONFIRMED or ELIMINATED with the evidence:
    - [ ] **C1 — CDK viewport `_renderedRange` not reset on data-source swap.** Inspect
          `cdk-virtual-scroll-viewport`'s `_renderedRange` (or whichever property the
          installed CDK version exposes) before vs after the context change. Look for
          stale `{ start, end }` values pointing into the OLD dataset's index range.
    - [ ] **C2 — Sticky containing-block re-created by structural directive.** Walk the
          ancestor chain from the sticky `<thead>` upward; check whether any ancestor
          element identity changes across the context-change boundary (use a unique
          attribute / `WeakRef` or DevTools "Break on subtree modifications"). A
          recreated ancestor is the smoking gun.
    - [ ] **C3 — Row-identity churn (selector returns new array; same/different keys).**
          Add a temporary `console.log` in the affected screen's `trackBy` (e.g.
          `open-positions.component.ts`) and log `(row, index, identity)`. Confirm
          whether the same logical row keeps the same `trackBy` key across the swap.
    - [ ] **C4 — Conditional ancestor `transform` / `will-change` / `contain` during
          loading.** Capture computed style of every ancestor between `<html>` and
          `<thead>` while the loading-state class/attribute is active. Flag any of:
          `transform != none`, `will-change != auto`, `contain != none|style`,
          `filter != none`, `perspective != none`, `backdrop-filter != none`.
    - [ ] **C5 — `isLoading → null` array shrink (Epic 60 mechanism).** Trace the
          per-screen pipeline (`open-positions.component.ts`, etc.) and confirm whether
          the new account's first batch transits through an `isLoading` filter that
          temporarily empties the rows array. If yes, capture row-count before / during
          / after.
  - [ ] Document findings in Dev Notes under "Root Cause Investigation" — one subsection
        per candidate, each labelled CONFIRMED or ELIMINATED with the concrete evidence.

- [ ] **Task 4 — Implement the targeted root-cause fix** (AC: #3, #8, #9)
  - [ ] Apply the **minimal** code change that eliminates the confirmed root cause(s).
        Do not refactor opportunistically — every line of diff in this story must be
        traceable to evidence from Task 3.
  - [ ] Per-candidate fix guidance (apply only the one(s) Task 3 confirmed):
    - [ ] **If C1 (viewport `_renderedRange` not reset):** trigger an explicit reset on
          data-source swap. Options (pick whichever the Angular CDK version supports
          cleanly): call `viewport.scrollToOffset(0)` in the data-pipeline `effect()`
          when the underlying signal changes; subscribe to `viewport.renderedRangeStream`
          and force a re-measure via `viewport.checkViewportSize()` after the swap; or
          re-bind the `cdkVirtualForOf` data source so CDK treats it as a new source.
          Keep the change in `base-table.component.ts` if possible (single point of
          fix); only push it into per-screen components if absolutely required.
    - [ ] **If C2 (sticky containing-block re-created):** identify the structural
          directive (e.g. `*ngIf` / `@if` / `*ngFor` toggling on a wrapper) that is
          destroying-and-recreating the sticky-header ancestor. Restructure so the
          sticky header's containing block survives the context change — typically by
          moving the loading-state toggle to a sibling overlay rather than wrapping the
          table.
    - [ ] **If C3 (row-identity churn):** ensure `trackBy` keys on a stable primary key
          (e.g. `trade.id`, `position.id`, `dividend.id` — never on a derived/composite
          object). Verify the upstream SmartNgRX/SmartSignals selector returns
          referentially stable rows when the underlying data hasn't changed; if it
          doesn't, fix the selector (do not paper over it in `trackBy`). Cross-reference
          with the Epic 95–97 symbol-on-server refactor (joined `Universe` object may
          be re-instantiated per fetch — `trackBy` must NOT depend on it).
    - [ ] **If C4 (conditional `transform`/`will-change`/`contain` during loading):**
          remove the offending property from the loading-state CSS class, OR move the
          loading indicator to a subtree that does not contain the sticky-header
          ancestor chain. Do NOT re-introduce `contain: paint` / `contain: layout` /
          `contain: strict` on `.virtual-scroll-viewport` — that would re-break Round 7
          (see Story 101.2's fix).
    - [ ] **If C5 (`isLoading → null` array shrink):** restore the prior round's pattern
          (Epic 60 / 64) — keep a stable row count across the loading transition by
          either preserving the previous data until the new data arrives, or by emitting
          stable placeholder rows of the same height (rather than emptying the array).
  - [ ] Preserve `inject()` (no constructor injection), `OnPush` change detection, and
        signal-first state on every component touched (NFR4 / AC9).
  - [ ] **Update the SCROLLING REGRESSION HISTORY comment block** at the top of
        `apps/dms-material/src/app/shared/components/base-table/base-table.component.ts`
        with a new Round-8 / Epic-105 entry, in the same style as the existing entries
        (Epic 29 → Epic 101). Include: stated root cause, the actual fix, the structural
        constraint preserved (e.g. "data-source swap MUST trigger CDK viewport reset",
        or "sticky-header containing-block ancestor MUST survive context-change
        loading-state toggles"). Each modified file that is a primary site of the fix
        gets a brief inline comment pointing back to the central history block.

- [ ] **Task 5 — Verify the fix with Playwright MCP on live data** (AC: #4, #5)
  - [ ] Confirm `pnpm start:server` and `pnpm start:dms-material` are running on
        port 4301 with real production-scale data; log in as Dave.
  - [ ] Use Playwright MCP to drive the **exact** failure sequences from the Story 105.1
        reproduction matrix on every previously-failing
        `screen × browser × trigger × artifact` cell — both Chromium **and** Firefox,
        all viewport sizes that previously failed. The trigger sequence MUST mirror
        105.1: load → confirm clean baseline → context change (account swap **or**
        filter apply/clear) → slow-scroll (4px/16ms).
  - [ ] After each run, capture a screenshot/snapshot and visually confirm: no
        header-under-header, no flicker, no header-with-content drift.
  - [ ] Repeat the worst-failing sequence **3 additional times** per affected screen
        (AC #5); document each attempt's outcome in Dev Notes under "Live-Data
        Verification".
  - [ ] **If any artifact reappears on live data, the story is NOT done** — return to
        Tasks 3/4. Do NOT lower the bar of the matrix (NFR5: tests are authoritative;
        same applies to the Playwright-MCP verification matrix).

- [ ] **Task 6 — Re-run all prior-round scrolling E2E specs** (AC: #6)
  - [ ] Run the full set in both Chromium and Firefox:
    - `apps/dms-material-e2e/src/scrolling-regression-101.spec.ts` (Round 7 — primary
      no-regression gate)
    - `apps/dms-material-e2e/src/scrolling-regression-87.spec.ts` (Round 6)
    - `apps/dms-material-e2e/src/universe-scrolling-regression.spec.ts` (Round 1–5
      history)
    - `apps/dms-material-e2e/src/universe-smooth-scroll.spec.ts`
    - `apps/dms-material-e2e/src/open-positions-smooth-scroll.spec.ts`
    - `apps/dms-material-e2e/src/open-positions-scrolling-regression.spec.ts`
    - `apps/dms-material-e2e/src/sold-positions-scrolling-regression.spec.ts`
    - `apps/dms-material-e2e/src/div-deposits-smooth-scroll.spec.ts`
    - `apps/dms-material-e2e/src/div-deposits-scrolling-regression.spec.ts`
    - `apps/dms-material-e2e/src/screener-smooth-scroll.spec.ts`
  - [ ] Confirm all pass. Any failure is a Round-7 (or earlier) regression introduced by
        this story's fix and must be addressed before proceeding.

- [ ] **Task 7 — Un-`test.fail()` the 105.1 reproduction spec (if committed)** (AC: #7)
  - [ ] Check whether
        `apps/dms-material-e2e/src/scrolling-regression-105.spec.ts` exists (Story 105.1
        AC5 made it optional).
  - [ ] **If yes:** remove every `test.fail()` annotation and every
        `test.describe.skip()` wrapper added by 105.1; confirm every test now passes for
        real in both Chromium and Firefox.
  - [ ] **If no:** record in Dev Notes "Why no spec change in 105.2: Story 105.1 elected
        not to commit the reproduction spec; Story 105.3 owns the persistent regression
        suite for the context-change scenario."

- [ ] **Task 8 — Quality gate** (AC: #10)
  - [ ] Run `pnpm all`. Confirm all tests pass.
  - [ ] Run `pnpm format`. Confirm it is a no-op (no files changed).
  - [ ] Confirm `git diff --stat` only contains: this story file, the production-code
        files Task 4 modified (with evidence in Dev Notes pointing to each), the
        comment-block updates from Task 4, and (optionally) the un-`test.fail()`-ed
        Story 105.1 spec from Task 7. Anything else in the diff is out of scope.

- [ ] **Task 9 — Hand-off note for Story 105.3** (AC: #11)
  - [ ] In Dev Notes "Hand-off Note for Story 105.3", state:
        - The exact DOM invariant(s) the persistent regression suite must encode (e.g.
          "after a context change followed by 4px/16ms slow scroll across the full
          range, `abs(header.getBoundingClientRect().top − viewport.getBoundingClientRect().top) ≤ 1`
          on every frame, on every virtual-scrolled screen, in both browsers").
        - Which seed-helper(s) Story 105.3 should reuse (must include
          `seed-scroll-fetch-universe-ids.helper.ts` for the cross-account ID fetch,
          plus per-screen helpers — see 105.1 Dev Notes for the list).
        - The exact context-change driver pattern (UI control selector per screen;
          `currentAccountSignalStore` is a reference but the test must drive via the
          same UI control Dave uses, per 105.1 Dev Notes).
        - The structural constraint Story 105.3 must guard against silently
          re-introducing (e.g. `cdk-virtual-scroll-viewport` MUST trigger a
          `_renderedRange` reset on data-source swap; sticky-header containing-block
          ancestor MUST survive context-change loading-state toggles; `contain`
          shorthand on `.virtual-scroll-viewport` is forbidden — re-state from 101.2's
          structural-constraint paragraph).

## Dev Notes

### What This Story Is (And Isn't)

**Is:** the Round-8 root-cause + fix story. Equivalent of Story 101.2 in scope and
methodology, but targeting the **context-change** failure mode (account swap or filter
apply/clear) rather than the freshly-loaded case Round 7 closed.

**Isn't:**

- A reproduction story — that was 105.1.
- A persistent regression suite — that is 105.3.
- An architecture-doc / SCROLLING REGRESSION HISTORY appendix update beyond the
  in-source comment block in `base-table.component.ts` (per AC8). Architecture-doc
  updates, if any, are deferred to Story 105.3 or a follow-up.
- A workaround story. A `router.navigateByUrl(url, { onSameUrlNavigation: 'reload' })`
  on context change is explicitly out of scope and explicitly forbidden by AC3.

### Read 105.1 First (Non-negotiable)

This story MUST NOT begin without reading the full Dev Notes from Story 105.1
([105-1-reproduce-scrolling-after-account-filter-change.md](./105-1-reproduce-scrolling-after-account-filter-change.md)).
The reproduction matrix and the Live Root-Cause Candidates list are the specification for
this fix. Seven prior epics (29, 31, 44, 60, 64, 87, 101) have already done symptom-level
or partial-scope fixes — another speculative patch is not acceptable. The bar is: name
the root cause, point at the live-DOM evidence captured during Task 3, ship the minimal
fix, prove the matrix flips and Round-7 stays green.

### Why Round 8 Even Exists (failure-mode delta vs Round 7)

Round 7 (Epic 101 / Story 101.2) eliminated `contain: paint` on `.virtual-scroll-viewport`
and proved the freshly-loaded scrolling assertion `abs(headerTop − viewportTop) ≤ 2`
holds at every frame. Round 8 is the observation that those guarantees evaporate when the
**same screen** has its data swapped out by an account change or a filter change — i.e.
when the CDK virtual-scroll viewport is asked to re-host a new dataset without
unmounting. The failure manifests after the context-change trigger, not on first load.

### Candidates Under Investigation (closed set — from 105.1)

> Replace this list during Task 1 with the verbatim Live Root-Cause Candidates list from
> 105.1's Dev Notes. The list below is the epic-level template; 105.1 may have eliminated
> some entries already and added evidence-keyed details.

1. **C1 — CDK viewport `_renderedRange` not reset on data-source swap.**
   Files Story 105.2 will likely read:
   - `apps/dms-material/src/app/shared/components/base-table/base-table.component.ts/.html`
   - The per-screen data-pipeline file for each `FAIL` screen.

2. **C2 — Sticky containing-block re-created by structural directive on context change.**
   Files Story 105.2 will likely read:
   - `apps/dms-material/src/app/shared/components/base-table/base-table.component.html`
   - `apps/dms-material/src/app/shared/components/base-table/base-table.component.scss`
   - The per-screen wrapper templates (`global-universe`, `global-screener`,
     `open-positions`, `sold-positions`, `dividend-deposits`).

3. **C3 — Row-identity churn from selector returning new array reference but same row
   keys.**
   Files Story 105.2 will likely read:
   - The per-screen pipeline file + its `trackBy` definition.
   - The upstream SmartNgRX / SmartSignals selector(s).
   - Cross-reference Epic 95–97 (symbol-on-server) — joined `Universe` reference may be
     unstable per fetch.

4. **C4 — Conditional `transform` / `will-change` / `contain` ancestor during loading
   state.**
   Files Story 105.2 will likely read:
   - `apps/dms-material/src/app/shared/components/base-table/base-table.component.scss`
   - Any wrapper that toggles classes during loading (per-screen loading-state wrappers).
   - Forbidden: re-introducing `contain: paint` / `contain: layout` / `contain: strict`
     on the viewport (would re-break Round 7).

5. **C5 — `isLoading → null` array shrink (Epic 60 / 64 mechanism re-emerging on
   context-change loading state).**
   Files Story 105.2 will likely read:
   - The per-screen pipeline file (look for an `isLoading` filter that empties or
     shrinks the rows array during the swap).

### Live-Data Verification Is the Acceptance Gate (AC #4, #5)

E2E tests passing is **necessary but not sufficient**. Seven prior epics had E2E tests
green while the bug remained observable on real data; Story 101.2 explicitly raised this
gate. This story is not done until Task 5 (Playwright MCP on live app at port 4301, real
data, both browsers) completes without triggering any artifact, repeated 3× on the
worst-failing sequence per screen.

#### Live-Data Verification — fill in during Task 5

Confirm the screen list against 105.1's matrix; this template uses the Round-7 set.

| Screen | Browser | Trigger | Attempt 1 | Attempt 2 | Attempt 3 | Attempt 4 | Result |
|--------|---------|---------|-----------|-----------|-----------|-----------|--------|
| Universe | Chromium | account-change | | | | | |
| Universe | Chromium | filter-change  | | | | | |
| Universe | Firefox  | account-change | | | | | |
| Universe | Firefox  | filter-change  | | | | | |
| Open Positions | Chromium | account-change | | | | | |
| Open Positions | Chromium | filter-change  | | | | | |
| Open Positions | Firefox  | account-change | | | | | |
| Open Positions | Firefox  | filter-change  | | | | | |
| Sold Positions | Chromium | account-change | | | | | |
| Sold Positions | Chromium | filter-change  | | | | | |
| Sold Positions | Firefox  | account-change | | | | | |
| Sold Positions | Firefox  | filter-change  | | | | | |
| Dividend Deposits | Chromium | account-change | | | | | |
| Dividend Deposits | Chromium | filter-change  | | | | | |
| Dividend Deposits | Firefox  | account-change | | | | | |
| Dividend Deposits | Firefox  | filter-change  | | | | | |
| Screener | Chromium | filter-change | | | | | |
| Screener | Firefox  | filter-change | | | | | |
| _(any other screen flagged by 105.1)_ | | | | | | | |

### Application URLs (Round-7 set; confirm via 105.1)

| Screen            | URL                                                      |
| ----------------- | -------------------------------------------------------- |
| Universe          | `http://localhost:4301/universe`                         |
| Open Positions    | `http://localhost:4301/accounts/{id}/open-positions`     |
| Sold Positions    | `http://localhost:4301/accounts/{id}/sold-positions`     |
| Dividend Deposits | `http://localhost:4301/accounts/{id}/div-deposits`       |
| Screener          | `http://localhost:4301/screener`                         |

### Start Commands

```bash
pnpm start:server           # Fastify API
pnpm start:dms-material     # Angular dev server, port 4301
```

### Key Files (Read + Modify candidates — confirmed by Task 3 evidence)

| File | Role |
|------|------|
| `apps/dms-material/src/app/shared/components/base-table/base-table.component.ts` | Shared CDK virtual-scroll host; SCROLLING REGRESSION HISTORY block lives here. Primary candidate site for C1 / C2 / C4 fix. |
| `apps/dms-material/src/app/shared/components/base-table/base-table.component.html` | Sticky `<thead>` + `cdk-virtual-scroll-viewport` markup. Primary candidate site for C2. |
| `apps/dms-material/src/app/shared/components/base-table/base-table.component.scss` | Sticky-header CSS. Primary candidate site for C4 (DO NOT re-introduce `contain: paint` / `contain: strict` / `contain: layout`). |
| `apps/dms-material/src/app/global/global-universe/global-universe.component.ts/.html` | Universe data pipeline + sidebar account-change consumer. Possible site for C1 / C3 / C5. |
| `apps/dms-material/src/app/global/global-screener/global-screener.component.ts/.html` | Screener virtual-scroll host (filter trigger lives here). Possible site for C1 / C3. |
| `apps/dms-material/src/app/account-panel/open-positions/open-positions.component.ts/.html` | Open Positions data pipeline. Possible site for C1 / C3 / C5. |
| `apps/dms-material/src/app/account-panel/sold-positions/sold-positions.component.ts/.html` | Sold Positions data pipeline. Possible site for C1 / C3 / C5. |
| `apps/dms-material/src/app/account-panel/dividend-deposits/dividend-deposits.component.ts/.html` | Dividend Deposits data pipeline. Possible site for C1 / C3 / C5. |
| `apps/dms-material/src/app/account-panel/account-selection-integration.spec.ts` | Reference for `currentAccountSignalStore` / `selectCurrentAccountSignal`. Read-only. |
| `apps/dms-material-e2e/src/scrolling-regression-101.spec.ts` | Round-7 spec — must remain green (AC6). Read-only. |
| `apps/dms-material-e2e/src/scrolling-regression-105.spec.ts` (if 105.1 committed it) | Optional reproduction spec — un-`test.fail()` per Task 7. |

The exact files to modify are dictated by Task 3's evidence. Do not modify any file
without an evidence trail in Dev Notes pointing to it.

### Forbidden Workarounds (re-stating AC3 for prominence)

- **No forced full-page reload on account change.** Specifically excluded:
  `location.reload()`, `router.navigateByUrl(url, { onSameUrlNavigation: 'reload' })`,
  `RouteReuseStrategy.shouldReuseRoute = () => false`, destroying-and-recreating the
  table component on context change via `*ngIf`/`@if` flicker, or any equivalent that
  achieves the same effect by re-mounting.
- **No `contain: paint` / `contain: layout` / `contain: strict`** on
  `.virtual-scroll-viewport` or any ancestor of the sticky `<thead>`. Story 101.2
  explicitly removed this; re-introducing it would re-break Round 7.
- **No `rowHeight` adjustment** (Epic 29 territory).
- **No `isLoading` placeholder mass-rewrite** beyond the minimum needed to fix C5 if C5
  is confirmed (Epic 60 / 64 territory).
- **No `position: sticky` / `will-change: transform` band-aid** masking the actual
  cause.
- **No weakening of test assertions** to make `pnpm all` pass (NFR5 / AC9).

### Required Comment in Fix (AC #8) — pattern reference

Update the SCROLLING REGRESSION HISTORY block at the top of
`base-table.component.ts` (style established by Story 87.2 and extended by Story 101.2):

```typescript
/**
 * SCROLLING REGRESSION HISTORY — DO NOT SIMPLIFY THIS CODE:
 * Epic 29:  rowHeight mismatch → CDK total scroll height wrong
 * Epic 31:  contain:strict on sticky header → jump on viewport recalc
 * Epic 44:  CSS transitions + extra CD cycles → CDK recalc mid-scroll
 * Epic 60:  isLoading filter shrank array → CDK recalculated total height
 * Epic 64:  Edge case follow-up to Epic 60 (different code path)
 * Epic 87:  [root cause from Story 87.1 / 87.2 dev notes]
 * Epic 101: contain:paint on .virtual-scroll-viewport → CSS Containment Level 2
 *           promoted it to contain:layout → IFC formed → sticky resolver lost
 *           anchor → slow-scroll header drift on freshly-loaded screens
 * Epic 105: [root cause from Story 105.2 — fill in: which candidate confirmed,
 *           the actual fix, the structural constraint preserved for context
 *           changes (account swap / filter apply-clear) without unmounting]
 *
 * Structural constraint: [restate the constraint that this fix preserves —
 * e.g. "data-source swap on cdk-virtual-scroll-viewport MUST trigger a
 * _renderedRange reset", or "sticky-header containing-block ancestor MUST
 * survive context-change loading-state toggles", or whichever applies]
 */
```

Each modified file that is a primary site of the fix gets a brief inline reference
comment pointing at this central history block.

### Hand-off Note for Story 105.3 — fill in during Task 9

> Replace this section after the fix is verified. Document:
> - The exact DOM invariant Story 105.3's regression suite must encode (the assertion
>   that would have caught Round 8 if it had existed).
> - The seed-helper composition for the multi-account dataset (must include
>   `seed-scroll-fetch-universe-ids.helper.ts`).
> - The context-change driver pattern (UI control selector per screen).
> - The structural constraint Story 105.3 must guard against silently re-introducing.

### Angular Zoneless / OnPush / Signal-First Constraints (NFR4 / AC9)

The app uses `provideZonelessChangeDetection()`. This means:

- Change detection is triggered only by signal updates,
  `ChangeDetectorRef.markForCheck()`, or explicit `inject(ChangeDetectorRef)` calls.
- Any data update that doesn't go through signals will not trigger re-render.
- Use `inject()` — never constructor injection.
- Preserve OnPush on every component touched.
- If the fix involves additional signal updates feeding the visible-rows pipeline
  (likely for C1 / C3 / C5), batch them so the template renders **once per scroll
  frame**, not multiple times. Use `untracked` or a single `set` to consolidate.

### Tests Are Authoritative (NFR5)

Do not weaken or skip any failing test to make `pnpm all` pass. If a previously passing
test starts failing because of this fix, the fix is wrong — not the test. Restore the
test's contract by adjusting the implementation. Same applies to the Playwright-MCP
verification matrix in Task 5: do not lower the bar to declare a `clean` cell.

### Browsers

Both Chromium and Firefox must be exercised — Epic 105 explicitly calls out NFR coverage
across both. Safari/WebKit is **not** in the project's supported matrix.

### Symbol-on-Server Refactor Context (Epics 95–97)

Epics 95, 96, 97 moved symbol/universe data to a server-joined `Universe` row delivered
inside each Trade DTO, deleting the client-side `buildUniverseMap`. If the server is
returning a fresh `universe` object per response (Prisma typically does), every
account-panel row's reference changes per fetch — even when the underlying data did not.
That is a strong driver for C3 (row-identity churn) on the per-account panels. When
investigating C3:

- The `trackBy` function on each affected screen — must key on a stable primary key
  (e.g. `trade.id`, `position.id`, `dividend.id`), never on the joined object reference.
- The upstream SmartNgRX selector — does it project rows that are referentially stable
  when the data hasn't changed?

### Account-Change Trigger Mechanics

`apps/dms-material/src/app/account-panel/account-selection-integration.spec.ts` shows
how the account selection signal works:

- `currentAccountSignalStore.setCurrentAccountId(...)` is the underlying state mutation.
- `selectCurrentAccountSignal` is the consumer signal.

For the live-data verification (Task 5) and any new test code, drive the swap via the
**UI control** Dave actually uses (sidebar or toolbar account dropdown — confirm against
105.1 Task 1 findings), not by calling the store directly.

### Filter-Change Trigger Mechanics

Column filters are hosted by `base-table.component`. The Universe and Screener screens
may also expose global filter chips / search inputs at the page level. Exercise both
per-column and global filters where they exist (per 105.1 matrix).

### Out of Scope for THIS Story

- Building the persistent regression test suite — that is **Story 105.3**.
- Updating `architecture.md` with the Round-8 root cause and guardrails (deferred to
  Story 105.3 or follow-up; the in-source comment block per AC8 is the only doc update
  this story owns).
- The reproduction matrix itself — that was **Story 105.1**.
- Re-investigation of the freshly-loaded case (Round 7 / Epic 101 closed it).
- Safari/WebKit reproduction.
- Any refactor or improvement not directly required by the confirmed root-cause fix.

### Project Conventions Reminder

(From `_bmad-output/project-context.md`.)

- Angular 21 zoneless, `inject()` only, `OnPush` everywhere, signal-first state.
- SmartNgRX / SmartSignals for state.
- Vitest for unit, Playwright (Chromium + Firefox) for E2E.
- `pnpm all` must pass after every story.
- Tests are authoritative — do not weaken assertions to make a test pass.
- Playwright **MCP server** must be used for the live-app verification (per epic NFR3
  / 105.1 NFR carry-over).

### Project Structure Notes

- All paths align with the existing project layout (no new directories).
- No new test files created in this story (Story 105.3 owns the persistent suite). The
  optional `scrolling-regression-105.spec.ts` from 105.1 is only modified (Task 7), not
  created here.
- Helpers: read-only reuse; no new files under `apps/dms-material-e2e/src/helpers/`.

### References

- [_bmad-output/planning-artifacts/epics-2026-05-13.md](../planning-artifacts/epics-2026-05-13.md) — Epic 105 source spec (Story 105.2 section)
- [105-1-reproduce-scrolling-after-account-filter-change.md](./105-1-reproduce-scrolling-after-account-filter-change.md) — Round-8 reproduction matrix + Live Root-Cause Candidates (this story's specification)
- [101-2-root-cause-and-fix-scrolling.md](./101-2-root-cause-and-fix-scrolling.md) — Round-7 root-cause + fix (pattern reference; structural constraint to preserve)
- [101-3-scrolling-regression-suite.md](./101-3-scrolling-regression-suite.md) — Round-7 persistent regression suite (sets the bar for 105.3)
- [101-4-update-architecture-scrolling-guardrails.md](./101-4-update-architecture-scrolling-guardrails.md) — Architecture-doc guardrails added by Round 7
- [87-2-fix-scrolling-all-screens.md](./87-2-fix-scrolling-all-screens.md) — Established the citation comment pattern + live-data verification gate
- [apps/dms-material-e2e/src/scrolling-regression-101.spec.ts](../../apps/dms-material-e2e/src/scrolling-regression-101.spec.ts) — Round-7 reproduction spec (the no-regression gate for AC6)
- [apps/dms-material-e2e/src/universe-scrolling-regression.spec.ts](../../apps/dms-material-e2e/src/universe-scrolling-regression.spec.ts) — File-header SCROLLING REGRESSION HISTORY (Epics 29 → 65)
- [apps/dms-material/src/app/shared/components/base-table/base-table.component.ts](../../apps/dms-material/src/app/shared/components/base-table/base-table.component.ts) — SCROLLING REGRESSION HISTORY block (must be updated with Round-8 entry per AC8)
- [apps/dms-material/src/app/account-panel/account-selection-integration.spec.ts](../../apps/dms-material/src/app/account-panel/account-selection-integration.spec.ts) — Account-change signal reference
- [_bmad-output/project-context.md](../project-context.md) — Project-wide rules
- This story enables Story 105.3 (persistent regression suite for the context-change scenario).

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
