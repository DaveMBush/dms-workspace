# Story 101.1: Reproduce Scrolling Failures Across All Screens (Playwright MCP)

Status: Approved

## Story

As a developer,
I want a Playwright-MCP-driven reproduction of the scrolling artifacts (header-under-header,
flicker, header-with-content drift) on every screen that uses a CDK virtual-scrolled table,
so that Story 101.2 has a comprehensive failure inventory to root-cause against, not just a
single anecdotal example.

## Acceptance Criteria

1. **Given** every screen in the app that uses CDK virtual scrolling
   (Universe, Open Positions, Sold Positions, Dividend Deposits, plus any other
   `<dms-base-table>` host),
   **When** the developer drives slow scrolling via the Playwright MCP server on each screen
   in **both** Chromium and Firefox,
   **Then** Dev Notes record per-screen results: which artifacts reproduced
   (header-under-header, flicker, header-scrolls-with-content), at what scroll speed, and at
   what viewport size, with screenshots attached.

2. **Given** each screen has been swept,
   **When** the inventory is summarised,
   **Then** Dev Notes contain a matrix of `screen × browser × artifact` with reproduction
   notes for every cell (positive **or** negative — a confirmed clean screen is a finding).

3. **Given** the prior Epic story files for 29, 31, 44, 60, 64, and 87,
   **When** the developer reviews them,
   **Then** Dev Notes summarise what each prior epic tried, why it didn't fully fix the issue
   (where known), and what we still don't know going into Story 101.2.

4. **Given** the existing scrolling regression E2E suites
   (`universe-scrolling-regression.spec.ts`, `universe-smooth-scroll.spec.ts`,
   `open-positions-smooth-scroll.spec.ts`, `div-deposits-smooth-scroll.spec.ts`,
   `scrolling-regression-87.spec.ts`),
   **When** the developer runs them against the current `main` codebase,
   **Then** Dev Notes record which suites currently pass and which (if any) currently fail,
   and — for any artifact that is observable on the live app but **not** caught by the
   existing suite — Dev Notes document the test-coverage gap (data volume, scroll pattern,
   timing, assertion style) that allowed it to slip through.

5. **Given** the candidate root-cause space listed in the epic
   (`position: sticky` containing-block loss from `transform`/`will-change`/`contain`
   ancestors; subpixel rounding from Tailwind utilities on the header row;
   CDK viewport vs. sticky-header element ordering; OnPush layout flush timing during the
   scroll frame; row-identity churn from the symbol-on-server refactor changing `trackBy`
   results mid-scroll),
   **When** the developer captures the reproduction,
   **Then** Dev Notes include a per-artifact note on which candidate(s) appear plausible
   based on what was directly observed (DOM inspection, computed styles, Performance panel
   layout-shift indicator, etc.). This is a hypothesis log for Story 101.2 — not a fix.

6. **Given** the reproduction is complete,
   **When** the developer commits a new failing-or-skipped Playwright spec
   (`apps/dms-material-e2e/src/scrolling-regression-101.spec.ts`) that encodes one
   reproduction per confirmed failing `screen × artifact` cell,
   **Then** each new test currently fails (or is annotated `test.fail()` / `test.describe.skip()`
   with a TODO pointing at Story 101.2) — the new spec must reproduce at least one failure
   that the existing scroll suites do not catch (otherwise the gap in the existing suite is
   itself the bug Story 101.3 must fix).

7. **Given** the investigation is complete,
   **When** `pnpm all` runs,
   **Then** all previously passing tests still pass and the new spec behaves as committed
   (failing-as-expected, `test.fail()`, or skipped). **No production code is modified in
   this story.**

## Tasks / Subtasks

