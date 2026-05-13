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

- [ ] **Task 1 — Confirm the full set of virtual-scrolled screens** (AC: #1)
  - [ ] Run `grep -rn "<dms-base-table\|cdk-virtual-scroll-viewport" apps/dms-material/src --include="*.html"`
        and record every screen that hosts a virtual-scroll table in Dev Notes under
        "Screens Under Test".
  - [ ] Cross-check against the Epic-101 list (Universe, Open Positions, Sold Positions,
        Dividend Deposits, Screener — see
        [101-1-reproduce-scrolling-all-screens.md](101-1-reproduce-scrolling-all-screens.md)).
        If any screen has been added or renamed since Epic 101, call it out — Story 105.2's
        fix and Story 105.3's suite must cover it.
  - [ ] For each screen, identify the **route + UI control** that performs:
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

- [ ] **Task 7 — (Optional) commit a `test.fail()` reproduction spec** (AC: #5)
  - [ ] If committing: create
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
  - [ ] If skipping: add a "Why no spec was committed" subsection under Dev Notes.

- [ ] **Task 8 — Prior-epic review and live-candidate enumeration** (AC: #3, #4)
  - [ ] Read the implementation-artifact story files for Epics 29, 31, 44, 60, 64, 87,
        and 101 (file IDs listed in Dev Notes). For each epic, write 2–4 sentences:
        stated root cause, what changed, why the fix is **specific to the
        freshly-loaded case** (i.e. why it does not eliminate the context-change
        failure mode).
  - [ ] Cross-reference with the file-header comment block in
        `apps/dms-material-e2e/src/universe-scrolling-regression.spec.ts` and the
        SCROLLING REGRESSION HISTORY block in
        `apps/dms-material/src/app/shared/components/base-table/base-table.component.ts`.
  - [ ] Combine the live-DOM evidence (Task 6) with the prior-epic review to produce the
        "Live Root-Cause Candidates" list required by AC4. Each candidate must point at
        the specific file(s) Story 105.2 will need to read.

- [ ] **Task 9 — Quality gate** (AC: #6)
  - [ ] Confirm `git diff --stat` shows only this story file (and, optionally, the spec
        from Task 7).
  - [ ] Run `pnpm all` and confirm all tests pass.
  - [ ] Record the result in Dev Notes "Completion Notes List".

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
| Universe          | `http://localhost:4301/universe`                         |
| Open Positions    | `http://localhost:4301/accounts/{id}/open-positions`     |
| Sold Positions    | `http://localhost:4301/accounts/{id}/sold-positions`     |
| Dividend Deposits | `http://localhost:4301/accounts/{id}/div-deposits`       |
| Screener          | `http://localhost:4301/screener`                         |

If any other `<dms-base-table>` host has been added since Epic 101, add it to the matrix
and call it out in Dev Notes.

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

```
Screen              │ Browser  │ Trigger        │ header-under-header │ header-with-content │ flicker
────────────────────┼──────────┼────────────────┼─────────────────────┼─────────────────────┼────────
Universe            │ Chromium │ account-change │  ?                  │  ?                  │  ?
Universe            │ Chromium │ filter-change  │  ?                  │  ?                  │  ?
Universe            │ Firefox  │ account-change │  ?                  │  ?                  │  ?
Universe            │ Firefox  │ filter-change  │  ?                  │  ?                  │  ?
Open Positions      │ Chromium │ account-change │  ?                  │  ?                  │  ?
…                    …          …                …                     …                     …
Screener            │ Firefox  │ filter-change  │  ?                  │  ?                  │  ?
```

Cells: `FAIL @ <viewport> <speed>`, `clean`, or `n/a` (with a note).

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

### Live Root-Cause Candidates (template — fill in during Task 8)

> Replace this list during Task 8 with what the live-DOM evidence (Task 6) actually
> supports. Keep only the candidates with at least one cell of supporting evidence; for
> each, point at the specific files Story 105.2 will need to read.

1. **CDK viewport `_renderedRange` not reset on data-source swap** — evidence: …;
   next step for 105.2: …; files: `base-table.component.ts/.html`, the per-screen
   data-pipeline file.
2. **Sticky containing-block re-created by structural directive on context change** —
   evidence: …; next step for 105.2: …; files: `base-table.component.html`,
   `base-table.component.scss`, the per-screen wrapper template.
3. **Row-identity churn from selector returning new array reference but same row keys** —
   evidence: …; next step for 105.2: …; files: per-screen pipeline + `trackBy` definition.
4. **Conditional `transform` / `will-change` / `contain` ancestor during loading state** —
   evidence: …; next step for 105.2: …; files: `base-table.component.scss`, any
   wrapper that toggles classes during loading (e.g. global universe / screener
   loading-state wrappers).
5. **`isLoading → null` array shrink (Epic 60 mechanism)** — evidence: …; next step for
   105.2: …; files: per-screen pipeline.

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

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
