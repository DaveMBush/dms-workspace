# Story 101.2: Root-Cause Scrolling Artifacts and Apply Fix

Status: Approved

## Story

As Dave,
I want the scrolling artifacts on every screen to be eliminated by a fix that targets the
actual root cause rather than another symptom-level patch,
so that I can scroll through any table at any speed without headers misbehaving — and we
never have to open Round 8 of this epic.

## Acceptance Criteria

1. **Given** the reproduction matrix produced by Story 101.1
   (`_bmad-output/implementation-artifacts/101-1-reproduce-scrolling-all-screens.md`),
   **When** the developer investigates the candidate root causes listed in
   Epic 101 / Architecture / Context — sticky containing-block loss from
   `transform` / `will-change` / `contain` ancestors; subpixel rounding on header
   utilities; CDK `cdk-virtual-scroll-viewport` wrapping the wrong element relative to
   the sticky header; OnPush layout flush timing during the scroll frame; row-identity
   churn from the symbol-on-server refactor (Epics 95–97) triggering unnecessary
   `trackBy` re-renders mid-scroll —
   **Then** Dev Notes identify which candidate(s) are actually present and in scope,
   with the evidence that confirmed each (DOM inspection, Performance/Layers panel
   capture, signal/effect trace, or `trackBy` identity log).

2. **Given** the actual root cause is identified,
   **When** the fix is implemented,
   **Then** the change targets the root cause directly (with the rationale documented in
   Dev Notes) and is **not** a `position: sticky` / `will-change: transform` band-aid
   masking another problem, **not** another `rowHeight` adjustment, and **not** another
   `isLoading` placeholder tweak (those have all been done — Epics 29, 31, 44, 60, 64, 87).

3. **Given** the fix is applied,
   **When** the Playwright MCP server is used against the **live application**
   (port 4301, real production-scale data, logged in as Dave) to re-run the reproduction
   matrix from Story 101.1 across **every screen** and **both browsers** (Chromium and
   Firefox),
   **Then** every previously-failing cell in the matrix now passes — no
   header-under-header drift, no flicker, no header-with-content drift — at all tested
   scroll speeds and viewport sizes.

4. **Given** the live-data Playwright MCP verification from AC #3 passes,
   **When** the developer repeats the worst-failing scroll sequence **3 additional times**
   per affected screen to confirm consistency (not a fluke),
   **Then** none of the artifacts reappear on any of the 3 additional attempts.

5. **Given** the existing scrolling-related E2E tests from prior epics
   (Epics 29, 31, 44, 60, 64, 87 — see `apps/dms-material-e2e/src/`),
   **When** they are re-run,
   **Then** they continue to pass — the fix does not regress earlier behaviour (NFR2).

6. **Given** Angular zoneless / OnPush / signal-first conventions (NFR4) and the
   "tests are authoritative" rule (NFR5),
   **When** the fix is implemented,
   **Then** no test assertion is weakened to make tests pass, no `inject()` is replaced
   with constructor injection, and OnPush change detection is preserved on every component
   touched.

7. **Given** the fix is implemented,
   **When** a code reviewer inspects the change,
   **Then** the implementation includes a comment block above the actual fix referencing
   all seven prior attempts (Epics 29, 31, 44, 60, 64, 87, **101**) and explaining the
   structural constraint that made this area recurrence-prone, in the same style used by
   `apps/dms-material/src/app/shared/components/base-table/base-table.component.ts`
   (see Story 87.2 for the established comment pattern).

8. **Given** `pnpm all` runs after the fix,
   **Then** all tests pass (NFR1).

## Tasks / Subtasks

