<!-- markdownlint-disable MD033 MD060 -->
# Story 106.1: Reproduce Janky Scrolling After Account / Filter Change Across All Screens (Round 9)

Status: Approved

**Story Key:** `106-1-reproduce-scrolling-all-screens`
**Epic:** 106 — Janky Scrolling After Account / Filter Change (Round 9)
**Source:** [_bmad-output/planning-artifacts/epics-2026-05-19.md](../planning-artifacts/epics-2026-05-19.md) (Story 106.1)
**Type:** Investigation / reproduction (Playwright-MCP-driven; no production code or test
assertions changed — a single `test.fail()` / `test.fixme()`-annotated reproduction spec
MAY be committed if it is required to encode a confirmed cell of the matrix)

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want a Playwright-MCP-driven reproduction of the scrolling artifacts that appear *after*
changing the active account or applying/clearing a filter — across every virtual-scrolled
screen and both browsers, **with Epic 105's Round-8 `contextId` / `contextKey$` fix
already in place** —
So that Story 106.2 has a comprehensive failure inventory keyed to the
**context-change** trigger (not just the single Universe-screen anecdote), a documented
review of which Epic-101 / Epic-105 / earlier-round hypotheses are still in play, and an
explicit statement of what Story 105.2 actually changed and where its fix falls short
under live conditions.

## Epic Context

**Epic 106 Goal:** Epics 29, 31, 44, 60, 64, 87, 101, and 105 collectively eliminated
scrolling artifacts on **freshly loaded** screens. Epic 105 (Round 8) additionally
introduced a `contextId = input<string | null>(null)` signal on `BaseTableComponent`
plus per-screen `contextKey$` computed signals so that an account or filter change
calls `scrollToIndex(0)` on the CDK viewport, forcing Angular Material to re-measure
sticky headers from a clean position. The artifacts now return when Dave changes the
active account on the Universe screen — and, by extension, when a filter is applied or
cleared without a full page reload — even though the Round-8 fix is in place. Something
in the account-change / filter-change pipeline is still leaving the virtual scroller,
the sticky header, or their shared layout state in a different condition than a freshly
loaded screen.

This story (106.1) is the **reproduction / inventory** story for Round 9. It must:

1. Drive a deterministic context-change sequence (account swap and filter apply/clear)
   on every screen that hosts a CDK virtual-scrolled `<dms-base-table>`.
2. Capture a full `screen × browser × trigger × artifact` matrix **with the Round-8
   `contextId` mechanism already active**.
3. Review prior scrolling epics (29, 31, 44, 60, 64, 87, **101**, **105**) and explain
   why each prior fix — including 105.2's `contextId` / `contextKey$` approach — does
   not fully address the context-change failure mode that Round 9 is hunting.
4. Enumerate the live root-cause candidates Story 106.2 must investigate, taking
   105.2's fix as the new baseline (i.e. candidates the Round-8 fix demonstrably did
   not close).

**No production code is modified in this story.** A single Playwright spec encoding the
matrix MAY be committed if it improves Story 106.2's traction — see Task 7. If
committed, it must be `test.fail()`-annotated (or `test.fixme()` / wrapped in
`test.describe.skip()` with a TODO pointing at 106.2) so `pnpm all` stays green.

## Acceptance Criteria

1. **AC1 — Per-screen × browser × trigger reproduction recorded.**
   **Given** every screen in the app that uses CDK virtual scrolling
   (Universe, Open Positions, Sold Positions, Dividend Deposits, Screener — confirm full
   list via `grep -rn "<dms-base-table\|cdk-virtual-scroll-viewport" apps/dms-material/src`),
   **When** the developer drives this sequence via the Playwright MCP server on each
   screen in **both** Chromium and Firefox: load the screen → confirm scrolling is clean
   (Epic-101 + Epic-105 baseline, i.e. `contextId` mechanism already firing) → change
   the active account → slow-scroll → record any artifact → repeat with a filter
   apply/clear instead of an account change,
   **Then** Dev Notes record per-screen results: which artifacts reproduced
   (header-under-header, flicker, header-scrolls-with-content), at what scroll speed, and
   at what viewport size, with screenshots attached.

2. **AC2 — Reproduction matrix captures account-change vs filter-change explicitly.**
   **Given** each screen has been swept,
   **When** the inventory is summarised,
   **Then** Dev Notes contain a single matrix of
   `screen × browser × trigger (account-change | filter-change) × artifact` with PASS /
   FAIL / N-A and a one-line note per cell. Negative findings (a confirmed clean cell)
   are recorded — they are evidence, not omissions. The matrix MUST clearly separate
   the account-change trigger from the filter-change trigger; conflating them is a
   defect.

3. **AC3 — Prior-epic review summarised with the Round-9 lens, including what
   Story 105.2 actually changed.**
   **Given** the prior scrolling epic story files for 29, 31, 44, 60, 64, 87, 101, and
   105,
   **When** the developer reviews them (via the corresponding `epics-*.md` files in
   `_bmad-output/planning-artifacts/` and the implementation-artifact story files in
   `_bmad-output/implementation-artifacts/`),
   **Then** Dev Notes summarise per epic: stated root cause, what changed, why the fix
   did NOT address the context-change failure mode that survives into Round 9 (i.e.
   what was specific to the case it solved), and which of the Epic-101 / Epic-105
   candidate root causes (CDK viewport reset on data-source swap, sticky containing-block
   re-creation, row-identity churn, conditional ancestor `transform` / `will-change` /
   `contain`, `contextId`-triggered `scrollToIndex(0)`) remain plausible for the new
   failure mode. The review MUST contain an explicit "What Story 105.2 actually
   changed" subsection enumerating the `contextId` input, the `effect()` calling
   `untracked(() => scrollToTop())`, the five per-screen `contextKey$` computed
   signals, and the spec selector switch from `tr.mat-mdc-header-row` to
   `th.mat-mdc-header-cell` — so Story 106.2 knows exactly which surface Round 9 must
   work *with*, not *against*.

4. **AC4 — Live root-cause candidates explicitly enumerated for Story 106.2.**
   **Given** the reproduction and prior-epic review are complete,
   **When** the developer writes a "Live Root-Cause Candidates" subsection in Dev Notes,
   **Then** the subsection lists every candidate that the live-DOM evidence (from
   Task 6) plausibly supports, each with: (a) one-line statement of the candidate, (b)
   the observation(s) from this story that keep it alive, (c) the next investigative
   step Story 106.2 should take to confirm or rule it out, (d) the file(s) Story 106.2
   will most likely need to read. Candidates MUST be framed against the Round-8 fix
   being in place: a candidate is only "live" if the `contextId` /
   `scrollToIndex(0)` mechanism demonstrably does not eliminate it.

5. **AC5 — Optional reproduction spec (if committed) is `test.fail()` / `test.fixme()`-safe
   and exercises the Round-9-specific window.**
   **Given** the matrix is complete,
   **When** the developer optionally commits
   `apps/dms-material-e2e/src/scrolling-regression-106.spec.ts`,
   **Then** every test that encodes a confirmed `FAIL` cell is annotated `test.fail()`
   (or `test.fixme()`, or wrapped in `test.describe.skip()` with a TODO referencing
   Story 106.2). The spec MUST exercise the context-change trigger (account swap or
   filter apply/clear) BEFORE the slow scroll — distinguishing it from
   `scrolling-regression-101.spec.ts` (freshly-loaded only) and capturing the regression
   *after* the `contextId` effect has fired, distinguishing it from
   `scrolling-regression-105.spec.ts` (which the Round-8 fix is presumed to satisfy).
   It MUST use the corrected `HEADER_ROW_SELECTOR = 'th.mat-mdc-header-cell'` selector
   established in Story 105.2 — measuring `tr.mat-mdc-header-row` is a known false
   positive and Round 9 must not re-introduce it. If the spec is omitted, Dev Notes
   must state why (e.g. matrix evidence sufficient for Story 106.2 to start without a
   committed spec) and Story 106.3 still owns the persistent regression suite.

