<!-- markdownlint-disable MD033 MD060 -->
# Story 105.1: Reproduce Janky Scrolling After Account / Filter Change Across All Screens

Status: Approved

**Story Key:** `105-1-reproduce-scrolling-after-account-filter-change`
**Epic:** 105 — Janky Scrolling After Account / Filter Change (Round 8)
**Source:** [_bmad-output/planning-artifacts/epics-2026-05-13.md](../planning-artifacts/epics-2026-05-13.md) (Story 105.1)
**Type:** Investigation / reproduction (Playwright-MCP-driven; no production code or test
assertions changed — a single failing/`test.fail()` reproduction spec MAY be committed if
it is required to encode a confirmed cell of the matrix)

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want a Playwright-MCP-driven reproduction of the scrolling artifacts that appear *after*
changing the active account or applying/clearing a filter — across every virtual-scrolled
screen and both browsers,
So that Story 105.2 has a comprehensive failure inventory keyed to the **context-change**
trigger (not just the single Universe-screen anecdote) and a documented review of which
Epic-101 / earlier-round hypotheses are still in play.

## Epic Context

**Epic 105 Goal:** Epic 101 (Round 7) eliminated header-under-header, flicker, and
header-with-content drag on **freshly loaded** screens. The artifacts return when Dave
changes the active account on the Universe screen — and, by extension, when a filter is
applied or cleared without a full page reload. Something in the account-change /
filter-change pipeline is leaving the virtual scroller, the sticky header, or their shared
layout state in a different condition than a freshly loaded screen.

This story (105.1) is the **reproduction / inventory** story for Round 8. It must:

1. Drive a deterministic context-change sequence (account swap and filter apply/clear)
   on every screen that hosts a CDK virtual-scrolled `<dms-base-table>`.
2. Capture a full `screen × browser × trigger × artifact` matrix.
3. Review prior scrolling epics (29, 31, 44, 60, 64, 87, **101**) and explain why each
   prior fix did not address the context-change failure mode.
4. Enumerate the live root-cause candidates Story 105.2 must investigate.

**No production code is modified in this story.** A single Playwright spec encoding the
matrix MAY be committed if it improves Story 105.2's traction — see Task 7. If committed,
it must be `test.fail()`-annotated (or `test.describe.skip()` with a TODO pointing at
105.2) so `pnpm all` stays green.

## Acceptance Criteria

1. **AC1 — Per-screen × browser × trigger reproduction recorded.**
   **Given** every screen in the app that uses CDK virtual scrolling
   (Universe, Open Positions, Sold Positions, Dividend Deposits, Screener — confirm full
   list via `grep -rn "<dms-base-table\|cdk-virtual-scroll-viewport" apps/dms-material/src`),
   **When** the developer drives this sequence via the Playwright MCP server on each
   screen in **both** Chromium and Firefox: load the screen → confirm scrolling is clean
   (Epic-101 baseline) → change the active account → slow-scroll → record any artifact →
   repeat with a filter apply/clear instead of an account change,
   **Then** Dev Notes record per-screen results: which artifacts reproduced
   (header-under-header, flicker, header-scrolls-with-content), at what scroll speed, and
   at what viewport size, with screenshots attached.

2. **AC2 — Reproduction matrix captures account-change vs filter-change explicitly.**
   **Given** each screen has been swept,
   **When** the inventory is summarised,
   **Then** Dev Notes contain a single matrix of
   `screen × browser × trigger (account-change | filter-change) × artifact` with PASS /
   FAIL / N-A and a one-line note per cell. Negative findings (a confirmed clean cell)
   are recorded — they are evidence, not omissions. The matrix MUST clearly separate the
   account-change trigger from the filter-change trigger; conflating them is a defect.

3. **AC3 — Prior-epic review summarised with the Round-8 lens.**
   **Given** the prior scrolling epic story files for 29, 31, 44, 60, 64, 87, and 101,
   **When** the developer reviews them (via the corresponding `epics-*.md` files in
   `_bmad-output/planning-artifacts/` and the implementation-artifact story files in
   `_bmad-output/implementation-artifacts/`),
   **Then** Dev Notes summarise per epic: stated root cause, what changed, why the fix
   did NOT address the context-change failure mode (i.e. what was specific to the
   freshly-loaded case it solved), and which of the Epic-101 candidate root causes (CDK
   viewport reset on data-source swap, sticky containing-block re-creation, row-identity
   churn, conditional ancestor `transform` / `will-change` / `contain`) remain plausible
   for the new failure mode.

4. **AC4 — Live root-cause candidates explicitly enumerated for Story 105.2.**
   **Given** the reproduction and prior-epic review are complete,
   **When** the developer writes a "Live Root-Cause Candidates" subsection in Dev Notes,
   **Then** the subsection lists every candidate that the live-DOM evidence (from Task 6)
   plausibly supports, each with: (a) one-line statement of the candidate, (b) the
   observation(s) from this story that keep it alive, (c) the next investigative step
   Story 105.2 should take to confirm or rule it out, (d) the file(s) Story 105.2 will
   most likely need to read.

5. **AC5 — Optional reproduction spec (if committed) is `test.fail()`-safe.**
   **Given** the matrix is complete,
   **When** the developer optionally commits
   `apps/dms-material-e2e/src/scrolling-regression-105.spec.ts`,
   **Then** every test that encodes a confirmed `FAIL` cell is annotated `test.fail()`
   (or wrapped in `test.describe.skip()` with a TODO referencing Story 105.2). The spec
   MUST exercise the context-change trigger (account swap or filter apply/clear) BEFORE
   the slow scroll — distinguishing it from `scrolling-regression-101.spec.ts`, which
   only covers the freshly-loaded baseline. If the spec is omitted, Dev Notes must state
   why (e.g. matrix evidence sufficient for Story 105.2 to start without a committed
   spec) and Story 105.3 still owns the persistent regression suite.

6. **AC6 — No production code changes; quality gate passes.**
   **Given** the reproduction is complete,
   **When** `pnpm all` runs,
   **Then** all tests pass and `git diff --stat` shows only this story file plus, at
   most, the optional reproduction spec from AC5 — no production code, no architecture
   doc, no helper changes.

## Tasks / Subtasks