- [ ] Task 1: Start the live app and confirm every virtual-scrolled screen is reachable (AC: #1)
  - [ ] Run `pnpm start:server` (Fastify API)
  - [ ] Run `pnpm start:dms-material` (Angular dev server, port 4301)
  - [ ] Use the Playwright MCP server to navigate to `http://localhost:4301`
  - [ ] Log in with a valid dev-database account
  - [ ] Confirm reachability of: Universe, Open Positions, Sold Positions, Dividend
        Deposits, and any other screen that hosts `<dms-base-table>` /
        `cdk-virtual-scroll-viewport` (use `grep -rn "cdk-virtual-scroll-viewport" apps/dms-material/src` to enumerate)

- [ ] Task 2: Slow-scroll reproduction on every screen, both browsers (AC: #1, #2)
  - [ ] Seed enough rows on each screen for virtual scroll to activate
        (use the `seed-scroll-*.helper.ts` helpers under `apps/dms-material-e2e/src/helpers/`
        — do NOT invent new seed data)
  - [ ] For each screen × browser, drive the viewport with **slow** programmatic scrolling
        (small `scrollTop` increments via `evaluate`, with frame-by-frame waits) — slow scroll
        is what triggers the artifacts in Round 7, NOT fast scroll (which Round 6 / Epic 87
        already covered)
  - [ ] After each scroll step, capture: viewport screenshot, accessibility snapshot,
        bounding box of the sticky `<thead>` / header row, bounding box of the parent header,
        and the first visible row's `getBoundingClientRect()` (top, bottom)
  - [ ] Repeat at multiple viewport sizes (at minimum: 1280×800 desktop, 1024×768 small
        desktop, 1920×1080 large desktop)
  - [ ] Document per-screen findings under "Failure Mode — <screen>" subsections in Dev Notes
        (include speed, viewport, browser, screenshots, and which of the three artifacts
        — header-under-header, flicker, header-scrolls-with-content — reproduced)

- [ ] Task 3: Build the reproduction matrix (AC: #2)
  - [ ] Compile a single `screen × browser × artifact` table in Dev Notes
  - [ ] Mark every cell PASS / FAIL / N-A with a one-line note
  - [ ] A cell with no artifact is still recorded (negative findings matter)

- [ ] Task 4: Prior-epic review (AC: #3)
  - [ ] Read each of these story files (or their per-epic notes):
        Epic 29 (29-1, 29-2), Epic 31 (31-1, 31-2), Epic 44 (44-1..44-3),
        Epic 60 (look up), Epic 64 (look up), Epic 87 (87-1..87-3)
  - [ ] Cross-reference with the file-header comment block in
        `apps/dms-material-e2e/src/universe-scrolling-regression.spec.ts`
        (which carries the running root-cause history)
  - [ ] Summarise per-epic: stated root cause, what was changed, and (where known) why
        symptoms returned in the next round
  - [ ] Record under "Prior Root-Cause History" in Dev Notes

- [ ] Task 5: Run existing scroll suites and gap-analyse (AC: #4)
  - [ ] Run the existing scroll specs in **both** browsers:
        ```
        pnpm e2e:dms-material:chromium -- --grep "scroll"
        pnpm e2e:dms-material:firefox  -- --grep "scroll"
        ```
        (or run them by file name if `--grep` does not match — the goal is per-suite results,
        not a wholesale e2e run)
  - [ ] Record pass/fail per spec
  - [ ] For each artifact that the live app shows but the existing suite does NOT catch,
        document under "Existing Test Gap Analysis": what the existing test asserts, what
        scroll pattern / data volume / browser it uses, and exactly what is missing
        (e.g. "asserts cell text non-empty but never reads `getBoundingClientRect().top` of
        the header row")

- [ ] Task 6: Hypothesis log for Story 101.2 (AC: #5)
  - [ ] For each `FAIL` cell in the matrix, look at the live DOM:
    - [ ] DevTools → "Find ancestors with `transform`, `will-change`, `contain`" — does any
          such ancestor exist between `<html>` and the sticky header? (kills sticky positioning)
    - [ ] Computed style of the sticky header — is `position` actually `sticky`, and is
          `top` an integer pixel? (subpixel rounding)
    - [ ] Element order inside `cdk-virtual-scroll-viewport` — is the sticky header inside
          the virtualised content (it must NOT be) or outside (correct)?
    - [ ] OnPush flush — does the artifact correlate with a frame where a signal updated
          but `markForCheck()` did not run? (use Performance recording)
    - [ ] `trackBy` identity — do row keys change during the scroll (e.g. `id` swapped for
          `id+symbol` after the symbol-on-server refactor)? Check `trackBy` functions on
          the screen's `<mat-table>` / `<cdk-virtual-for>`.
  - [ ] Record per-artifact "plausible candidates" notes — these are starting points for
        Story 101.2, not commitments

- [ ] Task 7: Commit a failing reproduction spec (AC: #6)
  - [ ] Create `apps/dms-material-e2e/src/scrolling-regression-101.spec.ts`
  - [ ] One test per confirmed failing `screen × artifact` cell
  - [ ] Each test must:
    1. Seed the data volume that triggered the live-app failure (NOT the helper's minimum)
    2. Navigate to the screen
    3. Perform the slow-scroll sequence that reproduced the artifact
    4. Assert the invariant the artifact violates — at minimum:
       - header-under-header: `header.getBoundingClientRect().top >= parentHeader.bottom`
       - flicker: no two consecutive frames where the same row's `top` differs by > rowHeight
       - header-with-content: `header.getBoundingClientRect().top` stays at `0`
         (or equal to the viewport's `cdk-virtual-scroll-viewport` top) for the entire scroll
  - [ ] The new test must fail today on `main` for at least one cell — confirming the
        regression is captured
  - [ ] If running failing tests in CI is undesirable, annotate with `test.fail()`
        (Playwright recognises this as "expected to fail") or wrap in `test.describe.skip()`
        with a TODO pointing at Story 101.2 — but **commit the test**
  - [ ] Do NOT add seed helpers or production code

- [ ] Task 8: Full validation (AC: #7)
  - [ ] `pnpm all` passes
  - [ ] No production code touched (`git diff --stat` should show only the new spec and this
        story file)

## Dev Notes

### What This Story Is (And Isn't)

**Is:** an exhaustive, evidence-backed reproduction matrix for Round 7. Six prior epics
(29, 31, 44, 60, 64, 87) reduced symptoms but never killed them, mostly by treating the most
recently-observed symptom rather than the underlying mechanism. This story exists to give
Story 101.2 a complete picture of which screens fail, which browsers fail, which artifacts
appear, and which root-cause candidates are plausible — **before** any code is changed.

**Isn't:** a fix. No production code in this story. No symptom band-aids.

### Application URLs

| Screen            | URL                                                   |
| ----------------- | ----------------------------------------------------- |
| Universe          | `http://localhost:4301/universe` (or via sidebar nav) |
| Open Positions    | `http://localhost:4301/accounts/{id}/open-positions`  |
| Sold Positions    | `http://localhost:4301/accounts/{id}/sold-positions`  |
| Dividend Deposits | `http://localhost:4301/accounts/{id}/div-deposits`    |

Run `grep -rn "cdk-virtual-scroll-viewport\|<dms-base-table" apps/dms-material/src` to confirm
no other screens were added since Epic 87 — Round 7 must cover every host.

### Start Commands

```bash
pnpm start:server           # Fastify API
pnpm start:dms-material     # Angular dev server, port 4301
```

### Round 7 Artifacts (What We're Hunting)

Per the epic, three distinct visual failures all need to be reproduced:

1. **Header-under-header** — the sticky `<thead>` slides *behind* the parent app/page header
   instead of pinning to the top of its scroll container.
2. **Flicker** — content rows visually jitter / repaint mid-scroll (a frame where row
   positions move by more than the natural scroll delta and then snap back).
3. **Header-scrolls-with-content** — the sticky header drifts down with the content rows
   instead of staying anchored, sometimes ending up scrolled below the visible content.

These are **not** the Round 6 (Epic 87) blank-cell failure mode. They are visual / layout
failures, so the assertions must use bounding boxes / screenshots, not text content.

### Prior Root-Cause History (Starting Points)

From `apps/dms-material-e2e/src/universe-scrolling-regression.spec.ts` top-of-file comments
and the corresponding story files:

| Epic    | Stated Root Cause                                                                                       |
| ------- | ------------------------------------------------------------------------------------------------------- |
| Epic 29 | `rowHeight` mismatch between CSS and CDK viewport config — scroll height calculation wrong              |
| Epic 31 | `contain: strict` on the header caused jump when the viewport recalculated                              |
| Epic 44 | CSS transition animations + change detection cycles caused CDK to recalculate mid-scroll                |
| Epic 60 | `isLoading === true` rows filtered to `null` → array shrank → CDK viewport shrank → scroll jumped back  |
| Epic 64 | Follow-up to 60; same root cause, edge-case extensions                                                  |
| Epic 87 | Account-panel placeholder rows had `symbol: ''` → blank cells appeared during fast scroll               |

The Round 7 epic explicitly states the CDK virtual-scroll **row height has been verified**, so
the Epic 29 mechanism is no longer in play. The architecture / context section of the epic
calls out the candidates Task 6 must rule in or out.

### Key Files for Investigation (Read-Only in This Story)

| File                                                                                       | Purpose                                                           |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| `apps/dms-material/src/app/shared/components/base-table/base-table.component.ts`           | Shared virtual scroll component — sticky header + viewport host   |
| `apps/dms-material/src/app/shared/components/base-table/base-table.component.scss`         | Sticky header CSS, `position: sticky`, `transform`, `will-change` |
| `apps/dms-material/src/app/global/global-universe/global-universe.component.ts`            | Universe data pipeline (post symbol-on-server refactor)           |
| `apps/dms-material/src/app/account-panel/open-positions/open-positions.component.ts`       | Open Positions data pipeline                                      |
| `apps/dms-material/src/app/account-panel/sold-positions/sold-positions.component.ts`       | Sold Positions data pipeline                                      |
| `apps/dms-material/src/app/account-panel/dividend-deposits/dividend-deposits.component.ts` | Dividend Deposits data pipeline                                   |
| `apps/dms-material-e2e/src/universe-scrolling-regression.spec.ts`                          | Prior-epic root-cause history (file header comments)              |
| `apps/dms-material-e2e/src/scrolling-regression-87.spec.ts`                                | Round 6 reproduction spec — pattern reference                     |

### Existing Scroll Test Files (Run These in Task 5)

- `apps/dms-material-e2e/src/universe-smooth-scroll.spec.ts`
- `apps/dms-material-e2e/src/universe-scrolling-regression.spec.ts`
- `apps/dms-material-e2e/src/open-positions-smooth-scroll.spec.ts`
- `apps/dms-material-e2e/src/div-deposits-smooth-scroll.spec.ts`
- `apps/dms-material-e2e/src/scrolling-regression-87.spec.ts`

### Seed Helpers (Reuse — Do Not Invent)

| Helper                                                 | Screen            |
| ------------------------------------------------------ | ----------------- |
| `seed-scroll-universe-data.helper.ts`                  | Universe          |
| `seed-scroll-open-positions-data.helper.ts`            | Open Positions   |
| `seed-scroll-sold-positions-data.helper.ts`            | Sold Positions    |
| `seed-scroll-div-deposits-with-symbols-data.helper.ts` | Dividend Deposits |

If a screen has no existing seed helper (e.g. a newly added virtual-scrolled screen),
record the gap in Dev Notes and call it out for Story 101.2 — do not author a new helper here.

### CDK Virtual Scroll Programmatic Control

```typescript
// Slow programmatic scroll — increment then yield to layout
async function slowScroll(page, selector, totalPx, stepPx = 4, frameDelayMs = 16) {
  const handle = page.locator(selector);
  for (let y = 0; y <= totalPx; y += stepPx) {
    await handle.evaluate(function setScrollTop(el, top) {
      (el as HTMLElement).scrollTop = top;
    }, y);
    await page.waitForTimeout(frameDelayMs);
  }
}
```

Selector for every host: `cdk-virtual-scroll-viewport`.

### Bounding-Box Assertions (Pattern for Task 7)

```typescript
const header = page.locator('cdk-virtual-scroll-viewport thead, cdk-virtual-scroll-viewport [role="rowgroup"]:first-child').first();
const viewport = page.locator('cdk-virtual-scroll-viewport').first();
const [hb, vb] = await Promise.all([header.boundingBox(), viewport.boundingBox()]);
// header-with-content: header top must equal viewport top
expect(Math.abs((hb?.y ?? 0) - (vb?.y ?? 0))).toBeLessThanOrEqual(1);
```

(Adjust the selector to whatever the `BaseTableComponent` actually renders — confirm during
Task 1 by inspecting the live DOM. The exact selector goes into Dev Notes.)

### Browsers

Both Chromium and Firefox must be exercised — the epic explicitly calls out NFR coverage
across both (R7). Safari/WebKit is **not** in the project's supported matrix and is out of
scope.

### Project Conventions Reminder

(From `_bmad-output/project-context.md` — these apply even though this story has no
production code changes.)

- Angular 21 zoneless, `inject()` only, `OnPush` everywhere, signal-first state
- SmartNgRX / SmartSignals for state
- Vitest for unit, Playwright (Chromium + Firefox) for E2E
- `pnpm all` must pass after every story
- Tests are authoritative — do not weaken assertions to make a test pass
- Playwright **MCP server** must be used for the live-app reproduction (per NFR3)

### Out of Scope

- Any production code change (that's Story 101.2)
- Any architecture-doc update (that's Story 101.4)
- The persistent regression suite (that's Story 101.3 — this story commits a single
  reproduction spec, not a hardened suite)

### References

- [_bmad-output/planning-artifacts/epics-2026-05-08.md](_bmad-output/planning-artifacts/epics-2026-05-08.md) — Epic 101 source
- [_bmad-output/implementation-artifacts/87-1-reproduce-scrolling-failures-all-screens.md](_bmad-output/implementation-artifacts/87-1-reproduce-scrolling-failures-all-screens.md) — Round 6 reproduction story (pattern reference)
- [apps/dms-material-e2e/src/universe-scrolling-regression.spec.ts](apps/dms-material-e2e/src/universe-scrolling-regression.spec.ts) — Prior root-cause history in file header
- [apps/dms-material-e2e/src/scrolling-regression-87.spec.ts](apps/dms-material-e2e/src/scrolling-regression-87.spec.ts) — Round 6 spec (style/structure reference)
- [apps/dms-material/src/app/shared/components/base-table/base-table.component.ts](apps/dms-material/src/app/shared/components/base-table/base-table.component.ts) — Shared virtual-scroll host
- [_bmad-output/project-context.md](_bmad-output/project-context.md) — Project-wide rules
- This story is a prerequisite for Story 101.2 (root-cause + fix), Story 101.3 (regression
  suite), and Story 101.4 (architecture doc update)

## Dev Agent Record

### Agent Model Used

(To be filled by dev agent)

### Debug Log References

### Completion Notes List
