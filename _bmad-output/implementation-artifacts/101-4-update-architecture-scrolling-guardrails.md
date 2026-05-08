# Story 101.4: Update Architecture Doc with Scrolling Root Cause and Guardrails

Status: Approved

## Story

As a developer,
I want the architecture document updated with the actual root cause of the scrolling
artifacts and the guardrails that prevent re-introducing it (e.g. "do not add
`transform` to ancestors of the virtual-scroll viewport", or whatever the real cause
turns out to be),
So that future contributors know which patterns to avoid and the project's
institutional memory survives the next refactor — and Round 8 of this epic never
starts because someone reverted the fix while not knowing it was load-bearing.

## Acceptance Criteria

1. **Given** the Story 101.2 root-cause analysis and Story 101.1 reproduction matrix,
   **When** the developer updates `_bmad-output/planning-artifacts/architecture.md`,
   **Then** a new top-level subsection titled
   **"Virtual Scroll & Sticky Header Guardrails"** is added that records:
   - The real root cause (verbatim from Story 101.2 Dev Notes), with a one-line plain-
     English summary at the top.
   - The specific Angular / CDK / CSS patterns to avoid (e.g. `transform` /
     `will-change` / `contain` on ancestors of `cdk-virtual-scroll-viewport`,
     subpixel-rounding hazards on the header row, `OnPush` flush-timing pitfalls,
     row-identity churn from server-side symbol joins — whichever the Story 101.2
     analysis actually identified as in play).
   - The regression suite that defends against re-introduction (Story 101.3) and the
     test file path(s) where the assertions live.
   - A back-pointer to **Epic 101** and to the prior epics (29, 31, 44, 60, 64, 87)
     that attempted symptom-level fixes, so future contributors can see the full
     history without re-discovering it.

2. **Given** the new subsection,
   **When** the developer reviews `_bmad-output/project-context.md` for any existing
   guidance about virtual scroll, sticky headers, CDK viewports, or scroll containers,
   **Then** any contradicting guidance is removed or updated, and a one-line pointer
   to the new architecture subsection is added under the appropriate existing section
   (e.g. under the Tailwind / Material coexistence rules, since `transform` / Tailwind
   utility classes are a likely culprit category).

3. **Given** the new subsection,
   **When** the developer scans the architecture document for other places that
   reference scrolling, virtual scroll, table headers, or CDK,
   **Then** any of those references either link to the new subsection or are updated
   to be consistent with it (no contradictions left in the document).

4. **Given** the documentation changes,
   **When** `pnpm all` runs,
   **Then** all tests pass (this is a docs-only story — no production code or test
   code is modified).

5. **Given** the documentation changes are committed,
   **When** the changes are reviewed,
   **Then** the diff is **docs-only** — no `.ts`, `.html`, `.scss`, `.spec.ts`, or
   E2E test files are touched.

## Tasks / Subtasks

- [ ] Task 1: Pre-read the current architecture and project-context docs (AC: 1, 2, 3)
  - [ ] Read `_bmad-output/planning-artifacts/architecture.md` end-to-end and note
        every existing section that references scrolling, virtual scroll, table
        headers, sticky positioning, or CDK
  - [ ] Read `_bmad-output/project-context.md` end-to-end and note every existing
        rule that touches `transform`, `will-change`, `contain`, sticky positioning,
        Tailwind utility classes on header rows, or virtual scroll
  - [ ] Document those locations in this story's Dev Notes (file + line range +
        one-line summary) before editing anything

- [ ] Task 2: Pull the verified root cause and guardrails from Story 101.2 (AC: 1)
  - [ ] Open the Story 101.2 file
        (`_bmad-output/implementation-artifacts/101-2-root-cause-and-fix-scrolling.md`)
        and copy out the root-cause statement and the rationale verbatim
  - [ ] Open the Story 101.1 file
        (`_bmad-output/implementation-artifacts/101-1-reproduce-scrolling-all-screens.md`)
        and copy out the reproduction-matrix summary so the architecture doc can
        reference it
  - [ ] Open the Story 101.3 file
        (`_bmad-output/implementation-artifacts/101-3-scrolling-regression-suite.md`)
        and capture the final test file path(s) and the assertions they make
  - [ ] If Stories 101.1 / 101.2 / 101.3 are not yet `done`, **HALT** this story —
        this story is a write-up of their conclusions and cannot be completed
        before they are