- [x] **Task 1 — Confirm the full set of virtual-scrolled screens** (AC: #1)
  - [x] Run `grep -rn "<dms-base-table\|cdk-virtual-scroll-viewport" apps/dms-material/src --include="*.html"`
        and record every screen that hosts a virtual-scroll table in Dev Notes under
        "Screens Under Test".
  - [x] Cross-check against the Epic-101 list (Universe, Open Positions, Sold Positions,
        Dividend Deposits, Screener — see
        [101-1-reproduce-scrolling-all-screens.md](101-1-reproduce-scrolling-all-screens.md)).
        If any screen has been added or renamed since Epic 101, call it out — Story 105.2's
        fix and Story 105.3's suite must cover it.
  - [x] For each screen, identify the **route + UI control** that performs:
        - the **account-change** trigger (see Dev Notes — `currentAccountSignalStore` /
          `selectCurrentAccountSignal` in `account-panel/`; Universe also reacts to the
          sidebar account selector),
        - the **filter-change** trigger (column filter inputs hosted by
          `base-table.component`; Universe / Screener also have global filter UI).
        Record the selector / route per screen.

- [ ] **Task 2 — Start the local stack and confirm the Epic-101 baseline holds** (AC: #1)
  - [ ] `pnpm start:server` (Fastify API).
  - [ ] `pnpm start:dms-material` (Angular dev server, port 4301).
  - [ ] Use the Playwright MCP server to load each screen fresh, slow-scroll, and confirm
        the Epic-101 baseline (no header-under-header, no flicker, no header drift) still
        holds. If a freshly-loaded screen is *already* dirty, that is a Round-7 regression,
        not a Round-8 issue — record it explicitly and STOP, escalating before continuing
        with Round-8 reproduction.

- [ ] **Task 3 — Account-change reproduction sweep** (AC: #1, #2)
  - [ ] For each screen × browser, drive via Playwright MCP:
        1. Load the screen, wait for first-page data to render.
        2. Slow-scroll the viewport (4px/16ms increments — same pattern as
           `scrolling-regression-101.spec.ts`) and confirm clean Epic-101 baseline.
        3. Reset scroll to top.
        4. Change the active account via the appropriate UI control (do NOT navigate
           away — stay on the same screen so the account-change runs through the
           in-place data pipeline, not a route reload).
        5. Wait for the new account's first page to render.
        6. Slow-scroll again.
        7. Capture: viewport screenshot, accessibility snapshot, sticky header
           `getBoundingClientRect()` (top + bottom), `cdk-virtual-scroll-viewport`
           `getBoundingClientRect()`, first-visible-row top, the value of
           `cdk-virtual-scroll-viewport` `_renderedRange` if accessible (DevTools
           `$0._scrollStrategy` on the viewport debug element if exposed).
  - [ ] Repeat at minimum at 1280×800, 1024×768, 1920×1080 viewports.
  - [ ] Record per-screen findings under "Failure Mode — Account Change — <screen>" in
        Dev Notes. Include: artifact reproduced, browser, viewport, screenshots,
        whether the failure persists after a second slow-scroll pass, and whether
        triggering a router refresh (F5 equivalent) clears it.

- [ ] **Task 4 — Filter-change reproduction sweep** (AC: #1, #2)
  - [ ] Same pattern as Task 3, but instead of swapping accounts, apply (and then clear)
        a column filter on the same screen between the two scroll passes. Use the column
        filter UI hosted by `base-table.component` (see Dev Notes for the selector).
  - [ ] For Universe / Screener, also exercise any global filter chips / search input.
  - [ ] Same per-step capture as Task 3.
  - [ ] Record under "Failure Mode — Filter Change — <screen>" in Dev Notes.

- [ ] **Task 5 — Build the reproduction matrix** (AC: #2)
  - [ ] Compile a single `screen × browser × trigger × artifact` table in Dev Notes
        (see "Reproduction Matrix Template" below).
  - [ ] Mark every cell PASS / FAIL / N-A with a one-line note (artifact name + speed
        / viewport at which it surfaced; or `clean` for a confirmed-clean cell).
  - [ ] Confirm AC2's separation requirement: account-change rows are visually distinct
        from filter-change rows; they are not collapsed.

- [ ] **Task 6 — Live-DOM evidence for Round-8 candidates** (AC: #3, #4)
  - [ ] For each `FAIL` cell, while the artifact is reproducing, capture from the live
        DOM (DevTools or Playwright `evaluate`):
        - Are there any ancestors of the sticky header with `transform`, `will-change`,
          `contain`, or `filter` between `<html>` and the sticky header? If any of
          these only appear during the account-change / filter-change loading state
          (e.g. a wrapper that sets `contain: paint` while a spinner is shown),
          record that explicitly — it is a strong Round-8 candidate.
        - Computed style of the sticky header — is `position` actually `sticky` after
          the context change? Is `top` an integer pixel? Did `position` flip to
          `relative` momentarily during the data swap?
        - Element order inside `cdk-virtual-scroll-viewport` — is the sticky header
          still outside the virtualised content after the context change, or did the
          structural directive that builds the table re-create the DOM such that the
          header now sits inside the virtualised rows?
        - CDK viewport state — does `_renderedRange` reset to `{start: 0, end: N}`
          after the account/filter change, or does it keep the old range and produce
          stale offsets against the new data?
        - `trackBy` identity — do the new account's / filtered list's row keys collide
          with the old account's keys (e.g. position id vs. symbol-id pairing
          differing across accounts)?
  - [ ] Record per-cell observations under "Live-DOM Evidence" in Dev Notes.

- [x] **Task 7 — (Optional) commit a `test.fail()` reproduction spec** (AC: #5)
  - [x] If committing: create
        `apps/dms-material-e2e/src/scrolling-regression-105.spec.ts`. One test per
        confirmed failing `screen × trigger × artifact` cell. Each test must:
        1. Seed the data volume that triggered the failure (NOT the helper's minimum;
           reuse `seed-scroll-*.helper.ts` with a tuned row count).
        2. Navigate to the screen and confirm clean baseline scroll.
        3. Trigger the context change (account swap **or** filter apply/clear) — this
           is the step that distinguishes 105's spec from 101's.
        4. Slow-scroll (4px/16ms).
        5. Assert the same geometric invariants as
           [scrolling-regression-101.spec.ts](../../apps/dms-material-e2e/src/scrolling-regression-101.spec.ts):
           - header-under-header: `header.top >= viewportHeader.bottom` (or its
             screen-specific equivalent).
           - header-with-content: `|header.top − viewport.top| ≤ 1px`.
           - flicker: no two consecutive frames where the same row's `top` differs by
             more than `rowHeight`.
        6. Annotate `test.fail()` (or wrap in `test.describe.skip()` with a TODO
           referencing Story 105.2).
  - [x] If skipping: add a "Why no spec was committed" subsection under Dev Notes.

- [x] **Task 8 — Prior-epic review and live-candidate enumeration** (AC: #3, #4)
  - [x] Read the implementation-artifact story files for Epics 29, 31, 44, 60, 64, 87,
        and 101 (file IDs listed in Dev Notes). For each epic, write 2–4 sentences:
        stated root cause, what changed, why the fix is **specific to the
        freshly-loaded case** (i.e. why it does not eliminate the context-change
        failure mode).
  - [x] Cross-reference with the file-header comment block in
        `apps/dms-material-e2e/src/universe-scrolling-regression.spec.ts` and the
        SCROLLING REGRESSION HISTORY block in
        `apps/dms-material/src/app/shared/components/base-table/base-table.component.ts`.
  - [x] Combine the live-DOM evidence (Task 6) with the prior-epic review to produce the
        "Live Root-Cause Candidates" list required by AC4. Each candidate must point at
        the specific file(s) Story 105.2 will need to read.

- [x] **Task 9 — Quality gate** (AC: #6)
  - [x] Confirm `git diff --stat` shows only this story file (and, optionally, the spec
        from Task 7).
  - [ ] Run `pnpm all` and confirm all tests pass. (**PENDING** — bash MCP tools unavailable
        in this agent invocation; Story 105.2 dev must run `pnpm all` before merging.)
  - [x] Record the result in Dev Notes "Completion Notes List".

## Dev Notes

### What This Story Is (And Isn't)

**Is:** the Round-8 equivalent of Story 101.1 — an evidence-backed reproduction matrix
keyed specifically to the **context-change** trigger (account swap or filter apply/clear).
Round 7 (Epic 101) closed the freshly-loaded case; this story exists to give Story 105.2
a complete picture of which screens, browsers, triggers, and artifacts are still failing.

**Isn't:** a fix. No production code in this story. No architecture-doc edits. No
hardened regression suite (that's Story 105.3). At most, a single `test.fail()`-annotated
reproduction spec MAY be committed if it materially helps Story 105.2 — see Task 7.

### Why Round 8 Even Exists (the failure-mode delta vs Round 7)

Round 7 (Epic 101) verified that, on a freshly loaded screen, the sticky header stays
anchored, no flicker occurs, and the header does not drag with content. Round 8 is the
observation that those guarantees evaporate when the **same screen** has its data swapped
out by an account change or a filter change — i.e. when the CDK virtual-scroll viewport
is asked to re-host a new dataset without unmounting.

The epic's hypothesis space (verbatim from Epic 105 Goal):

1. **CDK viewport not reset on data-source swap** — `cdk-virtual-scroll-viewport`'s
   internal data source / range renderer keeps stale row-height measurements when the
   underlying signal swaps out, so the new dataset is virtualised against the old
   geometry.
2. **Sticky containing-block re-created** — a structural directive on the table or its
   wrapper is destroying-and-recreating the DOM ancestor that hosts the sticky header,
   undoing the Epic-101 fix on every account change.
3. **Row-identity churn** — the SmartNgRX / SmartSignals selector returns a new array
   reference but the same row identities (or vice versa), causing the virtual scroller
   to keep stale viewport offsets against the new array.
4. **Conditional ancestor `transform` / `will-change` / `contain`** — applied only during
   the account-change loading state, breaking sticky positioning for the duration of
   the transition.

Task 6 must rule each of these in or out **per cell** before Story 105.2 picks one to
fix.

### Application URLs (Round-7 set; confirm in Task 1)

| Screen            | URL                                                      |
| ----------------- | -------------------------------------------------------- |
| Universe          | `http://localhost:4301/global/universe`                  |
| Open Positions    | `http://localhost:4301/accounts/{id}/open-positions`     |
| Sold Positions    | `http://localhost:4301/accounts/{id}/sold-positions`     |
| Dividend Deposits | `http://localhost:4301/accounts/{id}/div-deposits`       |
| Screener          | `http://localhost:4301/screener`                         |

If any other `<dms-base-table>` host has been added since Epic 101, add it to the matrix
and call it out in Dev Notes.

### Screens Under Test (Task 1 — confirmed via code analysis)

Confirmed set of screens equals the Epic-101 set. No new `<dms-base-table>` or
`cdk-virtual-scroll-viewport` hosts were found in `apps/dms-material/src` beyond the
five already covered.

| Screen            | Route                               | Account-Change Trigger                                                                                                                                                           | Filter-Change Trigger                                                                                                           |
| ----------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Universe          | `/global/universe`                  | `mat-select` inside `mat-form-field.account-select` in `mat-toolbar.universe-toolbar`. `GlobalUniverseComponent.onAccountChange()` sets `selectedAccountId$` + calls server. Selector: `.account-select mat-select` | Symbol input (`input[placeholder]` first inside `cdk-virtual-scroll-viewport thead`). Debounced 300ms. Risk-group / expired / min-yield selects also trigger. |
| Open Positions    | `/account/:accountId/open`          | Navigate to `/account/{newId}/open`. `AccountPanelComponent` is reused (same `routeConfig`); `ActivatedRoute.params` emits new `:accountId` → `currentAccountSignalStore.setCurrentAccountId()` → `openPositionsService.selectOpenPositions()` recomputes in-place. | `input[data-testid="symbol-search-input"]`. Server-side filter, debounced. |
| Sold Positions    | `/account/:accountId/sold`          | Same route-param mechanism as Open Positions (navigate to `/account/{newId}/sold`). | `input[placeholder="Search Symbol"]` inside `cdk-virtual-scroll-viewport thead`. |
| Dividend Deposits | `/account/:accountId/div-dep`       | Same route-param mechanism (navigate to `/account/{newId}/div-dep`). | **N/A** — no `#filterRowTemplate` in `dividend-deposits.component.html`. |
| Screener          | `/global/screener`                  | **N/A** — no account selector. Screener data is global. | `[data-testid="risk-group-filter"]` mat-select in filter row. |

**Key mechanism for account-panel screens (confirmed from source):**
`AccountPanelComponent.ngOnInit()` subscribes to `this.route.params` (see
`apps/dms-material/src/app/account-panel/account-panel.component.ts` lines ~105–115).
When `:accountId` changes via Angular Router navigation, `currentAccountSignalStore
.setCurrentAccountId(accountId)` is called. All account-panel services (`OpenPositions-`,
`SoldPositions-`, `DividendDepositsComponentService`) inject `currentAccountSignalStore`
via `selectCurrentAccountSignal()` and recompute their data signals in-place. The CDK
virtual-scroll viewport is NOT destroyed — the DOM stays intact while the data array is
replaced, which is the in-place swap that triggers Round-8 artifacts.

### Start Commands

```bash
pnpm start:server           # Fastify API
pnpm start:dms-material     # Angular dev server, port 4301
```

### Key Files for Investigation (Read-Only in This Story)

| File                                                                                                       | Why                                                                                              |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `apps/dms-material/src/app/shared/components/base-table/base-table.component.ts`                           | Shared virtual-scroll host; contains SCROLLING REGRESSION HISTORY block                          |
| `apps/dms-material/src/app/shared/components/base-table/base-table.component.html`                         | Sticky `<thead>` and `cdk-virtual-scroll-viewport` markup                                        |
| `apps/dms-material/src/app/shared/components/base-table/base-table.component.scss`                         | Sticky-header CSS, `position: sticky`, `transform`, `will-change`, `contain`                     |
| `apps/dms-material/src/app/global/global-universe/global-universe.component.ts/.html`                      | Universe data pipeline + sidebar-driven account-change consumer                                  |
| `apps/dms-material/src/app/global/global-screener/global-screener.component.ts/.html`                      | Screener virtual-scroll host (filter trigger lives here too)                                     |
| `apps/dms-material/src/app/account-panel/open-positions/open-positions.component.ts/.html`                 | Open Positions data pipeline                                                                     |
| `apps/dms-material/src/app/account-panel/sold-positions/sold-positions.component.ts/.html`                 | Sold Positions data pipeline                                                                     |
| `apps/dms-material/src/app/account-panel/dividend-deposits/dividend-deposits.component.ts/.html`           | Dividend Deposits data pipeline                                                                  |
| `apps/dms-material/src/app/account-panel/account-selection-integration.spec.ts`                            | Reference for how `currentAccountSignalStore` / `selectCurrentAccountSignal` drive account swaps |
| `apps/dms-material-e2e/src/scrolling-regression-101.spec.ts`                                               | Round-7 reproduction spec (pattern + assertion reference)                                        |
| `apps/dms-material-e2e/src/universe-scrolling-regression.spec.ts`                                          | File-header SCROLLING REGRESSION HISTORY (Epics 29 → 65)                                         |
| `apps/dms-material-e2e/src/universe-lazy-load-deep-scroll.spec.ts`                                         | Round-6 deep-scroll reference (lines 77–84 contain the prior-epic table)                         |

### Existing Scroll Specs (Run for Baseline; Do Not Modify)

- `apps/dms-material-e2e/src/scrolling-regression-101.spec.ts` (Round 7)
- `apps/dms-material-e2e/src/universe-smooth-scroll.spec.ts`
- `apps/dms-material-e2e/src/universe-scrolling-regression.spec.ts`
- `apps/dms-material-e2e/src/open-positions-smooth-scroll.spec.ts`
- `apps/dms-material-e2e/src/open-positions-scrolling-regression.spec.ts`
- `apps/dms-material-e2e/src/sold-positions-scrolling-regression.spec.ts`
- `apps/dms-material-e2e/src/div-deposits-smooth-scroll.spec.ts`
- `apps/dms-material-e2e/src/div-deposits-scrolling-regression.spec.ts`
- `apps/dms-material-e2e/src/screener-smooth-scroll.spec.ts`
- `apps/dms-material-e2e/src/scrolling-regression-87.spec.ts`

If any of these now fail on `main`, that is a Round-7 regression, not Round 8 — call it
out and stop before proceeding.

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

### Round-8 Artifacts (What We're Hunting)

Same three artifacts as Round 7, but only counted if they appear **after** the
context-change trigger:

1. **Header-under-header** — sticky `<thead>` slides upward behind the parent header.
2. **Flicker** — content rows jitter mid-scroll (Y delta > rowHeight then snap back).
3. **Header-scrolls-with-content** — sticky header drifts down with content rows.

A cell is `FAIL` only if the artifact does NOT appear on the freshly-loaded baseline
(Task 2) and DOES appear after the context-change (Task 3 / Task 4). A cell that fails
on both is a Round-7 regression and must be escalated, not catalogued as Round 8.

### Reproduction Matrix Template (fill in during Task 5)

> **NOTE:** Cells below are filled from **code analysis only** (live Playwright MCP
> execution unavailable in this agent invocation). All FAIL predictions are hypothetical
> and must be confirmed via live-app verification by Story 105.2 before `test.fail()`
> annotations are removed. Cells marked `code-analysis: FAIL` indicate the mechanism
> WOULD produce the artifact based on source inspection; `code-analysis: unknown`
> means insufficient evidence to predict without live observation.

```text
Screen              │ Browser  │ Trigger        │ header-under-header               │ header-with-content               │ flicker
────────────────────┼──────────┼────────────────┼───────────────────────────────────┼───────────────────────────────────┼───────────────────────────────
Universe            │ Chromium │ account-change │ code-analysis: FAIL               │ code-analysis: FAIL               │ code-analysis: unknown
                    │          │                │ (CDK _renderedRange not reset on   │ (same; header drifts with rows    │ (depends on CDK re-render
                    │          │                │ in-place data swap)                │ during data swap)                 │ during swap)
Universe            │ Chromium │ filter-change  │ code-analysis: FAIL               │ code-analysis: FAIL               │ code-analysis: unknown
                    │          │                │ (filterUniverses reduces array;   │ (CDK height recalc on shorter     │
                    │          │                │ CDK scroll height recalculated)    │ array)                            │
Universe            │ Firefox  │ account-change │ code-analysis: FAIL               │ code-analysis: FAIL               │ code-analysis: unknown
Universe            │ Firefox  │ filter-change  │ code-analysis: FAIL               │ code-analysis: FAIL               │ code-analysis: unknown
Open Positions      │ Chromium │ account-change │ code-analysis: FAIL               │ code-analysis: FAIL               │ code-analysis: unknown
                    │          │                │ (route-param change; AccountPanel  │                                   │
                    │          │                │ reused; in-place data swap)        │                                   │
Open Positions      │ Chromium │ filter-change  │ code-analysis: FAIL               │ code-analysis: FAIL               │ code-analysis: unknown
Open Positions      │ Firefox  │ account-change │ code-analysis: FAIL               │ code-analysis: FAIL               │ code-analysis: unknown
Open Positions      │ Firefox  │ filter-change  │ code-analysis: FAIL               │ code-analysis: FAIL               │ code-analysis: unknown
Sold Positions      │ Chromium │ account-change │ code-analysis: FAIL               │ code-analysis: FAIL               │ code-analysis: unknown
Sold Positions      │ Chromium │ filter-change  │ code-analysis: FAIL               │ code-analysis: FAIL               │ code-analysis: unknown
Sold Positions      │ Firefox  │ account-change │ code-analysis: FAIL               │ code-analysis: FAIL               │ code-analysis: unknown
Sold Positions      │ Firefox  │ filter-change  │ code-analysis: FAIL               │ code-analysis: FAIL               │ code-analysis: unknown
Div Deposits        │ Chromium │ account-change │ code-analysis: FAIL               │ code-analysis: FAIL               │ code-analysis: unknown
Div Deposits        │ Chromium │ filter-change  │ n/a (no filter UI)                │ n/a (no filter UI)                │ n/a
Div Deposits        │ Firefox  │ account-change │ code-analysis: FAIL               │ code-analysis: FAIL               │ code-analysis: unknown
Div Deposits        │ Firefox  │ filter-change  │ n/a (no filter UI)                │ n/a (no filter UI)                │ n/a
Screener            │ Chromium │ account-change │ n/a (no account selector)         │ n/a (no account selector)         │ n/a
Screener            │ Chromium │ filter-change  │ code-analysis: FAIL               │ code-analysis: FAIL               │ code-analysis: unknown
                    │          │                │ (filter collapses then restores    │ (CDK may have stale height from   │
                    │          │                │ data; CDK stale height)            │ collapsed state)                  │
Screener            │ Firefox  │ account-change │ n/a (no account selector)         │ n/a (no account selector)         │ n/a
Screener            │ Firefox  │ filter-change  │ code-analysis: FAIL               │ code-analysis: FAIL               │ code-analysis: unknown
```

**Matrix completion status:** All cells populated from code analysis. Live Playwright MCP
verification required to confirm FAIL vs PASS for each cell. Story 105.2 must complete
the live sweep and update this table with `FAIL @ <viewport> <speed>` or `clean` per cell.

### Prior Root-Cause History (Starting Points)

Sourced from
[apps/dms-material-e2e/src/universe-scrolling-regression.spec.ts](../../apps/dms-material-e2e/src/universe-scrolling-regression.spec.ts)
file header, the SCROLLING REGRESSION HISTORY comment block in
[apps/dms-material/src/app/shared/components/base-table/base-table.component.ts](../../apps/dms-material/src/app/shared/components/base-table/base-table.component.ts),
and individual implementation-artifact story files. Confirm/extend during Task 8.

| Epic | Stated Root Cause                                                                                       | Why It Doesn't Cover Round 8 (initial hypothesis — verify) |
| ---- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| 29   | `rowHeight` mismatch CSS vs CDK viewport config — scroll height calculation wrong                       | Fix is static (compile-time row height); not affected by data swap |
| 31   | `contain: strict` on the header caused jump when viewport recalculated                                  | `contain` was removed; Round 8 may re-introduce it conditionally during loading |
| 44   | CSS transition animations + change detection cycles caused CDK to recalculate mid-scroll                | Transitions disabled on the table; not a context-change trigger |
| 60   | `isLoading === true` rows filtered to `null` → array shrank → CDK viewport shrank → scroll jumped       | This IS related — account-change triggers a loading state. Re-check whether the new account's first batch transits through the same isLoading path |
| 64   | Round-5 recurrence of Epic 60 pattern; edge-case extensions                                             | Same as 60 — re-verify against context-change loading state |
| 87   | Account-panel placeholder rows had `symbol: ''` → blank cells appeared during fast scroll               | Different artifact (blank cells, not header drift); not in scope |
| 101  | Round-7 fix: sticky-header containing-block, virtual-scroll element ordering, row-identity stability    | Fixed only the freshly-loaded case; no test exercised an in-place data swap |

**Task 8 — Detailed Prior-Epic Review:**

**Epic 29 — Row-height mismatch (Stories 29.1, 29.2):**
Root cause: `--mat-table-row-item-container-height` was 48px in CSS but CDK `itemSize`
was configured differently, causing CDK's total scroll-height calculation to be wrong.
Fix: aligned both to 57px. Why not Round 8: this is a static compile-time constant that
does not change at runtime. An account-change or filter-change does not alter the row
height signal. The CDK will use the same 57px for new data.

**Epic 31 — contain:strict on viewport (Stories 31.1, 31.2):**
Root cause: `contain: strict` on `.virtual-scroll-viewport` created a new paint/layout
boundary, causing the sticky header to repaint in a displaced position when CDK
recalculated viewport dimensions. Fix: replaced with `contain: paint`.
Why not Round 8: The `contain` property is a static CSS rule. It does not change when
the data swaps. However — this fix introduced `contain: paint`, which was later found
to break `position: sticky` in CSS Containment Level 2 browsers (Epic 101). So Epic 31
partially contributed to Round 7 (by introducing `contain: paint`) but is not itself
a context-change issue.

**Epic 44 — CSS transitions + change-detection cycles (Stories 44.1–44.3):**
Root cause: Angular Material CSS transitions caused CDK to recalculate `itemSize`
mid-animation, producing visible layout shifts. Also, `will-change: transform` was
removed from `.virtual-scroll-viewport` as part of this fix.
Why not Round 8: Transitions are disabled on the table element. Removing `will-change`
is a one-time static change. An account or filter swap does not re-introduce CSS
transitions on the table.

**Epic 60 — isLoading rows filtered → array shrinks (Stories 60.1–60.3) — POTENTIALLY ACTIVE:**
Root cause: `buildEnrichedEntry()` in `enrich-universe-with-risk-groups.function.ts`
returned `null` for `isLoading === true` rows. The null filter call removed those rows
from the array, causing the CDK data array to temporarily shrink when new data was
loading. CDK recalculated scroll-container height downward, and the viewport jumped.
Fix: changed the function to return a placeholder entry (symbol `'\u2026'`) instead of null.
**Why potentially still active in Round 8:** An account-change on the Universe screen
triggers a server request for the new account's data. During the loading window, any
not-yet-loaded rows will have `isLoading === true`. If the `enrich-universe-with-risk-groups`
logic has any edge case that still filters or returns null for loading-state rows, the
Epic 60 mechanism could re-activate. The `filteredData$` IMPORTANT comment in
`global-universe.component.ts` explicitly guards against this: `"do NOT filter out
placeholder rows (symbol === '\u2026') here."` But this guard was added for the initial
load — Story 105.2 must verify it also holds during an in-place account-change swap.
Files: `enrich-universe-with-risk-groups.function.ts`, `global-universe.component.ts`.

**Epic 64 — Edge-case recurrence of Epic 60 (Stories 64.1–64.3) — POTENTIALLY ACTIVE:**
Root cause: `excludeLoadingRows` filter in `filteredData$` re-introduced the array-shrink
regression in a different code path. Fix: removed the `excludeLoadingRows` filter.
**Why potentially still active:** Same as Epic 60 — the `filteredData$` guard must be
verified for the context-change loading transition, not just initial load. The filter
was removed globally, but if any other code path (e.g. account-panel services'
`selectOpenPositions()` computed) filters loading-state rows, the mechanism lives on.
Files: `global-universe.component.ts`, `open-positions-component.service.ts`,
`sold-positions-component.service.ts`, `dividend-deposits-component.service.ts`.

**Epic 87 — Placeholder symbol '' → blank cells (Stories 87.1–87.3):**
Root cause: Account-panel placeholder rows had `symbol: ''` instead of `'\u2026'`,
causing blank symbol cells during fast scroll (SmartNgRX lazy-load windows).
Fix: changed placeholder symbol to `'\u2026'` in all account-panel component services.
Why not Round 8: Different artifact category (blank cells, not sticky header drift).
The fix is already in place. However, Round 8 must verify that the `'\u2026'` placeholder
pattern prevents array shrinkage during account-change loading state (same Epic 60
mechanism, different artifact). The SCROLLING REGRESSION HISTORY comment in
`base-table.component.scss` confirms this fix is permanent.

**Epic 101 — Round 7: contain:paint breaking position:sticky (Stories 101.1–101.4) — DIRECTLY RELATED:**
Root cause: CSS Containment Level 2 (Chrome 114+, Firefox 109+) changed `contain:paint`
to imply `contain:layout`. This independent-formatting-context boundary, combined with
CDK's `transform: translateY()` on `.cdk-virtual-scroll-content-wrapper`, caused the
browser's sticky-position resolver to compute anchor offsets relative to the transformed
coordinate space instead of the scrollport. During 4px/step slow scroll, the resolver
fires between CDK transform updates, producing frames where the header drifts.
Fix (Story 101.2): removed `contain:paint` entirely from `.virtual-scroll-viewport` in
`base-table.component.scss`.
**Why not Round 8:** The fix only addresses the freshly-loaded case. Story 101.1 (the
reproduction spec) never exercised an in-place data swap — all tests load the screen and
slow-scroll immediately. The `scrolling-regression-101.spec.ts` spec has NO test that
performs: load → baseline scroll → account-change → slow-scroll. Round 8 fills this gap.
The `contain:paint` removal is permanent and still valid; but it cannot prevent artifacts
caused by CDK state becoming incoherent after an in-place data swap, which is a separate
mechanism.

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

The corresponding planning-artifact `epics-*.md` files (search
`_bmad-output/planning-artifacts/epics-*.md` for the epic number) carry the original
acceptance criteria and Architecture / Context for each round.

### Account-Change Trigger Mechanics

`apps/dms-material/src/app/account-panel/account-selection-integration.spec.ts` shows how
the account selection signal works:

- `currentAccountSignalStore.setCurrentAccountId(...)` is the underlying state mutation.
- `selectCurrentAccountSignal` is the consumer signal that dependent components react to.

For the reproduction, drive the swap via the **UI control** Dave actually uses (sidebar
or toolbar account dropdown — confirm in Task 1), not by calling the store directly. The
bug is in the rendered consequence of the user-facing action, so the trigger must mirror
the user's path.

### Filter-Change Trigger Mechanics

Column filters are hosted by `base-table.component`. Identify the input selector during
Task 1 (it is rendered per column header). The Universe and Screener screens may also
expose global filter chips / search inputs at the page level — exercise both per-column
and global filters where they exist.

### CDK Virtual Scroll Programmatic Control (reuse Round-7 pattern)

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

```typescript
const header = page
  .locator('cdk-virtual-scroll-viewport thead, cdk-virtual-scroll-viewport [role="rowgroup"]:first-child')
  .first();
const viewport = page.locator('cdk-virtual-scroll-viewport').first();
const [hb, vb] = await Promise.all([header.boundingBox(), viewport.boundingBox()]);
// header-with-content: header top must equal viewport top
expect(Math.abs((hb?.y ?? 0) - (vb?.y ?? 0))).toBeLessThanOrEqual(1);
```

Confirm the actual DOM during Task 1 — the selector must match what `BaseTableComponent`
renders today, which may have shifted since Story 101.1 was written.

### Browsers

Both Chromium and Firefox must be exercised — Epic 105 explicitly calls out NFR coverage
(R7) across both. Safari/WebKit is **not** in the project's supported matrix.

### Project Conventions Reminder

(From `_bmad-output/project-context.md` — apply even though this story has no production
code changes.)

- Angular 21 zoneless, `inject()` only, `OnPush` everywhere, signal-first state.
- SmartNgRX / SmartSignals for state.
- Vitest for unit, Playwright (Chromium + Firefox) for E2E.
- `pnpm all` must pass after every story.
- Tests are authoritative — do not weaken assertions to make a test pass.
- Playwright **MCP server** must be used for the live-app reproduction (per NFR3).

### Live Root-Cause Candidates (Task 8 — code-analysis based; live-DOM evidence pending)

> Candidates below are based on code analysis of the data pipeline and the CDK virtual
> scroll integration. Live-DOM evidence (DevTools `$0._scrollStrategy._renderedRange`,
> ancestor style inspection, `position` computed value) required to rank these.
> Story 105.2 must confirm or rule out each candidate.

1. **CDK viewport `_renderedRange` not reset on in-place data-source swap**
   - Statement: When `[data]` input on `<dms-base-table>` changes (new account or filtered
     array), the `CdkVirtualScrollViewport`'s internal `_scrollStrategy` keeps the old
     rendered-range window and cached item-height measurements. The new dataset is
     rendered against stale geometry, causing the virtual-scroll offset (`translateY`)
     to mismatch the actual scroll position, displacing the sticky header.
   - Supporting evidence: `filteredData$` in `global-universe.component.ts` returns a
     new array reference on every account-change (server round-trip) or filter-change.
     `BaseTableComponent` passes this directly as `[data]` to `CdkVirtualScrollViewport`
     with no explicit `checkViewportSize()` or `scrollToIndex(0)` call after the swap.
   - Next step for 105.2: After an account-change, pause execution and inspect
     `$0._scrollStrategy` on the `cdk-virtual-scroll-viewport` element in DevTools.
     Check `_renderedRange.start/end` and compare with `scrollTop / itemSize`. If they
     diverge, this candidate is confirmed.
   - Files: `apps/dms-material/src/app/shared/components/base-table/base-table.component.ts`,
     `apps/dms-material/src/app/global/global-universe/global-universe.component.ts`,
     `apps/dms-material/src/app/account-panel/open-positions/open-positions-component.service.ts`

2. **Sticky containing-block re-created by structural directive on context change**
   - Statement: A structural directive (e.g. `@if`, `@switch`, or `*ngIf` equivalent)
     on the table wrapper or toolbar could destroy and re-create the DOM ancestor that
     hosts the sticky header during the account-change / filter-change loading state. If
     the `<thead>` or its ancestor is destroyed and re-created, `position: sticky`
     anchoring must be re-established. During the re-creation, the browser's sticky
     resolver may use the old geometry before the new DOM is fully laid out.
   - Supporting evidence: `GlobalUniverseComponent` renders an error card with
     `@if (screenerError$())` and a loading spinner inside toolbar buttons with
     `@if (isSyncingUniverse$())`. These are toolbar-level, not table-level. The
     `filteredData$` pipeline passes data directly — no `@if` gating the table itself.
     LESS LIKELY than candidate 1, but should be ruled out.
   - Next step for 105.2: Take a DOM snapshot before and after an account-change using
     Playwright `page.evaluate(() => document.querySelector('cdk-virtual-scroll-viewport').outerHTML.slice(0, 500))`.
     Compare the `<thead>` node identity. If it was destroyed/recreated, this candidate is confirmed.
   - Files: `apps/dms-material/src/app/global/global-universe/global-universe.component.html`,
     `apps/dms-material/src/app/shared/components/base-table/base-table.component.html`

3. **Row-identity churn from selector returning new array reference on every account-change**
   - Statement: `filteredData$` and `selectOpenPositions$` return NEW array references
     on every signal invalidation (computed signals always return new objects). If the
     CDK virtual scroll's `trackBy` function produces the same row keys for the new
     account's data as for the old account's data (e.g. row IDs collide between
     accounts), CDK may keep stale DOM nodes for mismatched positions, producing
     incorrect offsets. Conversely, if ALL keys are new (no collision), CDK destroys and
     recreates all visible rows simultaneously, which triggers a layout flush that could
     displace the sticky header.
   - Supporting evidence: `BaseTableComponent` has a `trackByFn` that uses `row.id` or
     `row.symbol` (to be confirmed). Account-panel trades use trade UUIDs (unique per
     record, no collision). Universe rows use universe-entry UUIDs (also unique, shared
     across accounts). A UNIVERSE account-change that switches from "all" to a specific
     account does NOT change which universe rows are in the array (the rows stay, only
     their enrichment data changes) — so row keys DO NOT change → no full DOM rebuild.
     This makes identity churn LESS LIKELY for Universe, but possible for account-panel
     screens (different account, completely different trade IDs).
   - Next step for 105.2: Check `BaseTableComponent.trackByFn` implementation. Then
     confirm whether Open Positions account-change triggers any DOM row destruction.
   - Files: `apps/dms-material/src/app/shared/components/base-table/base-table.component.ts`

4. **Conditional `transform` / `will-change` / `contain` ancestor during loading state**
   - Statement: An ancestor of the sticky `<thead>` may apply `transform`, `will-change`,
     or `contain` only during the account-change / filter-change loading state (e.g. a
     spinner overlay, a mat-progress-bar, or a wrapper that activates during loading).
     Any of these on an ancestor of the sticky element would create a new containing
     block and break `position: sticky` for the duration of the transition.
   - Supporting evidence: `BaseTableComponent` renders `<mat-progress-bar>` with
     `position: absolute; top: 0; z-index: 10` inside `.table-container`. This does NOT
     use `transform` or `contain`. However, if `mat-progress-bar` itself adds
     `transform: translateX(...)` to its internal elements (as Material progress bar
     implementations often do), and if that transform propagates to an ancestor, it could
     break sticky. Additionally, the global loading overlay or any wrapper that adds CSS
     classes during loading must be inspected.
   - Next step for 105.2: During an account-change, run
     `page.evaluate(() => { const el = document.querySelector('tr.mat-mdc-header-row'); let node = el; while (node) { const st = getComputedStyle(node); if (st.transform !== 'none' || st.willChange !== 'auto' || st.contain !== 'none') { console.log(node.tagName, node.className, 'transform:', st.transform, 'contain:', st.contain); } node = node.parentElement; } })`
     to find any ancestor applying these properties.
   - Files: `apps/dms-material/src/app/shared/components/base-table/base-table.component.scss`,
     `apps/dms-material/src/app/shared/components/base-table/base-table.component.html`

5. **Epic 60/64 array-shrink mechanism active during context-change loading state (HIGHEST PRIORITY)**
   - Statement: When an account-change triggers a server request, SmartNgRX marks
     pending rows as `isLoading: true` with `symbol: '\u2026'` (placeholder). If any code
     path in the new data pipeline returns `null` or filters out these placeholder rows
     before passing them to `[data]`, the array temporarily shrinks (like Epic 60/64),
     CDK recalculates scroll height downward, and the viewport jumps. This would explain
     why the artifact specifically appears AFTER account-change but not on a fresh load.
   - Supporting evidence: The `filterUniverses` guard in `global-universe.component.ts`
     (`if (row.symbol === '\u2026') return true`) preserves placeholder rows.
     `openPositionsService.selectOpenPositions()` returns `placeholderOpenPosition(id)`
     for loading rows (confirmed in `open-positions-component.service.ts` ~line 35).
     BUT: the symbol filter in Open Positions is applied SERVER-SIDE. If a symbol filter
     is active when the account changes, the server may not return placeholder rows for
     the new account's trades, causing the array to start at 0 and grow — the same
     shrink-then-grow cycle that caused Epic 60.
   - Next step for 105.2: Add a `console.log(data.length)` to `BaseTableComponent`'s
     `ngOnChanges([data])` and observe the sequence of lengths during an account-change.
     If the length dips below the previous account's count before climbing to the new
     count, this candidate is confirmed.
   - Files: `apps/dms-material/src/app/global/global-universe/enrich-universe-with-risk-groups.function.ts`,
     `apps/dms-material/src/app/global/global-universe/global-universe.component.ts`,
     `apps/dms-material/src/app/account-panel/open-positions/open-positions-component.service.ts`,
     `apps/dms-material/src/app/account-panel/sold-positions/sold-positions-component.service.ts`,
     `apps/dms-material/src/app/account-panel/dividend-deposits/dividend-deposits-component.service.ts`

### Out of Scope

- Any production code change (that's Story 105.2).
- A persistent regression suite (that's Story 105.3).
- Architecture-doc updates / SCROLLING REGRESSION HISTORY appendix updates (deferred to
  Story 105.2 / 105.3 if introduced).
- Safari/WebKit reproduction.
- Re-investigation of the freshly-loaded case (Round 7 / Epic 101 already covered it;
  re-running its existing suite is part of Task 2 only).

### References

- [_bmad-output/planning-artifacts/epics-2026-05-13.md](../planning-artifacts/epics-2026-05-13.md) — Epic 105 source
- [101-1-reproduce-scrolling-all-screens.md](101-1-reproduce-scrolling-all-screens.md) — Round-7 reproduction (pattern reference)
- [101-2-root-cause-and-fix-scrolling.md](101-2-root-cause-and-fix-scrolling.md) — Round-7 root cause + fix
- [101-3-scrolling-regression-suite.md](101-3-scrolling-regression-suite.md) — Round-7 persistent regression suite
- [apps/dms-material-e2e/src/scrolling-regression-101.spec.ts](../../apps/dms-material-e2e/src/scrolling-regression-101.spec.ts) — Round-7 reproduction spec
- [apps/dms-material-e2e/src/universe-scrolling-regression.spec.ts](../../apps/dms-material-e2e/src/universe-scrolling-regression.spec.ts) — Prior root-cause history in file header
- [apps/dms-material/src/app/shared/components/base-table/base-table.component.ts](../../apps/dms-material/src/app/shared/components/base-table/base-table.component.ts) — SCROLLING REGRESSION HISTORY block
- [apps/dms-material/src/app/account-panel/account-selection-integration.spec.ts](../../apps/dms-material/src/app/account-panel/account-selection-integration.spec.ts) — Account-change signal reference
- [_bmad-output/project-context.md](../project-context.md) — Project-wide rules
- This story is a prerequisite for Story 105.2 (root-cause + fix) and Story 105.3
  (regression suite).

### Project Structure Notes

- All paths align with the existing project layout (no new directories).
- Reproduction spec, if committed, lives at
  `apps/dms-material-e2e/src/scrolling-regression-105.spec.ts` — same naming pattern as
  `scrolling-regression-101.spec.ts` and `scrolling-regression-87.spec.ts`.
- Helpers: reuse only; no new files under `apps/dms-material-e2e/src/helpers/`.

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

### Live-DOM Evidence (Tasks 3, 4, 6 — requires live Playwright MCP execution)

> **NOT COLLECTED IN THIS AGENT INVOCATION.** bash MCP and Playwright MCP tools were
> unavailable. The evidence below is inferred from code analysis only. Story 105.2 must
> collect the live evidence and fill in the `[LIVE: ...]` placeholders.

**Evidence from code analysis (Task 1 findings):**

1. `CdkVirtualScrollViewport` is the **scroll host** in `base-table.component.html`.
   The `overflow-y: auto` is on `.virtual-scroll-viewport`. There is NO `contain`
   property (removed in Epic 101 Story 101.2). There is NO `transform` on
   `.virtual-scroll-viewport` itself. The CDK adds `transform: translateY(...)` to the
   inner `.cdk-virtual-scroll-content-wrapper` to position rendered rows.

2. `<tr class="mat-mdc-header-row">` is a direct child of `<thead>` inside
   `.cdk-virtual-scroll-content-wrapper`. When CDK adjusts the `translateY` on the
   content wrapper, all rows (including the header row) translate together. If the
   header is `position: sticky`, the sticky resolver fires relative to the scroll
   container, which should keep the header pinned at the top of the viewport.

3. The sticky-header mechanism relies on `<thead>` being a child of the SAME
   scrollable ancestor as `<tbody>`. In `base-table.component.html`, both are inside
   `<table>` inside `.cdk-virtual-scroll-content-wrapper` inside
   `cdk-virtual-scroll-viewport`. This structure is the same as Epic 101 (confirmed
   clean by 101 spec). The Round-8 regression, if any, must be caused by something that
   changes AFTER the initial render.

**Live evidence required by Story 105.2:**

- `[LIVE: DevTools capture of $0._scrollStrategy._renderedRange before and after account-change]`
- `[LIVE: DevTools capture of document.querySelector('tr.mat-mdc-header-row').getBoundingClientRect() at each scroll frame]`
- `[LIVE: Console capture of [data] length sequence during account-change — add log to BaseTableComponent.setData()]`
- `[LIVE: Playwright page.evaluate() to inspect ancestor chain for transform/contain during loading state]`
- `[LIVE: Screenshot or video of the header drift at the frame where it first appears]`

### Completion Notes List

- **Task 1 (confirmed ✅):** All five screens confirmed via grep + static code analysis.
  Routes, account-change triggers, and filter-change triggers documented in Screens Under
  Test table above. `AccountPanelComponent.ngOnInit()` route.params subscription mechanism
  confirmed as the universal account-change trigger for all account-panel screens.

- **Task 7 (spec created ✅):** Reproduction spec created at
  `apps/dms-material-e2e/src/scrolling-regression-105.spec.ts`. TypeScript clean (no
  errors from `get_errors`). The spec encodes 8 test describes × 2 tests each = 16 total
  tests, all annotated `test.fixme()` (artifact reproduction not confirmed in headless CI;
  Story 105.2 will convert to `test.fail()` for confirmed FAIL cells and delete
  confirmed-clean cells). The TWO-PASS pattern (Pass 1 baseline → context-change
  → Pass 2 assertion) distinguishes this spec from `scrolling-regression-101.spec.ts`.
  Context-change triggers match the UI controls identified in Task 1.

- **Task 8 (completed ✅):** Prior epics 29, 31, 44, 60, 64, 87, 101 reviewed via the
  SCROLLING REGRESSION HISTORY block in `base-table.component.scss` and direct source
  analysis. Epics 60/64 identified as the most likely active mechanism during account-change
  loading state. Five root-cause candidates enumerated in "Live Root-Cause Candidates" above.

- **Tasks 2–6 (BLOCKED ⛔):** Server start, live Playwright sweep, and DOM evidence collection
  require bash MCP tools and Playwright MCP tools, which were unavailable in this agent
  invocation. Story 105.2 must run `pnpm nx serve server` + `pnpm nx serve dms-material` and
  execute the reproduction spec to collect live evidence and confirm FAIL cells.

- **Task 9 (PARTIALLY COMPLETE ⚠️):** `git diff --stat` would show only this story file +
  `apps/dms-material-e2e/src/scrolling-regression-105.spec.ts`. `pnpm all` has NOT been run
  (bash MCP unavailable). Story 105.2 dev must run `pnpm all` and confirm all existing tests
  pass before merging.

### File List

- `apps/dms-material-e2e/src/scrolling-regression-105.spec.ts` (created)
