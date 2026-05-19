# Story 106.2: Root-Cause and Fix Scrolling Artifacts on Account / Filter Change

Status: Approved

**Story Key:** `106-2-root-cause-and-fix-scrolling`
**Epic:** 106 — Janky Scrolling After Account / Filter Change (Round 9)
**Source:** [_bmad-output/planning-artifacts/epics-2026-05-19.md](../planning-artifacts/epics-2026-05-19.md) (Story 106.2)
**Type:** Implementation (root-cause investigation + targeted production-code fix)
**Depends on:** Story 106.1 (reproduction matrix + live root-cause candidate list — must be `Done`)
**Enables:** Story 106.3 (persistent regression suite for the context-change scenario)

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As Dave,
I want the scrolling artifacts that reappear after I change the active account or change a
filter to be eliminated by a fix that targets the actual root cause — without regressing
the Epic-101 (Round 7) or Epic-105 (Round 8) freshly-loaded fixes,
So that I can switch accounts / apply filters and keep scrolling cleanly without having
to refresh the page.

## Epic Context

**Epic 106 Goal:** Epic 101 (Round 7) eliminated header-under-header, flicker, and
header-with-content drag on **freshly loaded** screens. Epic 105 (Round 8) added a
`contextId` input + per-screen `contextKey$` computed signal so the CDK virtual-scroll
viewport scrolls to index 0 on account / filter change, restoring clean scrolling for
that trigger on the screens covered. **Round 9 is the observation that the artifacts
return again** on at least one screen × trigger combination not fully covered by
Round 8 — i.e. the context-change pipeline still leaves the virtual scroller, the
sticky header, or their shared layout state in a different condition than a freshly
loaded screen on some path Story 105.2 did not close.

This story (106.2) is the **root-cause + fix** story for Round 9. It must:

1. Consume Story 106.1's reproduction matrix and live root-cause candidate list as
   the specification — do NOT speculate or open new candidates without evidence.
2. Confirm exactly which candidate(s) are present in the live DOM via Playwright MCP.
3. Apply a targeted, minimal fix that eliminates the artifact at its root cause.
4. Re-run Story 106.1's reproduction matrix and prove every previously-failing cell
   is now `clean` — across every screen, both browsers, every viewport.
5. Re-run the Epic-101 freshly-loaded regression suite
   (`scrolling-regression-101.spec.ts`) **and** the Epic-105 context-change suite
   (`scrolling-regression-105.spec.ts`) and prove no Round-7 / Round-8 regression.
6. Add the Round-9 entry to the SCROLLING REGRESSION HISTORY comment block in
   `base-table.component.ts` so Round 10 never starts.

**Hard rule:** The fix MUST target the root cause directly. A "force a full reload on
account / filter change" workaround (e.g.
`router.navigateByUrl(url, { onSameUrlNavigation: 'reload' })`, `location.reload()`, or
destroying the table component on context change) is explicitly forbidden — that is a
symptom-level patch and is rejected by AC3.

## Acceptance Criteria

1. **AC1 — Story 106.1 evidence is the specification.**
   **Given** Story 106.1 (`106-1-reproduce-scrolling-all-screens.md`) is `Done` and
   contains the reproduction matrix + Live Root-Cause Candidates list,
   **When** the developer begins this story,
   **Then** Dev Notes record (a) confirmation that 106.1 is `Done`, (b) a verbatim copy
   (or summary with explicit cell-by-cell coverage) of 106.1's reproduction matrix as
   the target inventory of cells that must flip from `FAIL` → `clean`, and (c) the
   candidate list 106.1 enumerated (including which Story 105.2 mechanism, if any,
   106.1 found to be incomplete). **HALT** if 106.1 is not `Done`.

2. **AC2 — Root cause is confirmed with live-DOM evidence (not assumed).**
   **Given** the candidates from 106.1 (CDK viewport `_renderedRange` not reset on
   data-source swap; sticky containing-block re-creation by a structural directive on
   context change; row-identity churn from a SmartNgRX/SmartSignals selector returning a
   new array reference but stale row identities; conditional ancestor
   `transform`/`will-change`/`contain` during the loading state; Story 105.2's
   `contextKey$` not firing on a particular trigger or screen; `isLoading → null` array
   shrink — Epic 60 mechanism),
   **When** the developer investigates each candidate per `FAIL` cell using Playwright
   MCP against the live app (port 4301, real data, both Chromium and Firefox),
   **Then** Dev Notes identify exactly which candidate(s) are confirmed present, with
   evidence per candidate (DOM ancestor walk, computed-style snapshot, CDK viewport
   `_renderedRange` value, `trackBy` identity log, signal/effect trace including
   `contextKey$` emission log, or DevTools Performance/Layers capture). Candidates not
   supported by live evidence are explicitly marked **eliminated** with the reason.