- [ ] Task 1: Read Story 101.1 Dev Notes before writing any code (AC: #1, #2)
  - [ ] Open `_bmad-output/implementation-artifacts/101-1-reproduce-scrolling-all-screens.md`
  - [ ] Read the per-screen × browser × artifact reproduction matrix in full
  - [ ] Read the prior-epic review summary (Epics 29, 31, 44, 60, 64, 87) and note which
        symptoms each prior fix addressed and which it did not
  - [ ] **HALT** if Story 101.1 is not Done — this story cannot start without its
        reproduction matrix and prior-epic review
  - [ ] Do NOT guess root cause — use Story 101.1's documented failure modes as the
        specification

- [ ] Task 2: Investigate each candidate root cause from Architecture / Context (AC: #1)
  - [ ] **Candidate A — Sticky containing-block loss:** Use Chrome DevTools / Firefox
        DevTools to walk the ancestor chain of every sticky table header element (in
        `apps/dms-material/src/app/shared/components/base-table/base-table.component.html`
        and any per-screen overrides). Flag any ancestor with `transform`, `will-change`,
        `contain`, `filter`, `perspective`, or `backdrop-filter` set — those break the
        sticky containing block. Record findings in Dev Notes.
  - [ ] **Candidate B — Subpixel rounding on header utilities:** Inspect the computed
        height of `.cdk-header-row` (or equivalent header cell wrapper) under each
        Tailwind utility class currently applied. Compare to the row height used by CDK
        virtual scroll. Any non-integer pixel height is a smoking gun.
  - [ ] **Candidate C — CDK viewport vs. sticky-header element ordering:** Verify the
        `<cdk-virtual-scroll-viewport>` does NOT wrap the sticky header — the sticky
        header must be a sibling of the viewport (or an ancestor), never a descendant of
        a scroll container that is itself the viewport.
  - [ ] **Candidate D — OnPush layout flush timing during scroll frame:** Trace the
        signal/effect graph that feeds the visible-rows computation (SmartNgRX selector
        → component signal → template). Use the Performance panel to capture a slow
        scroll and look for layout/paint events firing **between** scroll frames — that
        indicates a signal update is reaching the template after the scroll's RAF.
  - [ ] **Candidate E — Row-identity churn from symbol-on-server refactor (Epics 95–97):**
        Add a temporary `console.log` in the table's `trackBy` function (or equivalent)
        and confirm the same logical row keeps the same identity across scrolls. If the
        Trade DTO's identity changes because the joined `Universe` object is reconstructed
        each frame, that is the cause.
  - [ ] Document in Dev Notes which candidate(s) are confirmed present, with evidence
        (screenshots / console output / Performance panel snapshot)

- [ ] Task 3: Implement the targeted root-cause fix (AC: #2, #6, #7)
  - [ ] Apply the minimal code change that eliminates the confirmed root cause
  - [ ] If the cause is **A** (sticky containing-block): remove the offending
        `transform` / `will-change` / `contain` from the ancestor, OR move the sticky
        header out of that subtree
  - [ ] If the cause is **B** (subpixel rounding): pin header row height to an integer
        pixel value matching the CDK `itemSize` (single source of truth), and audit any
        Tailwind utility producing fractional heights
  - [ ] If the cause is **C** (viewport/header ordering): restructure the template so
        the sticky header sits alongside or above the `<cdk-virtual-scroll-viewport>`,
        not inside it
  - [ ] If the cause is **D** (OnPush flush timing): batch the signal updates that feed
        visible rows so the template renders once per scroll frame, not multiple times
  - [ ] If the cause is **E** (row-identity churn): ensure `trackBy` keys on a stable
        primary key (e.g. `trade.id`) — never on a derived/composite object — and ensure
        the upstream selector returns referentially stable rows when underlying data is
        unchanged
  - [ ] **Add the citation comment block** above the fix (AC: #7), in the established
        style:

        ```typescript
        /**
         * SCROLLING REGRESSION HISTORY — DO NOT SIMPLIFY THIS CODE:
         * Epic 29:  rowHeight mismatch → CDK total scroll height wrong
         * Epic 31:  contain:strict on sticky header → jump on viewport recalc
         * Epic 44:  CSS transitions + extra CD cycles → CDK recalc mid-scroll
         * Epic 60:  isLoading filter shrank array → CDK recalculated total height
         * Epic 64:  Edge case follow-up to Epic 60 (different code path)
         * Epic 87:  [root cause from Story 87.1 / 87.2 dev notes]
         * Epic 101: [root cause from Story 101.1 / 101.2 dev notes — fill in]
         *
         * Structural constraint: [restate the constraint that this fix preserves]
         */
        ```

  - [ ] Preserve `inject()` (no constructor injection), OnPush change detection, and
        signal-first state on every component touched (NFR4)

- [ ] Task 4: Verify the fix with Playwright MCP on live data (AC: #3, #4)
  - [ ] Confirm `pnpm start:server` and `pnpm start:dms-material` are running on
        port 4301 with real production-scale data; log in as Dave
  - [ ] Use Playwright MCP to drive the **exact failure sequences from the Story 101.1
        reproduction matrix** on every screen flagged in that matrix — both Chromium
        **and** Firefox, all viewport sizes that previously failed
  - [ ] After each run, capture a screenshot/snapshot and visually confirm: no
        header-under-header, no flicker, no header-with-content drift
  - [ ] Repeat the worst-failing sequence 3 additional times per affected screen
        (AC: #4); document each attempt's outcome in Dev Notes under
        "Live-Data Verification"
  - [ ] **If any artifact reappears on live data, the story is NOT done** — return to
        Tasks 2/3

- [ ] Task 5: Re-run prior-epic scrolling E2E tests (AC: #5)
  - [ ] Identify the existing scrolling-related E2E spec(s) added by Epics 29, 31, 44,
        60, 64, 87 under `apps/dms-material-e2e/src/` (search for "scroll" and "header")
  - [ ] Run them in both Chromium and Firefox
  - [ ] Confirm all pass — no regression

- [ ] Task 6: Full test run (AC: #8)
  - [ ] `pnpm all`
  - [ ] `pnpm format`
  - [ ] Confirm both pass with no formatting changes required

- [ ] Task 7: Hand-off note for Story 101.3 (regression suite)
  - [ ] In Dev Notes, summarise the exact failure mode the regression suite (Story 101.3)
        must encode as assertions, including which DOM invariants to check (e.g.
        "header bounding box `top` must equal scroll-container `top` at every frame")

## Dev Notes

### IMPORTANT: Read Story 101.1 First

This story MUST NOT begin without reading the Dev Notes from Story 101.1
(`_bmad-output/implementation-artifacts/101-1-reproduce-scrolling-all-screens.md`).
The reproduction matrix and prior-epic review are the specification for this fix.

Six prior epics have already done symptom-level fixes; **another speculative patch is
not acceptable**. The bar for this story is: name the root cause, point at the evidence,
ship the fix.

### This Is Round 7 — Read the Prior Story Notes

| Epic | Round | Symptom Targeted | Outcome |
|------|-------|------------------|---------|
| 29   | 1     | `rowHeight` mismatch — CDK total scroll height wrong | Reduced symptoms |
| 31   | 2     | `contain:strict` on sticky header → jump on viewport recalc | Reduced symptoms |
| 44   | 3     | CSS transitions + extra CD cycles → CDK recalc mid-scroll | Reduced symptoms |
| 60   | 4     | `isLoading` filter shrank array → CDK recalculated total height | Reduced symptoms |
| 64   | 5     | Edge case of Epic 60 (different code path) | Reduced symptoms |
| 87   | 6     | See Story 87.1 / 87.2 dev notes | Reduced symptoms — but not eliminated |
| **101** | **7** | **TBD — see Story 101.1 dev notes; identify in Task 2** | **Eliminate, then prove with Story 101.3 suite** |

The Epic 101 description explicitly notes the CDK virtual-scroll row height has been
verified and is correct — the cause lies elsewhere. Do not re-litigate row height.

### Live-Data Verification Is the Acceptance Gate (AC #3, #4)

E2E tests passing is **necessary but not sufficient**. Six prior epics had E2E tests
green while the bug remained observable on real data. This story is not done until
Task 4 (Playwright MCP on live app at port 4301, real data, both browsers) completes
without triggering any artifact, repeated 3× on the worst-failing sequence per screen.

#### Live-Data Verification — fill in during Task 4

| Screen | Browser | Attempt 1 | Attempt 2 | Attempt 3 | Attempt 4 | Result |
|--------|---------|-----------|-----------|-----------|-----------|--------|
| Universe | Chromium | | | | | |
| Universe | Firefox  | | | | | |
| Open Positions | Chromium | | | | | |
| Open Positions | Firefox  | | | | | |
| Sold Positions | Chromium | | | | | |
| Sold Positions | Firefox  | | | | | |
| Dividend Deposits | Chromium | | | | | |
| Dividend Deposits | Firefox  | | | | | |
| _(any other screen flagged by Story 101.1)_ | | | | | | |

### Candidate Root Causes (from Epic 101 — Architecture / Context)

These are the candidates Task 2 must enumerate. Do not stop at the first plausible
explanation — confirm each with evidence before choosing the fix.

- **A — Sticky containing-block loss:** an ancestor of `.cdk-header-row` (or equivalent)
  has `transform`, `will-change`, `contain`, `filter`, `perspective`, or
  `backdrop-filter` set. Any of these establish a new containing block that breaks
  `position: sticky`. Walk the ancestor chain in DevTools.
- **B — Subpixel rounding from Tailwind utilities on the header row:** Tailwind
  utilities can produce fractional pixel heights (e.g. line-height + padding combos)
  that disagree with the CDK `itemSize` constant by < 1 px. Compare computed heights.
- **C — CDK `cdk-virtual-scroll-viewport` wrapping the wrong element:** the sticky
  header must be a sibling of, or ancestor of, the viewport — never a descendant of
  the scroll container that *is* the viewport. Inspect the template structure.
- **D — OnPush not flushing layout signals during the scroll frame:** with zoneless
  CD, signals updated outside an effect or after the scroll's RAF can produce
  layout/paint events out of sync with the scroll frame. Use the Performance panel.
- **E — Row-identity churn from the symbol-on-server refactor (Epics 95–97):** the
  Trade DTO now carries a joined `Universe` object from the server. If the joined
  object's reference changes per response, `trackBy` returning anything that depends
  on it will see "new" rows every fetch and force re-render mid-scroll. Confirm the
  `trackBy` function and the upstream selector's referential stability.

### Files Likely Involved (verify against Story 101.1 dev notes)

| File | Role |
|------|------|
| `apps/dms-material/src/app/shared/components/base-table/base-table.component.ts` | Shared CDK virtual-scroll table — primary suspect for A/C/D |
| `apps/dms-material/src/app/shared/components/base-table/base-table.component.html` | Template structure — primary suspect for C |
| `apps/dms-material/src/app/shared/components/base-table/base-table.component.css` (and any companion `.scss`/Tailwind classes) | Header utilities — primary suspect for A/B |
| `apps/dms-material/src/app/global/global-universe/global-universe.component.ts` | Universe screen data pipeline — possible site of D/E |
| `apps/dms-material/src/app/account-panel/open-positions/open-positions.component.ts` | Open Positions data pipeline — possible site of D/E (recently touched by Epics 95/97) |
| `apps/dms-material/src/app/account-panel/sold-positions/sold-positions.component.ts` | Sold Positions data pipeline — possible site of D/E |
| `apps/dms-material/src/app/account-panel/dividend-deposits/dividend-deposits.component.ts` | Dividend Deposits data pipeline — possible site of D/E |

The exact files to modify are dictated by Task 2's evidence. Do not modify any file
without an evidence trail in Dev Notes pointing to it.

### Angular Zoneless / OnPush / Signal-First Constraints (NFR4)

The app uses `provideZonelessChangeDetection()`. This means:

- Change detection is triggered only by signal updates, `ChangeDetectorRef.markForCheck()`,
  or explicit `inject(ChangeDetectorRef)` calls.
- Any data update that doesn't go through signals will not trigger re-render.
- Use `inject()` — never constructor injection.
- Preserve OnPush on every component touched.

If candidate D is the cause, the fix likely involves consolidating multiple signal
updates into a single batched update (e.g. via `untracked` + a single `set`) so the
template renders once per scroll frame.

### Symbol-on-Server Refactor Context (Epics 95–97)

Epics 95, 96, 97 moved symbol/universe data to a server-joined `Universe` row delivered
inside each Trade DTO, deleting the client-side `buildUniverseMap`. If the server is
returning a fresh `universe` object per response (Prisma typically does), every
account-panel row's reference changes per fetch — even when the underlying data did not.
That is a strong candidate for E.

When investigating E, check:

- The `trackBy` function on each affected screen — must key on a stable primary key
  (e.g. `trade.id`), never on the joined object reference.
- The upstream SmartNgRX selector — does it project rows that are referentially stable
  when the data hasn't changed?

### Tests Are Authoritative (NFR5)

Do not weaken or skip any failing test to make `pnpm all` pass. If a previously passing
test starts failing because of this fix, the fix is wrong — not the test. Restore the
test's contract by adjusting the implementation.

### Out of Scope for THIS Story

- Building the regression test suite — that is **Story 101.3**.
- Updating `architecture.md` with the root cause and guardrails — that is **Story 101.4**.
- The reproduction matrix itself — that was **Story 101.1**.

### Required Comment in Fix (AC #7)

Every file modified in this story must include the full citation comment shown in
Task 3, listing all seven prior epics (29, 31, 44, 60, 64, 87, **101**) and the
structural constraint the fix preserves. This is non-negotiable — it is the institutional
memory that prevents Round 8.

### References

- Source epic spec: [_bmad-output/planning-artifacts/epics-2026-05-08.md](../planning-artifacts/epics-2026-05-08.md) — "Story 101.2"
- Predecessor in this epic: [_bmad-output/implementation-artifacts/101-1-reproduce-scrolling-all-screens.md](./101-1-reproduce-scrolling-all-screens.md) — reproduction matrix and prior-epic review
- Round 6 of this saga (closest prior story): [_bmad-output/implementation-artifacts/87-2-fix-scrolling-all-screens.md](./87-2-fix-scrolling-all-screens.md) — established the live-data verification gate and the citation comment pattern
- Project conventions: `_bmad-output/project-context.md`
- Architecture: `_bmad-output/planning-artifacts/architecture.md`
- Symbol-on-server refactor (recent context): Epics 95, 96, 97 — see their epic specs and story files

## Dev Agent Record

### Agent Model Used

_To be filled in by dev agent on implementation_

### Debug Log References

### Completion Notes List