6. **AC6 — No production code changes; quality gate passes.**
   **Given** the reproduction is complete,
   **When** `pnpm all` runs,
   **Then** all tests pass and `git diff --stat` shows only this story file plus, at
   most, the optional reproduction spec from AC5 — no production code, no architecture
   doc, no helper changes.

## Tasks / Subtasks

- [ ] **Task 1 — Confirm the full set of virtual-scrolled screens** (AC: #1)
  - [ ] Run `grep -rn "<dms-base-table\|cdk-virtual-scroll-viewport" apps/dms-material/src --include="*.html"`
        and record every screen that hosts a virtual-scroll table in Dev Notes under
        "Screens Under Test".
  - [ ] Cross-check against the Epic-101 / Epic-105 list (Universe, Open Positions,
        Sold Positions, Dividend Deposits, Screener — see
        [105-1-reproduce-scrolling-after-account-filter-change.md](105-1-reproduce-scrolling-after-account-filter-change.md)
        and [101-1-reproduce-scrolling-all-screens.md](101-1-reproduce-scrolling-all-screens.md)).
        If any screen has been added or renamed since Epic 105, call it out — Story
        106.2's fix and Story 106.3's suite must cover it.
  - [ ] For each screen, identify the **route + UI control** that performs:
        - the **account-change** trigger (toolbar `mat-select` on Universe; route-param
          change on Open / Sold / DivDep — `AccountPanelComponent.ngOnInit()` subscribes
          to `this.route.params` and calls
          `currentAccountSignalStore.setCurrentAccountId()`),
        - the **filter-change** trigger (column filter inputs hosted by
          `base-table.component`; Universe / Screener also have global filter UI),
        and confirm that the `contextKey$` signal Story 105.2 wired up for that screen
        actually fires on the chosen UI control (otherwise the Round-8 mechanism is
        not even being exercised — that itself would be a Round-8 regression, not a
        Round-9 issue, and must be escalated).

- [ ] **Task 2 — Start the local stack and confirm the Epic-101 + Epic-105 baseline holds** (AC: #1)
  - [ ] `pnpm start:server` (Fastify API).
  - [ ] `pnpm start:dms-material` (Angular dev server, port 4301).
  - [ ] Use the Playwright MCP server to load each screen fresh, slow-scroll, and confirm
        the Epic-101 baseline (no header-under-header, no flicker, no header drift) still
        holds.
  - [ ] Also confirm the Round-8 baseline: perform a single account-change (or
        filter-change) on the Universe screen, observe that `scrollToIndex(0)` fires
        (the viewport should snap to top), and that immediately scrolling slowly from
        the post-swap top remains clean. If `scrollToIndex(0)` does not fire, the
        `contextKey$` signal binding is broken — escalate as a Round-8 regression and
        STOP.
  - [ ] If a freshly-loaded screen is *already* dirty, that is a Round-7 regression,
        not a Round-9 issue — record it explicitly and STOP, escalating before
        continuing with Round-9 reproduction.

- [ ] **Task 3 — Account-change reproduction sweep** (AC: #1, #2)
  - [ ] For each screen × browser, drive via Playwright MCP:
        1. Load the screen, wait for first-page data to render.
        2. Slow-scroll the viewport (4px/16ms increments — same pattern as
           `scrolling-regression-101.spec.ts` and `scrolling-regression-105.spec.ts`)
           and confirm clean Epic-101 + Epic-105 baseline.
        3. Reset scroll to top.
        4. Change the active account via the appropriate UI control (do NOT navigate
           away — for Universe stay on the same screen; for account-panel screens the
           route-param swap is the documented in-place trigger and `AccountPanelComponent`
           is reused).
        5. Wait for the new account's first page to render AND for the
           `contextId`-driven `scrollToIndex(0)` effect to settle (give the CDK a
           single `requestAnimationFrame` to apply its transform).
        6. Slow-scroll again from the post-swap top.
        7. Capture: viewport screenshot, accessibility snapshot, sticky
           `th.mat-mdc-header-cell` `getBoundingClientRect()` (top + bottom — DO NOT
           measure `tr.mat-mdc-header-row`; see Story 105.2 root-cause notes),
           `cdk-virtual-scroll-viewport` `getBoundingClientRect()`, first-visible-row
           top, the value of `cdk-virtual-scroll-viewport` `_renderedRange` if
           accessible (DevTools `$0._scrollStrategy` on the viewport debug element if
           exposed).
  - [ ] Repeat at minimum at 1280×800, 1024×768, 1920×1080 viewports.
  - [ ] Record per-screen findings under "Failure Mode — Account Change — <screen>" in
        Dev Notes. Include: artifact reproduced, browser, viewport, screenshots,
        whether the failure persists after a second slow-scroll pass, and whether
        triggering a router refresh (F5 equivalent) clears it.

- [ ] **Task 4 — Filter-change reproduction sweep** (AC: #1, #2)
  - [ ] Same pattern as Task 3, but instead of swapping accounts, apply (and then clear)
        a column filter on the same screen between the two scroll passes. Use the
        column filter UI hosted by `base-table.component` (see Dev Notes for the
        selector).
  - [ ] For Universe / Screener, also exercise any global filter chips / search input
        wired into the screen's `contextKey$` signal (symbol filter, risk-group filter,
        expired filter, min-yield filter on Universe; risk-group filter on Screener).
  - [ ] Confirm via the live page that each filter change actually mutates the
        screen's `contextKey$` value (DevTools console: temporarily expose the signal
        or observe the side-effect of `scrollToIndex(0)` resetting `scrollTop`).
  - [ ] Same per-step capture as Task 3.
  - [ ] Record under "Failure Mode — Filter Change — <screen>" in Dev Notes.

- [ ] **Task 5 — Build the reproduction matrix** (AC: #2)
  - [ ] Compile a single `screen × browser × trigger × artifact` table in Dev Notes
        (see "Reproduction Matrix Template" below).
  - [ ] Mark every cell PASS / FAIL / N-A with a one-line note (artifact name + speed
        / viewport at which it surfaced; or `clean` for a confirmed-clean cell).
  - [ ] Confirm AC2's separation requirement: account-change rows are visually distinct
        from filter-change rows; they are not collapsed.

- [ ] **Task 6 — Live-DOM evidence for Round-9 candidates** (AC: #3, #4)
  - [ ] For each `FAIL` cell, while the artifact is reproducing, capture from the live
        DOM (DevTools or Playwright `evaluate`):
        - Did the Round-8 `scrollToIndex(0)` effect actually fire? (Observe
          `cdk-virtual-scroll-viewport.measureScrollOffset()` immediately before and
          after the context change — it should drop to 0.) If it did NOT fire, the
          `contextKey$` binding is the bug, not Round 9. If it DID fire and the
          artifact still appears on the next slow scroll, that is the Round-9
          failure mode.
        - Are there any ancestors of `th.mat-mdc-header-cell` with `transform`,
          `will-change`, `contain`, or `filter` between `<html>` and the sticky
          cell? If any of these only appear during the account-change / filter-change
          loading state (e.g. a wrapper that sets `contain: paint` while a spinner is
          shown, or an Angular Material progress-bar that pushes `transform` onto an
          ancestor), record that explicitly — it is a strong Round-9 candidate that
          the Round-8 fix could not eliminate because `scrollToIndex(0)` does not
          unset CSS containment.
        - Computed style of the sticky `<th>` — is `position` actually `sticky` after
          the context change? Is `top` an integer pixel? Did `position` flip to
          `relative` momentarily during the data swap?
        - Element order inside `cdk-virtual-scroll-viewport` — is the sticky `<thead>`
          still in its expected position after the context change, or did the
          structural directive that builds the table re-create the DOM such that the
          header now sits inside the virtualised rows?
        - CDK viewport state — does `_renderedRange` reset to `{start: 0, end: N}`
          after the account/filter change (post-`scrollToIndex(0)`), or does it keep
          the old range and produce stale offsets against the new data?
        - `trackBy` identity — do the new account's / filtered list's row keys collide
          with the old account's keys (e.g. position id vs. symbol-id pairing
          differing across accounts)?
        - Did the row-count sequence dip (Epic 60 / 64 array-shrink mechanism) during
          the loading window between the old account's data being cleared and the new
          account's data arriving? Add a temporary `console.log(data.length)` to
          `BaseTableComponent.ngOnChanges([data])` in a throwaway worktree to capture
          this — but do NOT commit the log.
  - [ ] Record per-cell observations under "Live-DOM Evidence" in Dev Notes.

- [ ] **Task 7 — (Optional) commit a `test.fail()` reproduction spec** (AC: #5)
  - [ ] If committing: create
        `apps/dms-material-e2e/src/scrolling-regression-106.spec.ts`. One test per
        confirmed failing `screen × trigger × artifact` cell. Each test must:
        1. Seed the data volume that triggered the failure (NOT the helper's minimum;
           reuse `seed-scroll-*.helper.ts` with a tuned row count, and for the
           account-change trigger use `seed-scroll-fetch-universe-ids.helper.ts` plus
           per-screen seeds against at least two accounts).
        2. Navigate to the screen and confirm clean baseline scroll.
        3. Trigger the context change (account swap **or** filter apply/clear) — this
           is the step that distinguishes 106's spec from 101's, and the Round-9 spec
           must wait for `scrollToIndex(0)` to settle before scrolling, distinguishing
           it from 105's spec.
        4. Slow-scroll (4px/16ms).
        5. Use `HEADER_ROW_SELECTOR = 'th.mat-mdc-header-cell'` (NOT
           `tr.mat-mdc-header-row` — see Story 105.2 root-cause notes; the `<tr>`
           selector measures natural-flow geometry and produces false positives
           regardless of whether sticky is working).
        6. Assert the same geometric invariants as
           [scrolling-regression-101.spec.ts](../../apps/dms-material-e2e/src/scrolling-regression-101.spec.ts):
           - header-under-header: `header.top >= viewportHeader.bottom` (or its
             screen-specific equivalent).
           - header-with-content: `|header.top − viewport.top| ≤ 1px`.
           - flicker: no two consecutive frames where the same row's `top` differs by
             more than `rowHeight`.
        7. Annotate `test.fail()` / `test.fixme()` (or wrap in `test.describe.skip()`
           with a TODO referencing Story 106.2).
  - [ ] If skipping: add a "Why no spec was committed" subsection under Dev Notes.

- [ ] **Task 8 — Prior-epic review and live-candidate enumeration** (AC: #3, #4)
  - [ ] Read the implementation-artifact story files for Epics 29, 31, 44, 60, 64, 87,
        101, and 105 (file IDs listed in Dev Notes). For each epic, write 2–4 sentences:
        stated root cause, what changed, why the fix is **specific to the case it
        solved** (i.e. why it does not eliminate the context-change failure mode that
        survives into Round 9).
  - [ ] Write the "What Story 105.2 actually changed" subsection required by AC3:
        enumerate the `contextId = input<string | null>(null)` signal, the
        constructor `effect()` calling `untracked(() => scrollToTop())`, the per-screen
        `contextKey$` computed signals (Universe, Open Positions, Sold Positions,
        Dividend Deposits, Screener — with their key formulas), and the spec selector
        switch from `tr.mat-mdc-header-row` to `th.mat-mdc-header-cell`.
  - [ ] Cross-reference with the file-header comment block in
        `apps/dms-material-e2e/src/universe-scrolling-regression.spec.ts` and the
        SCROLLING REGRESSION HISTORY block in
        `apps/dms-material/src/app/shared/components/base-table/base-table.component.ts`
        (and `.scss`).
  - [ ] Combine the live-DOM evidence (Task 6) with the prior-epic review to produce
        the "Live Root-Cause Candidates" list required by AC4. Each candidate must
        point at the specific file(s) Story 106.2 will need to read, and each must
        explicitly answer: *why does Story 105.2's `contextId` / `scrollToIndex(0)`
        mechanism not eliminate this candidate?*

- [ ] **Task 9 — Quality gate** (AC: #6)
  - [ ] Confirm `git diff --stat` shows only this story file (and, optionally, the
        spec from Task 7).
  - [ ] Run `pnpm all` and confirm all tests pass.
  - [ ] Record the result in Dev Notes "Completion Notes List".

## Dev Notes

### What This Story Is (And Isn't)

**Is:** the Round-9 equivalent of Story 105.1 — an evidence-backed reproduction matrix
keyed specifically to the **context-change** trigger (account swap or filter
apply/clear), captured **with Story 105.2's `contextId` / `contextKey$` fix already
deployed**. Round 8 closed the test-selector false-positive and added a
`scrollToIndex(0)` reset on context change; this story exists to document which
screens, browsers, triggers, and artifacts still misbehave despite that mechanism.

**Isn't:** a fix. No production code in this story. No architecture-doc edits. No
hardened regression suite (that's Story 106.3). At most, a single
`test.fail()` / `test.fixme()`-annotated reproduction spec MAY be committed if it
materially helps Story 106.2 — see Task 7.

### Why Round 9 Even Exists (the failure-mode delta vs Round 8)

Round 8 (Epic 105) confirmed via live Playwright-MCP diagnostics that
`position: sticky` on `th.mat-mdc-header-cell` was working correctly in every tested
state, and traced the apparent 6/16 spec failures to a test-side selector bug
(`tr.mat-mdc-header-row` returns the row's natural-flow position, not the sticky
cell's painted position). Round 8 then layered a UX-safety mechanism on top: a
`contextId` signal input on `BaseTableComponent`, an `effect()` that calls
`untracked(() => scrollToTop())` on every non-null change, and per-screen `contextKey$`
computed signals that emit a new string whenever an "account" or "filter" dimension
changes. The result: every context change snaps the viewport to top, giving Angular
Material a clean baseline for re-measuring sticky headers.

Round 9 is the observation that, on Dave's live machine, artifacts STILL appear after
an account change or filter change — meaning at least one of:

1. **The `scrollToIndex(0)` reset is not firing** for some screen / trigger
   combination (i.e. the `contextKey$` binding does not pick up that particular
   change).
2. **The reset fires, but the post-reset slow scroll still drifts** — implying a
   layout / containment / row-identity / array-shrink mechanism that
   `scrollToIndex(0)` cannot mask.
3. **The Round-8 fix is correct in code but defeated at runtime** by a CSS
   condition (e.g. a `transform` or `contain` added by a loading-state ancestor
   that only appears during the in-flight server request).
4. **A previously-eliminated candidate has re-activated** under conditions Story
   105.2 did not exercise — e.g. Epic 60 / 64's array-shrink mechanism when the
   server returns no placeholder rows for the new account's filtered view.

The epic's hypothesis space (verbatim from Epic 106 Goal):

a. **CDK `cdk-virtual-scroll-viewport`'s internal data-source / range-renderer is not
   reset when the underlying signal swaps out** — `scrollToIndex(0)` snaps the offset
   but does not necessarily clear the `_renderedRange` window or cached item-height
   measurements.
b. **Sticky header's containing block is re-created (or not re-created) on account
   change** — a structural directive on the table wrapper or toolbar destroys and
   re-creates the DOM ancestor that hosts the sticky header during the loading state.
c. **SmartNgRX / SmartSignals selector returns a new array reference with stale row
   identities** — `trackBy` collides between accounts, leaving stale DOM nodes at the
   wrong virtual offsets.
d. **An ancestor `transform` / `will-change` / `contain` is conditionally applied
   during the account-change loading state** — breaking sticky positioning for the
   duration of the transition, which `scrollToIndex(0)` cannot undo because the
   containment block exists at a higher ancestor.
e. **Story 105.2's fix addressed one trigger but not the other** — for example, the
   Universe `contextKey$` watches the toolbar `mat-select` but not the sidebar
   account selector; or the symbol-filter debounce slips past the `contextKey$`
   computation timing.

Task 6 must rule each of these in or out **per cell** before Story 106.2 picks one to
fix.

### Application URLs (Round-8 set; confirm in Task 1)

| Screen            | URL                                                      |
| ----------------- | -------------------------------------------------------- |
| Universe          | `http://localhost:4301/global/universe`                  |
| Open Positions    | `http://localhost:4301/account/{id}/open`                |
| Sold Positions    | `http://localhost:4301/account/{id}/sold`                |
| Dividend Deposits | `http://localhost:4301/account/{id}/div-dep`             |
| Screener          | `http://localhost:4301/global/screener`                  |

If any other `<dms-base-table>` host has been added since Epic 105, add it to the
matrix and call it out in Dev Notes.

### Screens Under Test (Task 1 — to be confirmed during Task 1 run)

Expected confirmed set equals the Epic-101 + Epic-105 set:

| Screen            | Route                         | Account-Change Trigger                                                                                                       | Filter-Change Trigger                                                                                                          | `contextKey$` formula (from Story 105.2)                                                                              |
| ----------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| Universe          | `/global/universe`            | `mat-select` inside `.account-select` in `mat-toolbar.universe-toolbar`                                                      | Symbol input in `<thead>`; risk-group / expired / min-yield selects                                                            | `selectedAccountId$\|symbolFilter$\|riskGroupFilter$ ?? ''\|String(expiredFilter$)\|String(minYieldFilter$)`           |
| Open Positions    | `/account/:accountId/open`    | Navigate to `/account/{newId}/open` — `AccountPanelComponent` reused, `route.params` → `currentAccountSignalStore` in-place  | `input[data-testid="symbol-search-input"]` (server-side, debounced)                                                            | `currentAccountStore.selectCurrentAccountId()\|searchText()`                                                          |
| Sold Positions    | `/account/:accountId/sold`    | Same route-param mechanism                                                                                                   | `input[placeholder="Search Symbol"]` in `<thead>`                                                                              | `currentAccountStore.selectCurrentAccountId()\|searchText()`                                                          |
| Dividend Deposits | `/account/:accountId/div-dep` | Same route-param mechanism                                                                                                   | **N/A** — no filter row in `dividend-deposits.component.html`                                                                  | `currentAccountStore.selectCurrentAccountId()`                                                                        |
| Screener          | `/global/screener`            | **N/A** — no account selector; data is global                                                                                | `[data-testid="risk-group-filter"]` mat-select                                                                                 | `riskGroupFilter$() ?? ''`                                                                                            |

Task 1 must verify each `contextKey$` formula still matches the source and that the
UI control used in Tasks 3/4 actually changes the value `contextKey$` emits.

### Start Commands

```bash
pnpm start:server           # Fastify API
pnpm start:dms-material     # Angular dev server, port 4301
```

### Key Files for Investigation (Read-Only in This Story)

| File                                                                                                       | Why                                                                                              |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `apps/dms-material/src/app/shared/components/base-table/base-table.component.ts`                           | Shared virtual-scroll host; contains SCROLLING REGRESSION HISTORY block and Round-8 `contextId` / `effect()` / `scrollToTop()` |
| `apps/dms-material/src/app/shared/components/base-table/base-table.component.html`                         | Sticky `<thead>` and `cdk-virtual-scroll-viewport` markup                                        |
| `apps/dms-material/src/app/shared/components/base-table/base-table.component.scss`                         | Sticky-header CSS, `position: sticky`, `transform`, `will-change`, `contain`; SCROLLING REGRESSION HISTORY comment block |
| `apps/dms-material/src/app/global/global-universe/global-universe.component.ts/.html`                      | Universe data pipeline + Round-8 `contextKey$` computed signal                                   |
| `apps/dms-material/src/app/global/global-screener/global-screener.component.ts/.html`                      | Screener virtual-scroll host + Round-8 `contextKey$`                                             |
| `apps/dms-material/src/app/account-panel/open-positions/open-positions.component.ts/.html`                 | Open Positions data pipeline + Round-8 `contextKey$`                                             |
| `apps/dms-material/src/app/account-panel/sold-positions/sold-positions.component.ts/.html`                 | Sold Positions data pipeline + Round-8 `contextKey$`                                             |
| `apps/dms-material/src/app/account-panel/dividend-deposits/dividend-deposits.component.ts/.html`           | Dividend Deposits data pipeline + Round-8 `contextKey$`                                          |
| `apps/dms-material/src/app/account-panel/account-selection-integration.spec.ts`                            | Reference for how `currentAccountSignalStore` / `selectCurrentAccountSignal` drive account swaps |
| `apps/dms-material-e2e/src/scrolling-regression-101.spec.ts`                                               | Round-7 reproduction spec (pattern + assertion reference; freshly-loaded only)                   |
| `apps/dms-material-e2e/src/scrolling-regression-105.spec.ts`                                               | Round-8 reproduction spec (context-change two-pass pattern; uses `th.mat-mdc-header-cell` selector after Story 105.2 fix) |
| `apps/dms-material-e2e/src/universe-scrolling-regression.spec.ts`                                          | File-header SCROLLING REGRESSION HISTORY (Epics 29 → 87)                                         |
| `apps/dms-material-e2e/src/universe-lazy-load-deep-scroll.spec.ts`                                         | Round-6 deep-scroll reference (lines 77–84 contain the prior-epic table)                         |
| `_bmad-output/implementation-artifacts/105-1-reproduce-scrolling-after-account-filter-change.md`            | Round-8 reproduction — direct precedent for this story's structure                               |
| `_bmad-output/implementation-artifacts/105-2-root-cause-and-fix-scrolling-on-context-change.md`             | Round-8 root cause + fix — required reading for AC3's "What Story 105.2 actually changed" subsection |
| `_bmad-output/implementation-artifacts/105-3-regression-suite-scrolling-after-account-filter-change.md`     | Round-8 regression suite                                                                         |

### Existing Scroll Specs (Run for Baseline; Do Not Modify)

- `apps/dms-material-e2e/src/scrolling-regression-101.spec.ts` (Round 7)
- `apps/dms-material-e2e/src/scrolling-regression-105.spec.ts` (Round 8)
- `apps/dms-material-e2e/src/universe-smooth-scroll.spec.ts`
- `apps/dms-material-e2e/src/universe-scrolling-regression.spec.ts`
- `apps/dms-material-e2e/src/open-positions-smooth-scroll.spec.ts`
- `apps/dms-material-e2e/src/open-positions-scrolling-regression.spec.ts`
- `apps/dms-material-e2e/src/sold-positions-scrolling-regression.spec.ts`
- `apps/dms-material-e2e/src/div-deposits-smooth-scroll.spec.ts`
- `apps/dms-material-e2e/src/div-deposits-scrolling-regression.spec.ts`
- `apps/dms-material-e2e/src/screener-smooth-scroll.spec.ts`
- `apps/dms-material-e2e/src/scrolling-regression-87.spec.ts`

If any of these now fail on `main`, that is a Round-7 or Round-8 regression, not
Round 9 — call it out and stop before proceeding.

### Seed Helpers (Reuse — Do Not Invent)

| Helper                                                 | Screen            |
| ------------------------------------------------------ | ----------------- |
| `seed-scroll-universe-data.helper.ts`                  | Universe          |
| `seed-scroll-screener-data.helper.ts`                  | Screener          |
| `seed-scroll-open-positions-data.helper.ts`            | Open Positions    |
| `seed-scroll-sold-positions-data.helper.ts`            | Sold Positions    |
| `seed-scroll-div-deposits-with-symbols-data.helper.ts` | Dividend Deposits |
| `seed-scroll-base.helper.ts`                           | Base utilities    |
| `seed-scroll-fetch-universe-ids.helper.ts`             | Cross-account ID fetch (relevant for the account-swap trigger) |

For the account-change trigger you need data on **at least two** accounts so the swap
actually changes the dataset. Use `seed-scroll-fetch-universe-ids.helper.ts` plus
multiple invocations of the per-screen seed helpers to populate two accounts — do NOT
invent a new helper.

### Round-9 Artifacts (What We're Hunting)

Same three artifacts as Round 7 / Round 8, but only counted if they appear **after**
the context-change trigger AND **after** the Round-8 `scrollToIndex(0)` effect has
settled:

1. **Header-under-header** — sticky `<thead>` (specifically `th.mat-mdc-header-cell`)
   slides upward behind the parent header.
2. **Flicker** — content rows jitter mid-scroll (Y delta > rowHeight then snap back).
3. **Header-scrolls-with-content** — sticky header drifts down with content rows.

A cell is `FAIL` only if the artifact does NOT appear on the freshly-loaded baseline
(Task 2) and DOES appear after the context-change (Task 3 / Task 4) once
`scrollToIndex(0)` has settled. A cell that fails on both freshly-loaded and
post-context-change is a Round-7 regression. A cell that fails because
`scrollToIndex(0)` never fired is a Round-8 regression. Either is escalated, not
catalogued as Round 9.

### Reproduction Matrix Template (fill in during Task 5)

```text
Screen              │ Browser  │ Trigger        │ header-under-header               │ header-with-content               │ flicker
────────────────────┼──────────┼────────────────┼───────────────────────────────────┼───────────────────────────────────┼────────────
Universe            │ Chromium │ account-change │ TBD @ <viewport> <speed>          │ TBD                               │ TBD
Universe            │ Chromium │ filter-change  │ TBD                               │ TBD                               │ TBD
Universe            │ Firefox  │ account-change │ TBD                               │ TBD                               │ TBD
Universe            │ Firefox  │ filter-change  │ TBD                               │ TBD                               │ TBD
Open Positions      │ Chromium │ account-change │ TBD                               │ TBD                               │ TBD
Open Positions      │ Chromium │ filter-change  │ TBD                               │ TBD                               │ TBD
Open Positions      │ Firefox  │ account-change │ TBD                               │ TBD                               │ TBD
Open Positions      │ Firefox  │ filter-change  │ TBD                               │ TBD                               │ TBD
Sold Positions      │ Chromium │ account-change │ TBD                               │ TBD                               │ TBD
Sold Positions      │ Chromium │ filter-change  │ TBD                               │ TBD                               │ TBD
Sold Positions      │ Firefox  │ account-change │ TBD                               │ TBD                               │ TBD
Sold Positions      │ Firefox  │ filter-change  │ TBD                               │ TBD                               │ TBD
Div Deposits        │ Chromium │ account-change │ TBD                               │ TBD                               │ TBD
Div Deposits        │ Chromium │ filter-change  │ n/a (no filter UI)                │ n/a                               │ n/a
Div Deposits        │ Firefox  │ account-change │ TBD                               │ TBD                               │ TBD
Div Deposits        │ Firefox  │ filter-change  │ n/a (no filter UI)                │ n/a                               │ n/a
Screener            │ Chromium │ account-change │ n/a (no account selector)         │ n/a                               │ n/a
Screener            │ Chromium │ filter-change  │ TBD                               │ TBD                               │ TBD
Screener            │ Firefox  │ account-change │ n/a (no account selector)         │ n/a                               │ n/a
Screener            │ Firefox  │ filter-change  │ TBD                               │ TBD                               │ TBD
```

**Matrix completion status:** Cells to be populated during Tasks 3–5. Replace `TBD`
with `FAIL @ <viewport> <speed>` (with the artifact name) or `clean` per cell. Live
Playwright MCP verification is required.

### Prior Root-Cause History (Starting Points)

Sourced from
[apps/dms-material-e2e/src/universe-scrolling-regression.spec.ts](../../apps/dms-material-e2e/src/universe-scrolling-regression.spec.ts)
file header, the SCROLLING REGRESSION HISTORY comment block in
[apps/dms-material/src/app/shared/components/base-table/base-table.component.ts](../../apps/dms-material/src/app/shared/components/base-table/base-table.component.ts),
and individual implementation-artifact story files. Confirm/extend during Task 8.

| Epic | Stated Root Cause                                                                                                                             | Why It Doesn't Cover Round 9 (initial hypothesis — verify) |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| 29   | `rowHeight` mismatch CSS vs CDK viewport config — scroll height calculation wrong                                                              | Fix is static (compile-time row height); not affected by data swap |
| 31   | `contain: strict` on the header caused jump when viewport recalculated                                                                        | `contain` was removed; Round 9 may re-introduce it conditionally during loading |
| 44   | CSS transition animations + change detection cycles caused CDK to recalculate mid-scroll                                                       | Transitions disabled on the table; not a context-change trigger |
| 60   | `isLoading === true` rows filtered to `null` → array shrank → CDK viewport shrank → scroll jumped                                              | This IS related — account-change triggers a loading state. Re-check whether the new account's first batch transits through the same isLoading path; `scrollToIndex(0)` cannot mask an array-shrink jump |
| 64   | Round-5 recurrence of Epic 60 pattern; edge-case extensions                                                                                   | Same as 60 — re-verify against context-change loading state |
| 87   | Account-panel placeholder rows had `symbol: ''` → blank cells appeared during fast scroll                                                     | Different artifact (blank cells, not header drift); not in scope |
| 101  | Round-7 fix: sticky-header containing-block, virtual-scroll element ordering, row-identity stability — removed `contain: paint`               | Fixed only the freshly-loaded case; no test exercised an in-place data swap |
| 105  | Round-8 fix: spec selector `tr.mat-mdc-header-row` → `th.mat-mdc-header-cell` (eliminated test-side false positive) + `contextId` input + per-screen `contextKey$` + `effect()` calling `untracked(() => scrollToTop())` so context change forces `scrollToIndex(0)` | The Round-8 fix snaps the viewport to top on context change but cannot undo CSS containment changes mid-loading, cannot eliminate array-shrink mechanisms, and only fires when the `contextKey$` value actually changes. If Dave's trigger is a UI control whose signal is not in the `contextKey$` formula, the effect never fires. |

**Task 8 — Detailed Prior-Epic Review (placeholder — fill during Task 8):**

For each of the 8 epics above, Task 8 must write 2–4 sentences covering: stated root
cause, what changed, why the fix does not extend to the Round-9 failure mode. The
detailed Epic-29 through Epic-101 entries from Story 105.1's Dev Notes are a
reasonable starting point — Round 9 must add an Epic-105 entry and re-evaluate every
"why not Round 8" comment against "why not Round 9".

**What Story 105.2 Actually Changed (Task 8 — required by AC3):**

Story 105.2 made two distinct changes:

1. **Test-side selector fix.** The Round-7 / Round-8 reproduction specs were
   measuring `tr.mat-mdc-header-row.getBoundingClientRect()`. Chrome does not adjust
   a `<tr>`'s bounding box to reflect the sticky-painted position of its `<th>`
   children — so at any non-zero `scrollTop`, `tr.y = viewportTop − scrollTop`,
   guaranteeing a `tr.y − viewportTop > PIXEL_TOLERANCE=2` violation on every frame
   regardless of whether sticky actually broke. Live-DOM diagnostics confirmed
   `th.mat-mdc-header-cell.getBoundingClientRect().y == viewportTop` in every tested
   state — sticky was always working. Story 105.2 changed
   `HEADER_ROW_SELECTOR = 'tr.mat-mdc-header-row'` to
   `HEADER_ROW_SELECTOR = 'th.mat-mdc-header-cell'`, eliminating the false positives.
   Round 9 specs MUST use the `<th>` selector.

2. **Production-side `contextId` / `scrollToIndex(0)` UX-safety mechanism.** Even
   though sticky was working, Story 105.2 added a defence-in-depth layer:
   - `BaseTableComponent` gained `contextId = input<string | null>(null)` as a signal
     input.
   - The constructor gained an `effect()` that watches `contextId()`, skips `null`
     (the initial value, so no reset on first render), and calls
     `untracked(() => this.scrollToTop())` on any non-null change.
   - `scrollToTop()` calls `this.viewport()?.scrollToIndex(0)`, forcing the CDK
     viewport to reconcile its scroll position and sticky-header measurements before
     the user scrolls again.
   - The `untracked` wrapper prevents the `viewport()` read from creating a reactive
     dependency inside the effect, preserving signal-first / zoneless constraints.
   - Each of the five screens now exposes a `readonly contextKey$` computed signal
     bound to `[contextId]` on its `<dms-base-table>`, encoding every signal that
     represents a "context change" for that screen (see Screens Under Test table
     above for per-screen formulas).

   When any signal in the key changes, `contextKey$` emits a new string →
   `contextId()` sees a non-null change → `scrollToTop()` is called before the user
   can scroll → Angular Material re-measures sticky headers from a clean position.

Round 9 must work *with* this mechanism. Story 106.2 must NOT remove the `contextId`
input, the effect, or the per-screen `contextKey$` signals — they are the new
baseline. Round 9's investigation begins after `scrollToIndex(0)` has settled.

Initial story files to read in Task 8 (each lives under
`_bmad-output/implementation-artifacts/`):

- `29-1-audit-and-standardize-virtual-scroll-row-heights.md`,
  `29-2-verify-smooth-scrolling-on-all-tables-with-playwright.md`
- `31-1-reproduce-and-root-cause-the-header-jumping-issue.md`,
  `31-2-implement-and-verify-the-virtual-scroll-header-fix.md`
- `44-1-reproduce-diagnose-janky-scrolling.md`, `44-2-fix-janky-scrolling.md`,
  `44-3-verify-scrolling-e2e-tests.md`
- `60-1-investigate-scrolling-regression-failing-e2e.md`,
  `60-2-fix-universe-scrolling-permanently.md`,
  `60-3-scrolling-regression-prevention-tests.md`
- `64-1-reproduce-scrolling-regression-failing-e2e.md`,
  `64-2-fix-universe-scrolling-round-5.md`,
  `64-3-extend-scrolling-regression-prevention.md`
- `87-1-reproduce-scrolling-failures-all-screens.md`,
  `87-2-fix-scrolling-all-screens.md`,
  `87-3-scrolling-regression-prevention-suite.md`
- `101-1-reproduce-scrolling-all-screens.md`,
  `101-2-root-cause-and-fix-scrolling.md`,
  `101-3-scrolling-regression-suite.md`,
  `101-4-update-architecture-scrolling-guardrails.md`
- `105-1-reproduce-scrolling-after-account-filter-change.md`,
  `105-2-root-cause-and-fix-scrolling-on-context-change.md`,
  `105-3-regression-suite-scrolling-after-account-filter-change.md`

The corresponding planning-artifact `epics-*.md` files (search
`_bmad-output/planning-artifacts/epics-*.md` for the epic number) carry the original
acceptance criteria and Architecture / Context for each round.

### Account-Change Trigger Mechanics

`apps/dms-material/src/app/account-panel/account-selection-integration.spec.ts` shows
how the account selection signal works:

- `currentAccountSignalStore.setCurrentAccountId(...)` is the underlying state
  mutation.
- `selectCurrentAccountSignal` is the consumer signal that dependent components react
  to.
- For account-panel screens (Open / Sold / DivDep), the swap is driven by
  `AccountPanelComponent.ngOnInit()`'s subscription to `this.route.params`. When
  `:accountId` changes via Angular Router navigation, `setCurrentAccountId(accountId)`
  is called; the component is reused (same `routeConfig`) and the CDK viewport is NOT
  destroyed — the DOM stays intact while the data array is replaced.
- For Universe, the swap is driven by the toolbar `mat-select`
  (`GlobalUniverseComponent.onAccountChange()`), which sets `selectedAccountId$` and
  calls the server.

For the reproduction, drive the swap via the **UI control** Dave actually uses
(sidebar / toolbar account dropdown / route navigation — confirm in Task 1), not by
calling the store directly. The bug is in the rendered consequence of the user-facing
action, so the trigger must mirror the user's path.

### Filter-Change Trigger Mechanics

Column filters are hosted by `base-table.component`. Identify the input selector
during Task 1 (it is rendered per column header). The Universe and Screener screens
also expose global filter chips / search inputs at the page level — exercise both
per-column and global filters where they exist. For each filter, confirm via Task 1
that the filter's bound signal participates in the screen's `contextKey$` formula —
otherwise the Round-8 mechanism is not exercised by that filter and any artifact
that appears post-filter is technically a Round-8 hole, which Story 106.2 will need
to patch by extending the `contextKey$` formula.

### CDK Virtual Scroll Programmatic Control (reuse Round-7 / Round-8 pattern)

```typescript
// Slow programmatic scroll — increment then yield to layout
async function slowScroll(page, selector, totalPx, stepPx = 4, frameDelayMs = 16) {
  const handle = page.locator(selector);
  for (let y = 0; y <= totalPx; y += stepPx) {
    await handle.evaluate((el, top) => {
      (el as HTMLElement).scrollTop = top;
    }, y);
    await page.waitForTimeout(frameDelayMs);
  }
}
```

Selector: `cdk-virtual-scroll-viewport`.

### Bounding-Box Assertion Pattern (for AC5 spec, if committed)

Measure the sticky `<th>` (NOT the `<tr>` — see Story 105.2 root-cause notes):

```typescript
const header = page
  .locator('cdk-virtual-scroll-viewport th.mat-mdc-header-cell')
  .first();
const viewport = page.locator('cdk-virtual-scroll-viewport').first();
const [hb, vb] = await Promise.all([header.boundingBox(), viewport.boundingBox()]);
// header-with-content: sticky <th> top must equal viewport top
expect(Math.abs((hb?.y ?? 0) - (vb?.y ?? 0))).toBeLessThanOrEqual(1);
```

Confirm the actual DOM during Task 1 — the selector must match what
`BaseTableComponent` renders today, which may have shifted since Story 105.2 was
written.

### Browsers

Both Chromium and Firefox must be exercised — Epic 106 explicitly carries R3 (NFR
coverage across both Chromium and Firefox at all supported viewport sizes).
Safari/WebKit is **not** in the project's supported matrix.

### Project Conventions Reminder

(From `_bmad-output/project-context.md` — apply even though this story has no
production code changes.)

- Angular 21 zoneless, `inject()` only, `OnPush` everywhere, signal-first state.
- SmartNgRX / SmartSignals for state.
- Vitest for unit, Playwright (Chromium + Firefox) for E2E.
- `pnpm all` must pass after every story.
- Tests are authoritative — do not weaken assertions to make a test pass.
- Playwright **MCP server** must be used for the live-app reproduction.

### Live Root-Cause Candidates (Task 8 — to be filled with live-DOM evidence)

> Candidates below are framed against the Round-8 fix (`contextId` /
> `scrollToIndex(0)`) being in place. A candidate is only "live" if the Round-8
> mechanism demonstrably does not eliminate it. Story 106.2 must confirm or rule out
> each candidate with live evidence collected during Task 6.

1. **CDK viewport `_renderedRange` / item-height cache stale despite `scrollToIndex(0)`**
   - Statement: `scrollToIndex(0)` snaps the scroll offset, but it does not
     necessarily reset the `_scrollStrategy`'s `_renderedRange` window or its cached
     item-height measurements. If the new dataset has rows that render at a different
     intrinsic height than the old dataset's rows (e.g. wrapping content, taller
     symbol labels), the cached heights produce stale `translateY` offsets after
     the snap-to-top.
   - Supporting evidence (collect in Task 6): `$0._scrollStrategy._renderedRange`
     before vs. after the context-change, post-`scrollToIndex(0)`.
   - Next step for 106.2: After an account-change, inspect
     `$0._scrollStrategy._renderedRange` immediately after the `scrollToIndex(0)`
     effect settles. If the range does not reset to `{start: 0, end: N}` for the new
     data, this candidate is confirmed. Consider calling
     `viewport.checkViewportSize()` after the snap as a candidate fix.
   - Files: `apps/dms-material/src/app/shared/components/base-table/base-table.component.ts`,
     `apps/dms-material/src/app/global/global-universe/global-universe.component.ts`,
     `apps/dms-material/src/app/account-panel/open-positions/open-positions-component.service.ts`

2. **Sticky containing-block re-created by structural directive during loading state**
   - Statement: A structural directive (e.g. `@if`, `@switch`) on the table wrapper
     or its ancestor could destroy and re-create the DOM ancestor that hosts the
     sticky header during the loading state of an account-change or filter-change.
     `scrollToIndex(0)` runs after the data settles but cannot undo a containing-block
     re-creation that already happened during the loading window.
   - Supporting evidence (collect in Task 6): DOM snapshot before, during, and after
     the context-change loading state. Look for `<thead>` or its ancestor having a
     different node identity post-load.
   - Next step for 106.2: Take a DOM snapshot at the exact moment the loading
     spinner appears, using
     `page.evaluate(() => document.querySelector('cdk-virtual-scroll-viewport').outerHTML.slice(0, 500))`.
     Compare the `<thead>` node identity before and after.
   - Files: `apps/dms-material/src/app/global/global-universe/global-universe.component.html`,
     `apps/dms-material/src/app/shared/components/base-table/base-table.component.html`

3. **Row-identity churn from selector returning new array reference on every context change**
   - Statement: `filteredData$` / `selectOpenPositions$` / etc. return NEW array
     references on every signal invalidation. If `trackBy` collides between accounts
     or filtered subsets, CDK may keep stale DOM nodes for mismatched positions,
     producing incorrect offsets even after `scrollToIndex(0)`.
   - Supporting evidence (collect in Task 6): Compare row IDs across an account-change.
     For Universe, rows are universe-entry UUIDs (shared across accounts, no
     collision) so the array-reference churn does not destroy rows. For account-panel
     screens, trades use trade UUIDs (unique per record, no collision), but the
     wholesale DOM rebuild triggers a layout flush that `scrollToIndex(0)` happens
     after — possibly leaving a flicker frame.
   - Next step for 106.2: Check `BaseTableComponent.trackByFn` implementation. Then
     confirm whether account-change triggers DOM row destruction. If yes, time the
     destruction relative to the `scrollToIndex(0)` effect.
   - Files: `apps/dms-material/src/app/shared/components/base-table/base-table.component.ts`

4. **Conditional `transform` / `will-change` / `contain` ancestor during loading state**
   - Statement: An ancestor of the sticky `<th>` may apply `transform`, `will-change`,
     or `contain` only during the account-change / filter-change loading state (e.g.
     a spinner overlay, a `mat-progress-bar`, or a wrapper that activates during
     loading). Any of these on an ancestor of the sticky element would create a new
     containing block and break `position: sticky` for the duration of the
     transition. `scrollToIndex(0)` cannot unset CSS containment.
   - Supporting evidence (collect in Task 6): While the loading state is active,
     walk the ancestor chain from `th.mat-mdc-header-cell` to `<html>` and log every
     computed `transform`, `will-change`, `contain`, `filter`. Compare with the
     post-load state.
   - Next step for 106.2: During an account-change, run
     `page.evaluate(() => { const el = document.querySelector('th.mat-mdc-header-cell'); let node = el; while (node) { const st = getComputedStyle(node); if (st.transform !== 'none' || st.willChange !== 'auto' || st.contain !== 'none') { console.log(node.tagName, node.className, 'transform:', st.transform, 'contain:', st.contain); } node = node.parentElement; } })`
     to find any ancestor applying these properties.
   - Files: `apps/dms-material/src/app/shared/components/base-table/base-table.component.scss`,
     `apps/dms-material/src/app/shared/components/base-table/base-table.component.html`

5. **Story 105.2's `contextKey$` formula misses Dave's actual trigger**
   - Statement: For each screen, `contextKey$` enumerates a specific set of signals.
     If Dave's trigger is a UI control whose underlying signal is NOT in the
     `contextKey$` formula, the effect never fires for that trigger — `scrollToIndex(0)`
     does not run — and the artifact is the same one Round 8 thought it had fixed.
     For example: Universe `contextKey$` watches `selectedAccountId$`, `symbolFilter$`,
     `riskGroupFilter$`, `expiredFilter$`, `minYieldFilter$` — but if a sidebar
     account selector exists and mutates a different signal (e.g. the global
     `currentAccountSignalStore`), the toolbar-side `selectedAccountId$` may not
     update in sync. Similarly, the symbol-filter debounce timing may push the
     `contextKey$` recomputation past the slow-scroll start.
   - Supporting evidence (collect in Task 6): For each `FAIL` cell, observe whether
     `scrollToIndex(0)` actually fired (the viewport's `scrollTop` should drop to 0
     during the loading window). If it did not fire, this candidate is confirmed for
     that cell.
   - Next step for 106.2: For each `FAIL` cell where `scrollToIndex(0)` did not
     fire, identify the signal that drives the user's trigger and add it to the
     screen's `contextKey$` formula. This is a small extension of the Story 105.2
     mechanism, not a replacement.
   - Files: `apps/dms-material/src/app/global/global-universe/global-universe.component.ts`,
     `apps/dms-material/src/app/global/global-screener/global-screener.component.ts`,
     `apps/dms-material/src/app/account-panel/open-positions/open-positions.component.ts`,
     `apps/dms-material/src/app/account-panel/sold-positions/sold-positions.component.ts`,
     `apps/dms-material/src/app/account-panel/dividend-deposits/dividend-deposits.component.ts`

6. **Epic 60 / 64 array-shrink mechanism re-activated during context-change loading window**
   - Statement: When an account-change triggers a server request, SmartNgRX marks
     pending rows as `isLoading: true` with `symbol: '\u2026'` (placeholder). If any
     code path in the new data pipeline returns `null` or filters out these
     placeholder rows before passing them to `[data]`, the array temporarily shrinks
     (the Epic 60 / 64 mechanism), CDK recalculates scroll height downward, and the
     viewport jumps. `scrollToIndex(0)` snaps the offset to 0 *after* the new data
     settles — but the shrink-then-grow happens *during* the loading window and can
     produce a visible flicker frame before the snap.
   - Supporting evidence (collect in Task 6): Temporarily add
     `console.log('data length', value.length)` to
     `BaseTableComponent.ngOnChanges([data])` (in a throwaway worktree — do NOT
     commit) and observe the sequence of lengths during an account-change. If the
     length dips below the previous account's count before climbing to the new
     count, this candidate is confirmed.
   - Files: `apps/dms-material/src/app/global/global-universe/enrich-universe-with-risk-groups.function.ts`,
     `apps/dms-material/src/app/global/global-universe/global-universe.component.ts`,
     `apps/dms-material/src/app/account-panel/open-positions/open-positions-component.service.ts`,
     `apps/dms-material/src/app/account-panel/sold-positions/sold-positions-component.service.ts`,
     `apps/dms-material/src/app/account-panel/dividend-deposits/dividend-deposits-component.service.ts`

### Out of Scope

- Any production code change (that's Story 106.2).
- A persistent regression suite (that's Story 106.3).
- Architecture-doc updates / SCROLLING REGRESSION HISTORY appendix updates (deferred
  to Story 106.2 / 106.3 if introduced).
- Safari/WebKit reproduction.
- Re-investigation of the freshly-loaded case (Round 7 / Epic 101 already covered it;
  re-running its existing suite is part of Task 2 only).
- Removal or replacement of Story 105.2's `contextId` / `contextKey$` mechanism —
  Round 9 builds on it, not against it.

### References

- [_bmad-output/planning-artifacts/epics-2026-05-19.md](../planning-artifacts/epics-2026-05-19.md) — Epic 106 source
- [_bmad-output/planning-artifacts/epics-2026-05-13.md](../planning-artifacts/epics-2026-05-13.md) — Epic 105 source (Round 8)
- [105-1-reproduce-scrolling-after-account-filter-change.md](105-1-reproduce-scrolling-after-account-filter-change.md) — Round-8 reproduction (structural reference for this story)
- [105-2-root-cause-and-fix-scrolling-on-context-change.md](105-2-root-cause-and-fix-scrolling-on-context-change.md) — Round-8 root cause + fix (required reading for AC3)
- [105-3-regression-suite-scrolling-after-account-filter-change.md](105-3-regression-suite-scrolling-after-account-filter-change.md) — Round-8 regression suite
- [101-1-reproduce-scrolling-all-screens.md](101-1-reproduce-scrolling-all-screens.md) — Round-7 reproduction
- [101-2-root-cause-and-fix-scrolling.md](101-2-root-cause-and-fix-scrolling.md) — Round-7 root cause + fix
- [101-3-scrolling-regression-suite.md](101-3-scrolling-regression-suite.md) — Round-7 persistent regression suite
- [apps/dms-material-e2e/src/scrolling-regression-101.spec.ts](../../apps/dms-material-e2e/src/scrolling-regression-101.spec.ts) — Round-7 reproduction spec
- [apps/dms-material-e2e/src/scrolling-regression-105.spec.ts](../../apps/dms-material-e2e/src/scrolling-regression-105.spec.ts) — Round-8 reproduction spec (uses corrected `<th>` selector)
- [apps/dms-material-e2e/src/universe-scrolling-regression.spec.ts](../../apps/dms-material-e2e/src/universe-scrolling-regression.spec.ts) — Prior root-cause history in file header
- [apps/dms-material/src/app/shared/components/base-table/base-table.component.ts](../../apps/dms-material/src/app/shared/components/base-table/base-table.component.ts) — SCROLLING REGRESSION HISTORY block + Round-8 `contextId` / `effect()` / `scrollToTop()`
- [apps/dms-material/src/app/account-panel/account-selection-integration.spec.ts](../../apps/dms-material/src/app/account-panel/account-selection-integration.spec.ts) — Account-change signal reference
- [_bmad-output/project-context.md](../project-context.md) — Project-wide rules
- This story is a prerequisite for Story 106.2 (root-cause + fix) and Story 106.3
  (regression suite).

### Project Structure Notes

- All paths align with the existing project layout (no new directories).
- Reproduction spec, if committed, lives at
  `apps/dms-material-e2e/src/scrolling-regression-106.spec.ts` — same naming pattern
  as `scrolling-regression-101.spec.ts`, `scrolling-regression-87.spec.ts`, and
  `scrolling-regression-105.spec.ts`.
- Helpers: reuse only; no new files under `apps/dms-material-e2e/src/helpers/`.

## Dev Agent Record

### Agent Model Used

_To be filled by dev agent._

### Debug Log References

_To be filled by dev agent._

### Live-DOM Evidence (Tasks 3, 4, 6 — requires live Playwright MCP execution)

_To be filled by dev agent during Tasks 3, 4, and 6._

### Completion Notes List

_To be filled by dev agent._

### File List

_To be filled by dev agent._
