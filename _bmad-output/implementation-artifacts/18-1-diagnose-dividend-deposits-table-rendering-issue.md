# Story 18.1: Diagnose Dividend Deposits Table Rendering Issue

Status: ready-for-dev

## Story

As a developer,
I want to understand exactly why the Dividend Deposits table fails to render rows while Open Positions and Sold Positions work correctly,
So that I can apply a targeted fix rather than guessing.

## Acceptance Criteria

1. **Given** the Account screen with Open Positions, Sold Positions, and Dividend Deposits tables
   **When** I compare the HTML template and component configuration of all three tables side by side
   **Then** I can identify the structural difference(s) caused by Dividend Deposits having one header row vs the other tables having two header rows

2. **Given** I inspect the table during browser rendering (using Playwright MCP or browser DevTools)
   **When** the page loads and the Dividend Deposits table shows no rows
   **Then** I can determine whether the issue is:
   - A container height of zero or incorrect value
   - A CDK virtual scroll viewport height calculated incorrectly
   - A CSS/Tailwind class difference in the panel, wrapper, or table container
   - Some other root cause

3. **Given** the diagnosis is complete
   **When** I document my findings
   **Then** I have a clear, specific root cause statement and a proposed fix approach documented in `_bmad-output/implementation-artifacts/dividend-deposits-diagnosis.md`

## Definition of Done

- [ ] Root cause identified and documented
- [ ] Comparison of Dividend Deposits vs Open Positions/Sold Positions table structure documented
- [ ] Clear proposed fix approach documented in `_bmad-output/implementation-artifacts/dividend-deposits-diagnosis.md`
- [ ] All validation commands pass:
  - [ ] Run `pnpm all`
  - [ ] Run `pnpm e2e:dms-material:chromium`
  - [ ] Run `pnpm e2e:dms-material:firefox`
  - [ ] Run `pnpm dupcheck`
  - [ ] Run `pnpm format`
  - [ ] Repeat all of these if any fail until they all pass

## Tasks / Subtasks

- [ ] Locate all three table components in the Account screen (AC: 1)
  - [ ] Find: `apps/dms-material/src/app/pages/account/`
  - [ ] Identify Open Positions table component template
  - [ ] Identify Sold Positions table component template
  - [ ] Identify Dividend Deposits table component template
- [ ] Side-by-side structural comparison (AC: 1)
  - [ ] Count header rows in each table (`<thead>`, `<tr>` inside `<thead>`, or `matHeaderRowDef`)
  - [ ] Document: Open Positions = 2 header rows, Sold Positions = 2 header rows, Dividend Deposits = 1 header row
  - [ ] Compare the container/wrapper HTML structure around each table
  - [ ] Compare any CDK virtual scroll viewport configuration
  - [ ] Compare Tailwind/CSS classes on the panel, wrapper, and table container elements
- [ ] Use Playwright MCP to inspect live rendering (AC: 2)
  - [ ] Navigate to Account screen
  - [ ] Open in browser via Playwright MCP
  - [ ] Use `mcp_microsoft_pla_browser_evaluate` to run JavaScript to check:
    - `document.querySelector('[dividend-deposits-selector]').offsetHeight` — is it 0?
    - `document.querySelector('cdk-virtual-scroll-viewport').style.height` — what value?
  - [ ] Capture screenshots showing the no-rows state
  - [ ] Scroll the Dividend Deposits table and observe behavior change
- [ ] Identify root cause (AC: 2)
  - [ ] Document whether the issue is: container height = 0, CDK viewport miscalculation, CSS difference, or other
  - [ ] Trace where the 1-vs-2 header row difference creates a measurement error
- [ ] Write diagnosis document (AC: 3)
  - [ ] Create: `_bmad-output/implementation-artifacts/dividend-deposits-diagnosis.md`
  - [ ] Include: root cause statement, evidence from inspection, proposed fix approach
  - [ ] Include: code snippets showing the structural difference
- [ ] Run validation suite (no code changes expected in this story)
  - [ ] `pnpm all`
  - [ ] `pnpm e2e:dms-material:chromium`
  - [ ] `pnpm e2e:dms-material:firefox`
  - [ ] `pnpm dupcheck`
  - [ ] `pnpm format`

## Dev Notes

### Known Symptom Pattern

The Dividend Deposits table shows this specific failure sequence:
1. **Initial load:** No rows visible (only scrollbar visible)
2. **Scroll to bottom and back:** Rows become visible
3. **Scroll down again:** Rows disappear again

This scroll-triggered visibility cycle is the hallmark of a **CDK virtual scroll viewport height calculation issue**. The viewport thinks it has less space than it actually does, so it renders 0 rows. Scrolling forces a recalculation.

### Key Structural Difference

| Table | Header Rows | Status |
|-------|-------------|--------|
| Open Positions | 2 | ✅ Working (fixed in Epic 12) |
| Sold Positions | 2 | ✅ Working (fixed in Epic 12) |
| Dividend Deposits | 1 | ❌ Still broken |

The Epic 12 fix likely hard-coded a height calculation that assumed 2 header rows. Dividend Deposits with 1 header row results in 1 header-row-height too little space being subtracted from the viewport.

### CDK Virtual Scroll Context

The project uses Angular CDK virtual scrolling (`@angular/cdk/scrolling`). Key things to look for:

```typescript
// In the component or directive:
@Input() itemSize: number;  // height per row in pixels

// In the template:
<cdk-virtual-scroll-viewport [itemSize]="rowHeight" class="...">
  <table mat-table ...>
    <thead>...</thead>  // ← count these rows
    <tr *cdkVirtualFor="let row of rows">...</tr>
  </table>
</cdk-virtual-scroll-viewport>
```

The viewport height must account for header rows. If the viewport is sized assuming 2 header rows but Dividend Deposits only has 1, the calculation is off by one row's height.

### Previous Story Reference

See `_bmad-output/implementation-artifacts/12-1-restore-account-screen-table-visibility.md` for context on the Epic 12 fix. Understanding exactly what was changed there is critical to understanding why Dividend Deposits remains broken.

### Angular CDK Virtual Scroll — Known Height Issue

A common pattern is:
```
viewport height = total container height - (number_of_header_rows × row_height)
```
If the component used a constant `2` for header rows (matching Open Positions and Sold Positions), Dividend Deposits will compute as if it has 1 too many header rows, leaving it `rowHeight` pixels too short — just enough to show 0 rows.

### Diagnosis Document Template

```markdown
# Dividend Deposits Table Diagnosis

## Root Cause
<statement>

## Evidence
<screenshots and code snippets>

## Structural Comparison
<table comparison>

## Proposed Fix
<specific approach for Story 18.2>
```

### References

- [Source: _bmad-output/planning-artifacts/epics-2026-03-23.md#Epic 18]
- [Source: _bmad-output/implementation-artifacts/12-1-restore-account-screen-table-visibility.md]
- [Source: _bmad-output/project-context.md#Technology Stack (Angular CDK)]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

### Completion Notes List

### File List