- [ ] Task 3: Add the new architecture subsection (AC: 1)
  - [ ] In `_bmad-output/planning-artifacts/architecture.md`, add a new top-level
        subsection titled **"Virtual Scroll & Sticky Header Guardrails"**, placed in
        a logical location (suggested: near the existing structure / patterns
        section that already discusses Angular / CDK conventions — confirm exact
        placement after Task 1's review)
  - [ ] Use the structure: one-line summary → root cause → patterns to avoid →
        regression suite reference → back-pointer to Epic 101 and prior epics
  - [ ] Cite the source story files using the project's existing citation format
        (`[Source: _bmad-output/implementation-artifacts/101-2-…#…]`)

- [ ] Task 4: Reconcile project-context.md (AC: 2)
  - [ ] If Task 1 found contradicting guidance in `project-context.md`, update or
        remove it
  - [ ] Add a one-line pointer to the new architecture subsection under the most
        relevant existing section (likely the Tailwind / Material rules, since
        `transform`-bearing utility classes are a candidate culprit category)

- [ ] Task 5: Cross-reference sweep (AC: 3)
  - [ ] Re-scan `architecture.md` for any other mention of scrolling / virtual
        scroll / sticky / table header and either link to or align with the new
        subsection
  - [ ] No contradictions left in the document

- [ ] Task 6: Quality gates (AC: 4, 5)
  - [ ] `git diff --stat` shows only `.md` files touched (no `.ts`, `.html`,
        `.scss`, `.spec.ts`, or test files)
  - [ ] `pnpm all` passes
  - [ ] `pnpm format` passes (markdown formatting)

## Dev Notes

### What This Story Is (and Is Not)

This is a **docs-only** story. Its entire purpose is to capture the root cause and
guardrails identified by Story 101.2 in a place where future contributors will see
them — so the next refactor doesn't silently revert the fix.

It is **not** the place to:

- Re-investigate the root cause (that was Story 101.2)
- Add new tests (that was Story 101.3)
- Modify any production code

If, while writing the docs, you find that Story 101.2's root cause is unclear,
incomplete, or contradicts the regression suite from Story 101.3, **stop and raise
that as a Story 101.2 / 101.3 follow-up** rather than papering over the gap in the
architecture doc.

### Hard Dependency on Prior Stories

This story **cannot start** until Stories 101.1, 101.2, and 101.3 are all `done`.
Their outputs are this story's inputs:

- **101.1** → reproduction matrix (which screens / browsers / artifacts)
- **101.2** → root cause + applied fix + rationale
- **101.3** → regression test file paths + the specific invariants they assert

Confirm all three are `done` in `sprint-status.yaml` before starting Task 2.

### Architecture Doc Location

The architecture doc lives at
`_bmad-output/planning-artifacts/architecture.md` and is currently a single file (not
sharded). The new subsection should be added inline — do not shard the doc as part
of this story.

A pre-existing structural pattern in the doc uses `### N. Pattern Name` headings
(e.g. `### 2. Structure Patterns` around line 318). Match that style for the new
subsection's heading level and numbering. Confirm exact placement after Task 1's
read-through.

### Project-Context.md Reconciliation

`_bmad-output/project-context.md` already has rules around Tailwind, Material
coexistence, SCSS component styles, and SmartNgRX patterns. None of the existing
rules (as of this story's creation) explicitly forbid `transform` on ancestors of a
virtual-scroll viewport — so the reconciliation work in Task 4 is most likely an
**addition** (a one-line pointer) rather than a deletion. Verify in Task 1.

### Citation Format

Use the project's existing citation style for source pointers:

```
[Source: _bmad-output/implementation-artifacts/101-2-root-cause-and-fix-scrolling.md#Dev-Notes]
```

…rather than inventing a new format.

### Out of Scope

- Re-running the reproduction matrix
- Adding new regression tests
- Modifying any `.ts`, `.html`, `.scss`, or test file
- Sharding the architecture doc
- Changes to any other epic's documentation
- Updating `_bmad-output/planning-artifacts/epics-2026-05-08.md` itself (the epic
  spec is the requirement, not the artifact being updated)

### What Must Be Preserved

- Every existing section of `architecture.md` and `project-context.md` that is **not**
  in conflict with the new guardrails must remain byte-identical
- The doc's existing heading hierarchy and numbering style
- All existing internal links and source citations

### Test Strategy

- No new tests. This story explicitly produces zero code changes.
- `pnpm all` is run as a smoke check that the docs change has not accidentally
  broken anything (e.g. a markdown table eaten by a stray pipe character that some
  doc-lint check might catch).

### References

- [Source: _bmad-output/planning-artifacts/epics-2026-05-08.md#Story-101.4]
- [Source: _bmad-output/planning-artifacts/epics-2026-05-08.md#Epic-101]
- [Source: _bmad-output/planning-artifacts/architecture.md] (current state — to be
  updated)
- [Source: _bmad-output/project-context.md] (to be reconciled)
- [Source: _bmad-output/implementation-artifacts/101-1-reproduce-scrolling-all-screens.md]
  (input — must be `done`)
- [Source: _bmad-output/implementation-artifacts/101-2-root-cause-and-fix-scrolling.md]
  (input — must be `done`)
- [Source: _bmad-output/implementation-artifacts/101-3-scrolling-regression-suite.md]
  (input — must be `done`)

### Project Structure Notes

- All edits are within `_bmad-output/`. No `apps/`, `libs/`, or test directories are
  touched.
- The story slug `101-4-update-architecture-scrolling-guardrails` matches the
  Epic 101 spec.

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