3. **AC3 — Fix targets the root cause directly (not a workaround).**
   **Given** the actual root cause is identified per AC2,
   **When** the fix is implemented,
   **Then** the change targets the root cause directly with rationale documented in Dev
   Notes, and is **NOT** any of:
   - A forced full-page reload on account / filter change (e.g. `location.reload()`,
     `router.navigateByUrl(url, { onSameUrlNavigation: 'reload' })`,
     `RouteReuseStrategy.shouldReuseRoute = () => false`, or any code path whose
     effect is to destroy/recreate the screen component on context change).
   - Another `rowHeight` adjustment (Epic 29 territory).
   - Another `isLoading` placeholder tweak (Epic 60 / 64 territory).
   - A re-introduction of `contain: paint` / `contain: strict` / `contain: layout` on
     the virtual-scroll viewport or its ancestors (would re-break Round 7 — Story
     101.2's fix was to REMOVE `contain: paint`).
   - A `position: sticky` / `will-change: transform` band-aid masking another problem.
   - Removal or weakening of Story 105.2's `contextId` / `contextKey$` mechanism
     unless 106.1 evidence proves that mechanism is itself the root cause; in that
     case Dev Notes must explicitly justify the replacement and demonstrate the
     Epic-105 reproduction matrix still passes with the replacement in place.

4. **AC4 — Reproduction matrix from 106.1 fully passes after the fix.**
   **Given** the fix is applied,
   **When** the Playwright MCP server is used against the **live application** (port
   4301, real production-scale data, logged in as Dave) to re-run the **exact** failure
   sequences from Story 106.1's reproduction matrix across every previously-failing
   `screen × browser × trigger × artifact` cell,
   **Then** every previously-failing cell now passes — no header-under-header, no
   flicker, no header-with-content drift — at all tested scroll speeds and viewport
   sizes.

5. **AC5 — Worst-failing cell verified consistent (not a fluke).**
   **Given** AC4 passes,
   **When** the developer repeats the worst-failing scroll sequence (per affected
   screen) **3 additional times** via Playwright MCP,
   **Then** none of the artifacts reappear on any of the 3 additional attempts.

6. **AC6 — Epic-101 and Epic-105 regression suites still green (no Round-7 / Round-8
   regression).**
   **Given** the existing Round-7 spec
   `apps/dms-material-e2e/src/scrolling-regression-101.spec.ts`, the Round-8 spec
   `apps/dms-material-e2e/src/scrolling-regression-105.spec.ts`, and the Round-1..6
   specs (`universe-scrolling-regression.spec.ts`, `scrolling-regression-87.spec.ts`,
   the per-screen `*-scrolling-regression.spec.ts` and `*-smooth-scroll.spec.ts`
   files),
   **When** they are re-run in both Chromium and Firefox,
   **Then** every assertion passes. The Round-9 fix has not regressed any prior round.

7. **AC7 — Optional: 106.1 reproduction spec, if committed, is un-`test.fail()`-ed.**
   **Given** Story 106.1 may have committed
   `apps/dms-material-e2e/src/scrolling-regression-106.spec.ts` as a `test.fail()`-
   or `test.fixme()`-annotated reproduction spec,
   **When** this story's fix is applied,
   **Then** every `test.fail()` / `test.fixme()` annotation in that spec is removed
   (or the `test.describe.skip()` wrapper removed) and every test passes for real. If
   106.1 did not commit the spec, this AC is **N/A** and Dev Notes state so —
   Story 106.3 still owns the persistent regression suite.

8. **AC8 — Citation comment block updated (Round-9 entry).**
   **Given** the fix is implemented,
   **When** a code reviewer inspects the change,
   **Then** the SCROLLING REGRESSION HISTORY comment block at the top of
   `apps/dms-material/src/app/shared/components/base-table/base-table.component.ts`
   has a new Round-9 / Epic-106 entry stating: stated root cause, what changed, and
   the structural constraint preserved. The comment style matches the existing
   Epic 29 → Epic 105 entries (see Story 87.2 / 101.2 / 105.2 for the established
   pattern). Every file modified in this story that is a primary site of the fix MUST
   also include a brief reference comment pointing back to the central history block
   (so future readers find it).

9. **AC9 — Angular zoneless / OnPush / signal-first conventions preserved (NFR4).**
   **Given** Angular 21 zoneless change detection, signal-first state, OnPush change
   detection, `inject()` (no constructor injection), and SmartNgRX/SmartSignals are
   project conventions,
   **When** the fix is implemented,
   **Then** no test assertion is weakened to make tests pass, no `inject()` is
   replaced with constructor injection, OnPush is preserved on every component
   touched, and any signal updates introduced are batched (via `untracked` or a
   single `set`) so they render once per scroll frame.

10. **AC10 — `pnpm all` passes (NFR1) and `pnpm format` is a no-op.**
    **Given** the fix is complete,
    **When** `pnpm all` and then `pnpm format` are run,
    **Then** all tests pass and `pnpm format` reports no changes required.

11. **AC11 — Hand-off note for Story 106.3 written.**
    **Given** the fix is verified,
    **When** Dev Notes are finalised,
    **Then** Dev Notes contain a "Hand-off Note for Story 106.3" subsection stating
    exactly which DOM invariant(s) the persistent regression suite must encode for
    the context-change scenario (i.e. the assertion that would have caught Round 9
    if it had existed) and which seed-helper / context-change driver Story 106.3
    should reuse. The note must distinguish what 106.3 covers from what
    `scrolling-regression-105.spec.ts` already covers, so 106.3 does not duplicate
    Round-8 coverage.

## Tasks / Subtasks

- [ ] **Task 1 — Read Story 106.1 Dev Notes; confirm `Done`** (AC: #1)
  - [ ] Open
        [`_bmad-output/implementation-artifacts/106-1-reproduce-scrolling-all-screens.md`](./106-1-reproduce-scrolling-all-screens.md)
        and read it in full — especially the reproduction matrix, the per-cell
        live-DOM evidence, the prior-epic review (including what Story 105.2 changed
        and what it missed), and the Live Root-Cause Candidates section.
  - [ ] Confirm 106.1 status is `Done`. **HALT** if not — this story cannot start
        without the reproduction matrix and candidate list.
  - [ ] Copy the reproduction matrix into Dev Notes under "Target Inventory (from
        106.1)" as the explicit list of cells that must flip from `FAIL` → `clean`.
  - [ ] Copy the Live Root-Cause Candidates list into Dev Notes under "Candidates
        Under Investigation" as the closed set this story is allowed to investigate.
        Do NOT add speculative candidates not in 106.1's list — if a new candidate is
        needed, it means 106.1 was incomplete; loop back through `correct-course`
        first.

- [ ] **Task 2 — Start the local stack and reconfirm baseline + reproduction** (AC: #2)
  - [ ] `pnpm start:server` and `pnpm start:dms-material` (port 4301). Log in as
        Dave.
  - [ ] Re-execute 106.1's worst-failing cell via Playwright MCP exactly as
        recorded; confirm the artifact still reproduces. **HALT** if it does not —
        environment drift; loop back to 106.1's seed helpers.
  - [ ] Capture a Performance/Layers trace for the reproducing cell to use as the
        baseline for Task 3.

- [ ] **Task 3 — Confirm-or-eliminate each candidate per `FAIL` cell** (AC: #2)
  - [ ] For each candidate from 106.1, use Playwright MCP `page.evaluate()` to read
        the live DOM at the moment of failure:
    - **C1 — CDK viewport `_renderedRange` after data-source swap:** read
      `viewport._renderedRange` before and after the context change; record
      whether it resets, whether `scrollToIndex(0)` was actually called (i.e.
      whether Story 105.2's `contextKey$` emitted), and whether
      `viewport.elementRef.nativeElement.scrollTop` is 0 immediately after the
      swap.
    - **C2 — Sticky containing-block re-created:** walk ancestors of
      `<thead>`, log `transform` / `will-change` / `contain` / `overflow` /
      `position` for each, before and after the context change.
    - **C3 — Row-identity churn (SmartNgRX / SmartSignals):** log
      `trackBy` keys for the first N rows before and after the trigger; record
      whether the array reference changed but row identities are stale.
    - **C4 — Conditional ancestor `transform`/`will-change`/`contain` during
      loading state:** toggle the loading state and snapshot computed styles
      on every ancestor of `<thead>` during the transient.
    - **C5 — Story 105.2 `contextKey$` not firing for this trigger / screen:**
      add a temporary `effect(() => console.log('contextKey', contextKey$()))`
      to the affected screen and record whether the key emits on the failing
      trigger; if it does not, identify which signal in the key formula is not
      being read or is not being updated.
    - **C6 — `isLoading → null` array shrink (Epic 60 mechanism):** record
      array length transitions through the context change.
  - [ ] For each candidate, record in Dev Notes either **CONFIRMED** with cited
        evidence, or **ELIMINATED** with the reason. At least one candidate must be
        CONFIRMED — if none are, 106.1 is incomplete; HALT and loop back.

- [ ] **Task 4 — Implement the targeted root-cause fix** (AC: #3, #8, #9)
  - [ ] Implement the minimal change that addresses the CONFIRMED candidate(s).
  - [ ] Preserve OnPush, `inject()`, signal-first conventions (AC9). Batch signal
        updates via `untracked` / single `set`.
  - [ ] Do NOT use any of the forbidden workarounds listed in AC3.
  - [ ] Add Round-9 / Epic-106 entry to the SCROLLING REGRESSION HISTORY comment
        block at the top of `base-table.component.ts` per AC8.
  - [ ] Add brief reference comments in every other primary-fix-site file pointing
        back to that central history block.

- [ ] **Task 5 — Verify the fix with Playwright MCP on live data** (AC: #4, #5)
  - [ ] Re-run every cell in 106.1's reproduction matrix via Playwright MCP against
        the live app. Fill the Live-Data Verification table below.
  - [ ] For the worst-failing cell per screen, repeat the failing scroll sequence
        3 additional times; record results.

- [ ] **Task 6 — Re-run all prior-round scrolling E2E specs** (AC: #6)
  - [ ] Run `pnpm exec nx e2e dms-material-e2e --skip-nx-cache` (Chromium and
        Firefox projects). Confirm
        `scrolling-regression-101.spec.ts`,
        `scrolling-regression-105.spec.ts`,
        `scrolling-regression-87.spec.ts`,
        `universe-scrolling-regression.spec.ts`, and the per-screen
        `*-scrolling-regression.spec.ts` / `*-smooth-scroll.spec.ts` files all pass.

- [ ] **Task 7 — Un-`test.fail()` the 106.1 reproduction spec (if committed)** (AC: #7)
  - [ ] If `scrolling-regression-106.spec.ts` exists, remove every `test.fail()` /
        `test.fixme()` annotation (inline and declaration forms) and any
        `test.describe.skip()` wrapper. Confirm every test passes for real.
  - [ ] If the spec does not exist, mark AC7 N/A in Dev Notes.

- [ ] **Task 8 — Quality gate** (AC: #10)
  - [ ] `pnpm all` → green.
  - [ ] `pnpm format` → no-op (no changes required).

- [ ] **Task 9 — Hand-off note for Story 106.3** (AC: #11)
  - [ ] Write the "Hand-off Note for Story 106.3" subsection in Dev Notes per AC11
        (DOM invariant, distinction from `scrolling-regression-105.spec.ts`,
        seed helpers, context-change drivers per screen).

## Dev Notes

### What This Story Is (And Isn't)

**Is:** the Round-9 root-cause + fix story. Equivalent of Story 101.2 / 105.2 in
scope and methodology, but targeting whichever context-change failure mode survived
Story 105.2's `contextKey$` mechanism.

**Isn't:**

- A reproduction story — that is 106.1.
- A persistent regression suite — that is 106.3.
- An architecture-doc / SCROLLING REGRESSION HISTORY appendix update beyond the
  in-source comment block in `base-table.component.ts` (per AC8). Architecture-doc
  updates, if any, are deferred to Story 106.3 or a follow-up.
- A workaround story. A `router.navigateByUrl(url, { onSameUrlNavigation: 'reload' })`
  on context change is explicitly out of scope and explicitly forbidden by AC3.
- A wholesale rewrite of Story 105.2's `contextId` / `contextKey$` mechanism. That
  mechanism stays unless 106.1 evidence proves it is the root cause of Round 9.

### Read 106.1 First (Non-negotiable)

This story MUST NOT begin without reading the full Dev Notes from Story 106.1
(`106-1-reproduce-scrolling-all-screens.md`). The reproduction matrix, the Live
Root-Cause Candidates list, and the explicit review of what Story 105.2 changed
(and what it did not cover) are the specification for this fix. Eight prior epics
(29, 31, 44, 60, 64, 87, 101, 105) have already done symptom-level, scoped, or
trigger-specific fixes — another speculative patch is not acceptable. The bar is:
name the root cause, point at the live-DOM evidence captured during Task 3, ship
the minimal fix, prove the matrix flips, and prove Round 7 and Round 8 stay green.

### Why Round 9 Even Exists (failure-mode delta vs Round 8)

Round 7 (Epic 101) eliminated `contain: paint` on `.virtual-scroll-viewport`. Round 8
(Epic 105 / Story 105.2) added a `contextId` input on `BaseTableComponent` and per-
screen `contextKey$` computed signals so that, on account / filter change, the CDK
viewport calls `scrollToIndex(0)`, reconciling its scroll position and re-measuring
sticky-header layout from a clean baseline. The Round-8 spec
`scrolling-regression-105.spec.ts` switched its header selector from
`tr.mat-mdc-header-row` to `th.mat-mdc-header-cell` to measure the actual sticky
element.

Round 9 is the observation that those guarantees evaporate again on at least one
screen × trigger combination not closed by Round 8. The failure manifests after a
context-change trigger Story 106.1 found Round 8 did not handle. Candidates the
investigation must rule in or out:

- A screen whose `contextKey$` formula in Story 105.2 omits a signal that is also a
  "context change" (e.g. an additional filter signal not included in the key).
- A screen wired in Story 105.2 whose `effect()` in `BaseTableComponent` fires but
  `scrollToIndex(0)` runs before the CDK viewport has the new data source connected
  — racing the data swap.
- A trigger path (e.g. browser back/forward navigation, programmatic
  `router.navigate`, or `Router.events` activation) that does not change any signal
  in the `contextKey$` formula and so does not call `scrollToTop()`.
- A SmartNgRX/SmartSignals selector that returns a new array reference but stale
  row identities, so `trackBy` reuses DOM rows whose measured heights no longer
  match the new content.
- The remaining Epic-60 mechanism on a path Story 105.2 did not affect
  (`isLoading → null` array shrink during the trigger transient).

The CONFIRMED candidate(s) for this story are determined by Task 3 evidence, not
by speculation here.

### Root Cause Investigation (Task 3 findings — to be filled by dev)

Populate one subsection per candidate from 106.1 with **CONFIRMED** or
**ELIMINATED** plus cited evidence (Playwright MCP `page.evaluate()` outputs,
DevTools Layers/Performance captures, signal-emission logs).

#### C1 — CDK viewport `_renderedRange` / `scrollTop` after data-source swap

#### C2 — Sticky containing-block ancestor styles before vs after context change

#### C3 — Row-identity churn (SmartNgRX / SmartSignals selector)

#### C4 — Conditional ancestor `transform`/`will-change`/`contain` during loading

#### C5 — Story 105.2 `contextKey$` firing for the failing trigger / screen

#### C6 — `isLoading → null` array shrink (Epic 60 mechanism)

#### Conclusion

State the CONFIRMED root cause(s) in one paragraph with the single most damning
piece of evidence cited.

### Fix Implemented (Task 4 — to be filled by dev)

State the chosen fix in one paragraph, then list:

- **Mechanism:** what code construct (signal, effect, input, lifecycle hook,
  CSS rule, etc.) implements the fix and why it addresses the CONFIRMED candidate.
- **Why this and not a workaround:** explicit mapping to AC3's forbidden list,
  showing the chosen fix is not any of them.
- **Files changed:** table with file → change summary.
- **Interaction with Story 105.2's `contextId` / `contextKey$`:** explicit
  statement of whether the Round-8 mechanism is preserved, extended, or replaced,
  and why.

#### Files changed

| File | Change |
|------|--------|
| `base-table.component.ts` | SCROLLING REGRESSION HISTORY Epic 106 entry + any code change per Task 4 |
| _(other files per Task 3 evidence)_ | |
| `scrolling-regression-106.spec.ts` (if committed by 106.1) | `test.fail()` / `test.fixme()` annotations removed |
| `106-2-root-cause-and-fix-scrolling.md` | This file |

### Live-Data Verification (Task 5)

Confirm the screen × trigger list against 106.1's matrix; this template uses the
Epic-105 Round-8 set as the starting point — add / remove rows to match 106.1.

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
| _(any other screen flagged by 106.1)_ | | | | | | | |

### Application URLs (Round-8 set; confirm via 106.1)

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
| `apps/dms-material/src/app/shared/components/base-table/base-table.component.ts` | Shared CDK virtual-scroll host; SCROLLING REGRESSION HISTORY block lives here. Hosts Story 105.2's `contextId` input + `effect()`. Primary candidate site for C1 / C2 / C4 / C5 fix. |
| `apps/dms-material/src/app/shared/components/base-table/base-table.component.html` | Sticky `<thead>` + `cdk-virtual-scroll-viewport` markup. Primary candidate site for C2. |
| `apps/dms-material/src/app/shared/components/base-table/base-table.component.scss` | Sticky-header CSS. Primary candidate site for C4 (DO NOT re-introduce `contain: paint` / `contain: strict` / `contain: layout`). |
| `apps/dms-material/src/app/global/global-universe/global-universe.component.ts/.html` | Universe data pipeline + sidebar account-change consumer. Hosts Story 105.2's `contextKey$`. Possible site for C1 / C3 / C5. |
| `apps/dms-material/src/app/global/global-screener/global-screener.component.ts/.html` | Screener virtual-scroll host (filter trigger lives here). Hosts Story 105.2's `contextKey$`. Possible site for C1 / C3 / C5. |
| `apps/dms-material/src/app/account-panel/open-positions/open-positions.component.ts/.html` | Open Positions data pipeline. Hosts Story 105.2's `contextKey$`. Possible site for C1 / C3 / C5 / C6. |
| `apps/dms-material/src/app/account-panel/sold-positions/sold-positions.component.ts/.html` | Sold Positions data pipeline. Hosts Story 105.2's `contextKey$`. Possible site for C1 / C3 / C5 / C6. |
| `apps/dms-material/src/app/account-panel/dividend-deposits/dividend-deposits.component.ts/.html` | Dividend Deposits data pipeline. Hosts Story 105.2's `contextKey$`. Possible site for C1 / C3 / C5 / C6. |
| `apps/dms-material/src/app/account-panel/account-selection-integration.spec.ts` | Reference for `currentAccountSignalStore` / `selectCurrentAccountSignal`. Read-only. |
| `apps/dms-material-e2e/src/scrolling-regression-101.spec.ts` | Round-7 spec — must remain green (AC6). Read-only. |
| `apps/dms-material-e2e/src/scrolling-regression-105.spec.ts` | Round-8 spec (Story 105.2) — must remain green (AC6). Read-only. |
| `apps/dms-material-e2e/src/scrolling-regression-106.spec.ts` (if 106.1 committed it) | Optional reproduction spec — un-`test.fail()` / un-`test.fixme()` per Task 7. |

The exact files to modify are dictated by Task 3's evidence. Do not modify any file
without an evidence trail in Dev Notes pointing to it.

### Forbidden Workarounds (re-stating AC3 for prominence)

- **No forced full-page reload on account / filter change.** Specifically excluded:
  `location.reload()`, `router.navigateByUrl(url, { onSameUrlNavigation: 'reload' })`,
  `RouteReuseStrategy.shouldReuseRoute = () => false`, destroying-and-recreating the
  table component on context change via `*ngIf`/`@if` flicker, or any equivalent that
  achieves the same effect by re-mounting.
- **No `contain: paint` / `contain: layout` / `contain: strict`** on
  `.virtual-scroll-viewport` or any ancestor of the sticky `<thead>`. Story 101.2
  explicitly removed this; re-introducing it would re-break Round 7.
- **No `rowHeight` adjustment** (Epic 29 territory).
- **No `isLoading` placeholder mass-rewrite** beyond the minimum needed to fix C6 if
  C6 is confirmed (Epic 60 / 64 territory).
- **No `position: sticky` / `will-change: transform` band-aid** masking the actual
  cause.
- **No removal of Story 105.2's `contextId` / `contextKey$` mechanism** unless
  Task 3 proves that mechanism is itself the root cause; in that case a replacement
  must demonstrably keep the Round-8 reproduction matrix green.
- **No weakening of test assertions** to make `pnpm all` pass (NFR5 / AC9).

### Required Comment in Fix (AC #8) — pattern reference

Update the SCROLLING REGRESSION HISTORY block at the top of
`base-table.component.ts` (style established by Story 87.2, extended by Story 101.2
and Story 105.2):

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
 * Epic 105: context-change (account swap / filter apply-clear) left CDK viewport
 *           at a stale scrollTop and sticky resolver mid-flight → added
 *           contextId input on BaseTableComponent + per-screen contextKey$
 *           computed signal → effect() calls scrollToIndex(0) on any non-null
 *           contextId change, forcing CDK to reconcile from a clean baseline
 * Epic 106: [root cause from Story 106.2 — fill in: which candidate confirmed,
 *           which screen × trigger combination Round 8 missed and why, the
 *           actual fix, the structural constraint preserved]
 *
 * Structural constraint: [restate the constraint that this fix preserves —
 * e.g. "every context-change trigger on every virtual-scrolled screen MUST
 * cause contextKey$ to emit before the new data source connects to the
 * viewport", or "data-source swap on cdk-virtual-scroll-viewport MUST
 * trigger a _renderedRange reset", or whichever applies]
 */
```

Each modified file that is a primary site of the fix gets a brief inline reference
comment pointing at this central history block.

### Hand-off Note for Story 106.3 — to be written (Task 9)

Populate this subsection at the end of dev. The note must specify:

**DOM invariant to encode:**
After any context change (account swap or filter apply/clear — including the
specific trigger paths Round 9 found broken) followed by a 4px/16ms slow scroll
across the full scroll range, the sticky `<th>` cell (not the `<tr>` row container)
must remain at the viewport top on every frame:
```ts
abs(th.getBoundingClientRect().top − viewport.getBoundingClientRect().top) ≤ 2
```
on every frame, on every virtual-scrolled screen (Universe, Open Positions, Sold
Positions, Dividend Deposits, Screener — confirm full list via 106.1), in both
Chromium and Firefox.

**Important selector note:** Use `HEADER_ROW_SELECTOR = 'th.mat-mdc-header-cell'`
(the sticky cell element with `position:sticky; top:0`). Do NOT use
`'tr.mat-mdc-header-row'` — Chrome returns the `<tr>`'s natural-flow bounding box
(y = viewportTop − scrollTop), which produces false violations regardless of sticky
working correctly. This is the same selector convention Story 105.2 established for
`scrolling-regression-105.spec.ts`; reuse it for `scrolling-regression-106.spec.ts`.

**Distinction from `scrolling-regression-105.spec.ts`:** Story 106.3's regression
suite must specifically encode the trigger path(s) Round 9 found broken — i.e. the
exact screen × trigger combination Story 105.2 did not cover. Dev must list those
combinations here verbatim from 106.1's matrix so 106.3 does not re-implement
Round-8 coverage by accident.

**Seed helpers to reuse (from Story 105.2's existing helpers):**
- `seedScrollUniverseData()` — Universe rows (60 rows, two seeded symbol prefixes)
- `seedScrollOpenPositionsData()` — open positions for one account (60 rows)
- `seedScrollSoldPositionsData()` — sold positions for one account (60 rows)
- `seedScrollDivDepositsWithSymbolsData()` — dividend deposits + universe rows for
  one account
- `seedScrollScreenerData()` — screener rows (60 rows, Equities risk group)
- `seedScrollFetchUniverseIds()` (from `seed-scroll-fetch-universe-ids.helper.ts`)
  — needed for multi-account tests

If 106.1 needed a new seed helper for a trigger path Story 105.2 did not cover
(e.g. browser back/forward, programmatic `router.navigate`, a multi-filter
combination), name it here and instruct 106.3 to reuse it.

**Context-change driver per screen (from Story 105.2's drivers; extend as needed):**

| Screen | Driver |
|--------|--------|
| Universe | `.account-select mat-select` → `mat-option` at index 1 (second option) |
| Universe (filter) | `${VIEWPORT_SELECTOR} thead input[placeholder]` → `filterInput.fill(symbolPrefix)` |
| Open / Sold / Div Dep | `page.goto('/account/${accountId2}/open')` (or `/sold`, `/div-dep`) |
| Open / Sold (filter) | `[data-testid="symbol-search-input"]` or `thead input[placeholder="Search Symbol"]` → `fill('E2E-OP')`/`fill('E2E-SD')` |
| Screener | `[data-testid="risk-group-filter"]` → select `Income` then `All` |
| _(any new trigger Round 9 found broken)_ | _(driver per 106.1)_ |
