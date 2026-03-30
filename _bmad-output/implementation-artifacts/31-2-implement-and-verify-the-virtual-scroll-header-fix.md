# Story 31.2: Implement and Verify the Virtual-Scroll Header Fix

Status: Approved

## Story

As a user,
I want the table header to remain stationary as I incrementally scroll through a large virtual-scroll table,
so that I can always see column labels while reading data rows at any scroll position.

## Acceptance Criteria

1. **Given** the root cause documented in Story 31.1 (`_bmad-output/implementation-artifacts/virtual-scroll-header-fix.md`), **When** the fix is implemented in `BaseTableComponent` (CSS and/or TypeScript), **Then** Playwright MCP can incrementally scroll the Universe screen table and the header row's `getBoundingClientRect().top` value does not change during the scroll — it stays constant at its initial position.
2. **Given** the fix, **When** the same Playwright MCP verification is run on the Account screen (open positions, sold positions, or dividend deposits table), **Then** the header also stays stationary during incremental scroll.
3. **Given** the fix, **When** no existing Playwright E2E tests are changed, **Then** all E2E tests still pass post-fix.
4. **Given** 1,000 rows loaded in a table, **When** scrolling from top to bottom, **Then** no visible frame drops occur (scroll remains fluid — the fix must not reintroduce jank by removing necessary performance CSS).
5. **Given** all changes, **When** `pnpm all` runs, **Then** it passes.

## Definition of Done

- [ ] Fix applied to `base-table.component.scss` (and/or `.ts` if needed)
- [ ] Playwright MCP verification completed on Universe screen — header stays fixed during scroll
- [ ] Playwright MCP verification completed on Account screen — header stays fixed during scroll
- [ ] `pnpm all` passes
- [ ] Run `pnpm format`
- [ ] Repeat all if any fail

## Tasks / Subtasks

- [ ] Read `_bmad-output/implementation-artifacts/virtual-scroll-header-fix.md` (prerequisite — must exist from Story 31.1) (AC: #1)
  - [ ] If this file does not exist, STOP — Story 31.1 must be completed first
  - [ ] Extract the proposed fix approach from the file
- [ ] Apply the CSS fix to `base-table.component.scss` (AC: #1)
  - [ ] Based on root cause in 31.1, apply the appropriate fix (see Dev Notes for likely approaches)
  - [ ] Do NOT remove `will-change: transform` or `contain` properties blindly — understand what each does before changing
  - [ ] If `contain: strict` is the culprit: change to `contain: content` or remove `contain` entirely
  - [ ] If `will-change: transform` is creating an unwanted stacking context: remove it
  - [ ] If neither: follow the proposed fix from `virtual-scroll-header-fix.md`
- [ ] Verify fix with Playwright MCP on Universe screen (AC: #1)
  - [ ] Navigate to Universe screen via Playwright MCP
  - [ ] Capture initial `getBoundingClientRect().top` of `th.mat-mdc-header-cell`
  - [ ] Scroll down 50px increments 10 times; capture header top after each step
  - [ ] Confirm header top remains constant (≤ 1px variation acceptable for sub-pixel rendering)
- [ ] Verify fix with Playwright MCP on Account screen (AC: #2)
  - [ ] Navigate to an account screen with open trades loaded
  - [ ] Repeat the same incremental scroll capture
  - [ ] Confirm header stays stationary
- [ ] Run full E2E suite (AC: #3)
  - [ ] `pnpm nx run dms-material-e2e:e2e` (or `pnpm all`)
  - [ ] Confirm no existing tests fail
- [ ] Run `pnpm all` (AC: #5)

## Dev Notes

### PREREQUISITE: Read Story 31.1 Output

Before writing any code, read `_bmad-output/implementation-artifacts/virtual-scroll-header-fix.md`. The proposed fix in that file is the implementation guide. The notes below are background context only.

### Key Files

- `apps/dms-material/src/app/shared/components/base-table/base-table.component.scss` — PRIMARY: CSS fix goes here
- `apps/dms-material/src/app/shared/components/base-table/base-table.component.html` — template (likely no changes needed)
- `apps/dms-material/src/app/shared/components/base-table/base-table.component.ts` — TS (likely no changes needed)
- `apps/dms-material-e2e/` — E2E tests to verify no regression

### Current CSS State (from `base-table.component.scss`)

```scss
.virtual-scroll-viewport {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  will-change: transform;      // ← creates a stacking context; may break sticky
  contain: strict;             // ← most likely root cause
}

th.mat-mdc-header-cell {
  position: sticky;
  top: 0;
  z-index: 1;
  background-color: var(--dms-surface);
}
```

### Likely Fix Approaches (in order of preference)

**Option A — Remove `contain: strict`, keep other performance CSS:**
```scss
.virtual-scroll-viewport {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  will-change: transform;
  // contain: strict removed — was preventing sticky th from working
}
```

**Option B — Downgrade `contain` to `contain: size` (preserves some perf benefit):**
```scss
.virtual-scroll-viewport {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  will-change: transform;
  contain: size;  // size containment only, no layout isolation
}
```

**Option C — Remove both `contain` and `will-change`:**
```scss
.virtual-scroll-viewport {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  // removed: will-change and contain — were breaking sticky positioning
}
```

Only apply the fix confirmed in `virtual-scroll-header-fix.md`. Do not apply all options simultaneously.

### Angular CDK Virtual Scroll — Sticky Header Interaction

CDK virtual scroll works by applying `transform: translateY(Npx)` to `.cdk-virtual-scroll-content-wrapper`. The `sticky` positioning of `th` cells must be resolved against the scroll container (the `cdk-virtual-scroll-viewport` element). If `contain: strict` or `will-change: transform` creates a new formatting context, the `top: 0` sticky anchor resolves against that context instead of the scroll viewport, causing the header to scroll with the content.

### Account Screen Location

- `apps/dms-material/src/app/account/` — contains open-positions, sold-positions, deposits components — all use `<app-base-table>`
- Navigate to an account by clicking on any account in the sidebar

### Playwright MCP Verification Script Reference

```javascript
// Run after each 50px scroll step
const headerTop = await page.evaluate(() => {
  const th = document.querySelector('th.mat-mdc-header-cell');
  return th ? Math.round(th.getBoundingClientRect().top) : null;
});
// headerTop should remain the same value throughout scroll
```

### Do NOT Regress

- `border-collapse: separate; border-spacing: 0` on `table` — this fixes border ghost/disappear on sticky cells, must stay
- `box-shadow` on `th.mat-mdc-header-cell` — replaces collapsed border for sticky cells, must stay
- `background-color: var(--dms-surface)` on `th` and `td` — prevents background bleed-through during scroll, must stay

### References

[Source: _bmad-output/implementation-artifacts/virtual-scroll-header-fix.md — root cause and proposed fix (Story 31.1 output)]
[Source: apps/dms-material/src/app/shared/components/base-table/base-table.component.scss]
[Source: apps/dms-material/src/app/shared/components/base-table/base-table.component.html]
[Source: _bmad-output/planning-artifacts/epics-2026-03-30.md — Epic 31]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
