# Story 31.1: Reproduce and Root-Cause the Header Jumping Issue

Status: Approved

## Story

As a developer,
I want to use the Playwright MCP server to reproduce the janky header-jumping issue on the Universe and Account tables and document its root cause,
so that the fix in Story 31.2 targets the correct problem and has a confirmed reproduction baseline.

## Acceptance Criteria

1. **Given** the application is running locally with the Universe screen loaded with at least 50 rows, **When** the Playwright MCP server scrolls the virtual-scroll table incrementally (small pixel steps, not a single jump to the bottom), **Then** the header row is confirmed to move vertically along with the data rows — the Playwright session captures `getBoundingClientRect().top` values showing the header top position changes between scroll steps.
2. **Given** the reproduction is confirmed, **When** the root cause is analyzed, **Then** the analysis identifies the specific CSS property or DOM mechanism causing the header to follow the scroll (e.g. `sticky: top` failing to hold, `transform` on `.cdk-virtual-scroll-content-wrapper` offsetting the sticky ancestor, `contain: strict` on `.virtual-scroll-viewport` breaking the stacking context, etc.).
3. **Given** the reproduction and root cause, **When** the findings are documented, **Then** `_bmad-output/implementation-artifacts/virtual-scroll-header-fix.md` is created containing: the exact header `top` values captured during scroll, the root cause CSS/DOM explanation, the Angular Material / CDK version constraint that applies, and the proposed fix approach.
4. **Given** the Account screen, **When** the same Playwright scroll test is applied to the open-positions, sold-positions, or dividend-deposits table, **Then** the document notes whether the same behaviour is present (or absent) on that screen.
5. **Given** all investigation work, **When** `pnpm all` runs, **Then** it passes (no code changes are required in this story).

## Definition of Done

- [x] Playwright MCP session used to scroll Universe table and capture header position data
- [x] Root cause documented in `_bmad-output/implementation-artifacts/virtual-scroll-header-fix.md`
- [x] Account screen behaviour documented in the same file
- [x] `pnpm all` passes (no code changes)
- [x] Run `pnpm format`

## Tasks / Subtasks

- [ ] Start the application locally (AC: #1)
  - [ ] Confirm `pnpm start:server` and `pnpm start:dms-material` are running (they may already be)
  - [ ] Navigate to the Universe screen in a browser to confirm data loads
- [ ] Use Playwright MCP to reproduce the issue on the Universe screen (AC: #1)
  - [ ] Open the Universe screen via Playwright MCP
  - [ ] Capture the initial `getBoundingClientRect().top` of the first `th.mat-mdc-header-cell` (or the `<tr mat-header-row>`)
  - [ ] Scroll down by 50px increments 10 times, capturing header top after each step
  - [ ] Record whether the header `.top` value changed — if it did, the issue is reproduced
- [ ] Identify the root cause (AC: #2)
  - [ ] Inspect `.virtual-scroll-viewport` CSS: check `contain` value — `contain: strict` creates an isolated stacking/scroll context that can conflict with `position: sticky`
  - [ ] Inspect `.cdk-virtual-scroll-content-wrapper`: this div gets a `transform: translateY(Npx)` applied by CDK. If `<th>` uses `position: sticky; top: 0` relative to the viewport, a `transform` on a scroll-content ancestor can break sticky positioning because transforms create new stacking contexts
  - [ ] Check if `will-change: transform` on `.virtual-scroll-viewport` is creating a new stacking context
  - [ ] Check Angular CDK version: `grep "@angular/cdk" package.json` — note the exact version
  - [ ] Research whether this CDK version has a known virtual-scroll + sticky-header interaction bug
- [ ] Document findings (AC: #3, #4)
  - [ ] Create `_bmad-output/implementation-artifacts/virtual-scroll-header-fix.md`
  - [ ] Include sections: Reproduction evidence (header top values), Root Cause, Angular CDK version, Proposed Fix
  - [ ] Add Account screen findings
- [ ] Run `pnpm all` (AC: #5)

## Dev Notes

### Application Running

The terminals show `pnpm start:server` and `pnpm start:dms-material` are already running. The app should be accessible at `http://localhost:4200`.

### Key Files

- `apps/dms-material/src/app/shared/components/base-table/base-table.component.html` — CDK virtual scroll template
- `apps/dms-material/src/app/shared/components/base-table/base-table.component.scss` — CSS with relevant comments
- `apps/dms-material/src/app/shared/components/base-table/base-table.component.ts` — `bufferSize = input<number>(10)`, `rowHeight = input<number>(52)`

### BaseTable Template Structure

The virtual scroll is structured as:

```html
<div class="table-container">
  <!-- position: relative; height: 100%; overflow: hidden -->
  <cdk-virtual-scroll-viewport <!-- .virtual-scroll-viewport: flex:1; overflow-y:auto; will-change:transform; contain:strict -->
    [itemSize]="rowHeight()">
    <table mat-table>
      <tr mat-header-row *matHeaderRowDef="displayedColumns(); sticky: true"></tr>
      <!-- sticky: true -->
      <tr mat-row *matRowDef="..."></tr>
    </table>
  </cdk-virtual-scroll-viewport>
</div>
```

### Known Likely Root Cause

The `contain: strict` CSS property on `.virtual-scroll-viewport` is the most likely culprit. `contain: strict` implies `contain: layout paint size` — layout containment creates a new formatting context that can prevent `position: sticky` from working correctly relative to the scroll container. Additionally, `will-change: transform` can create a new stacking context.

CDK virtual scroll works by applying `transform: translateY(Npx)` to the `.cdk-virtual-scroll-content-wrapper`. When the sticky header's `top: 0` positioning is resolved relative to a containing block created by `contain: strict` rather than the actual scroll container, the header moves with the content.

### Angular CDK Version

The project uses `@angular/cdk` version matching Angular 21. Check `package.json` for exact version.

### Playwright MCP Snippet Reference

```javascript
// Capture header top position
const headerTop = await page.evaluate(() => {
  const th = document.querySelector('th.mat-mdc-header-cell');
  return th ? th.getBoundingClientRect().top : null;
});
```

### Story 31.2 Dependency

This story produces `virtual-scroll-header-fix.md` which Story 31.2 uses as the implementation guide. Story 31.2 must NOT be started until this file exists with a confirmed root cause and proposed fix.

### References

[Source: apps/dms-material/src/app/shared/components/base-table/base-table.component.scss]
[Source: apps/dms-material/src/app/shared/components/base-table/base-table.component.html]
[Source: _bmad-output/planning-artifacts/epics-2026-03-30.md — Epic 31]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

- Playwright MCP used to reproduce issue on Universe screen (header top changed 128→−372 over 10×50px scroll steps)
- Playwright MCP confirmed same issue on Account screen (header top changed 113→−137 over 5×50px scroll steps)
- Root cause: `contain: strict` (implies `contain: layout`) on `.virtual-scroll-viewport` breaks `position: sticky` for descendant headers

### Completion Notes List

- `_bmad-output/implementation-artifacts/virtual-scroll-header-fix.md` created with reproduction data, root cause, CDK version constraint, and proposed fix (`contain: paint` replacing `contain: strict`)
- No source code changes were made (investigation-only story)
- `pnpm all` passed (no affected tasks)
- `pnpm format` ran clean

### File List

- `_bmad-output/implementation-artifacts/virtual-scroll-header-fix.md` (new)
