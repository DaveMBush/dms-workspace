# Story 5.2 Review — Remove column header clipping; allow wrap + top alignment

**Artifact reviewed:** `5.2-remove-column-header-clipping-wrap-top-align.md` (Status: ready-for-dev)
**Reviewer:** bmad-qa (independent, read-only)
**Verdict:** **REVISE BEFORE DEV** — one blocking defect in AC #2 / Task 2.2; the rest is sound and correctly scoped.

## Verdict summary

The story's scope, single-file target, line references, body-cell preservation rule, and red-phase TDD convention are all correct and verified against the codebase. However **AC #2 (and its implementation instruction in Task 2.2) cannot actually fix the visual bug it claims to fix.** The specified `vertical-align: top` is a no-op on Material 22's MDC mat-table header cells because they render as flex items, not table-cells. Story 5.1's red-phase test for AC #2 will go green in jsdom while the real browser still vertically-centers wrapped headers — a false-green that defeats the purpose of the TDD contract.

## Findings

### [BLOCKING] F-1: `vertical-align: top` is inert on MDC mat-table header cells (AC #2, Task 2.2)

**Evidence (verified in `node_modules/@angular/material/fesm2022/table.mjs`, Material 22.2.2):**
```css
mat-header-row { display: flex; }
mat-cell, mat-header-cell, mat-footer-cell { flex: 1; display: flex; align-items: center; }
```
- The header **row** is a `display:flex` container.
- Each header **cell** (`<mat-header-cell>`) is itself a flex item with `align-self: stretch`, and its inner content is centered via `align-items: center`.

`vertical-align` only applies to elements whose computed `display` is `table-cell`/`inline-table-cell`. A flex item ignores it entirely. So after Task 2.2 adds `vertical-align: top`:
- **jsdom** (no layout engine) echoes the declared value → Story 5.1's AC #2 assertion (`expect(style.verticalAlign).toBe('top')`) passes.
- **Real browser** still centers the wrapped text vertically because the cell is a flex item with `align-items: center`.

This means AC #2 can be satisfied on paper (and in CI) while the user-visible bug — multi-line headers sitting mid-cell instead of at the top — remains unfixed. The story would close green without delivering its stated outcome ("start at the top of the header cell").

**Why this is blocking:** the whole point of Story 5.1's red-phase tests is to lock in a contract that actually fixes the bug. A test that passes while the bug persists is worse than no test — it gives false confidence and will not catch a regression.

**Required fix (spec change, before dev):**
1. **AC #2** must require top alignment via the property that actually works on flex items: `align-self: flex-start` on `.dms-header-cell` (overrides the inherited `align-items: center`). Optionally also set `display: block` / remove the inner flex centering, but `align-self: flex-start` alone is sufficient and minimal.
2. **Task 2.2** should instruct adding `align-self: flex-start;` (not — or in addition to — `vertical-align: top`). If `vertical-align: top` is kept for documentation/legacy it must be explicitly marked non-load-bearing, but the load-bearing declaration is `align-self`.
3. **Story 5.1's AC #2 / AC #3 assertions** (in `base-table.component.spec.ts`, lines ~347–365) currently assert only `style.verticalAlign === 'top'`. They must be amended to also assert the load-bearing property, e.g. `expect(style.alignSelf).toBe('flex-start')` (jsdom does echo `align-self`). Otherwise the green phase still proves nothing about real-browser behavior.

> Note: this is a spec + test-contract change, not just an implementation detail. The dev agent following Task 2.2 literally as written will produce code that passes CI but does not fix the bug. The QA gate must catch it here, at story level, before dev starts.

### [MINOR] F-2: AC #1 is correct and sufficient for the clipping removal — no change needed

Verified `.dms-header-cell` (lines 49–67) currently sets `overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`. Removing all three lets text wrap. The header row sits **outside** the `cdk-virtual-scroll-viewport` (it is a sibling above it in document flow), so allowing multi-line headers does not affect body-row height or CDK `itemSize`. AC #1 and Task 2.1 are correct as written.

### [MINOR] F-3: Body-cell preservation rule is correctly stated — no change needed

Verified `.dms-body-cell` (lines ~112–117) sets the truncation trio and is a separate block from `.dms-header-cell`. The spec's "do NOT touch" instruction and AC #3 are accurate. No regression risk to the 57px row-height invariant or virtual-scroll `itemSize`.

### [MINOR] F-4: Line references in the spec are accurate — no change needed

Verified against current file:
- `.dms-header-cell` block = lines 49–67 ✓ (spec cites 49–67)
- `.dms-body-cell` truncation = lines ~112–117 ✓ (spec cites 112–117)
- `--mat-table-row-item-container-height: 57px` = line 10 ✓
- Header markup `<mat-header-cell *matHeaderCellDef class="dms-header-cell">` present in template ✓

### [MINOR] F-5: Single-file scope is correct — no change needed

Only `base-table.component.scss` changes. No new files, no template/TS edits. The "fix one shared block to fix all tables" rationale holds because every table renders through `dms-base-table`. Cross-screen/browser verification correctly deferred to Story 5.3 (e2e).

## What is NOT a problem (explicitly cleared)

- **Red-phase TDD convention** (unskip → confirm red → implement): correct and matches the project's `.github/instructions/generate-epics-and-stories.md` ordering rule.
- **Table contract preservation** (`.dms-header-cell[data-column]`, `.dms-body-row[role=row]`, `.dms-body-cell[data-column]`): the change is style-only, does not weaken class/role/data-column assertions.
- **No per-table overrides**: correctly instructed; single source of truth preserved.

## Required actions before dev can start

1. Amend **AC #2** to require `align-self: flex-start` (the load-bearing property), with `vertical-align: top` demoted to optional/non-load-bearing or removed.
2. Amend **Task 2.2** to instruct adding `align-self: flex-start;`.
3. Amend **Story 5.1's AC #2 / AC #3 test assertions** to assert `style.alignSelf === 'flex-start'` (in addition to or instead of `verticalAlign`). This is the only way the green phase actually proves the fix works in a real browser layout model.

## Recommendation

**REVISE.** The story is 90% correct and well-scoped; the single blocking issue is that AC #2's specified mechanism (`vertical-align: top`) does not work on Material 22 flex-based header cells, so the TDD contract would go green while the bug persists. Fix the spec (AC #2 + Task 2.2) and the paired Story 5.1 test assertions to use `align-self: flex-start`, then re-review. Estimated effort for the revision: ~10 minutes of editing across two files (this story's AC/Task text + Story 5.1's spec assertions).
