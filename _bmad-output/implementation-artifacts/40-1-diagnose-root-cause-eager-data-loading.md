# Story 40.1: Diagnose Root Cause of Eager Data Loading

Status: Approved

## Story

As a developer,
I want to understand exactly why all data is being loaded eagerly instead of lazily,
so that the fix can target the correct code rather than guessing.

## Acceptance Criteria

1. **Given** the currently running application, **When** the Universe Screen is opened and the network tab is observed, **Then** the diagnosis document records: (a) which API request loads all rows, (b) what code triggers that request (component init, NgRx effect, SmartSignals configuration), (c) whether the `start`/`end` index range is being sent to the server at all.
2. **Given** the SmartNgRX/SmartSignals documentation and the existing store configuration, **When** the diagnosis is complete, **Then** `_bmad-output/implementation-artifacts/lazy-loading-diagnosis.md` is produced documenting: root cause, correct SmartSignals configuration for lazy loading, and a recommended implementation approach referencing Context7 MCP documentation if needed.
3. **Given** the diagnosis document, **When** it is reviewed, **Then** it references the specific file(s) and function(s) responsible for the eager load.

## Definition of Done

- [ ] `lazy-loading-diagnosis.md` created with root cause and fix recommendation
- [ ] Specific files and functions identified
- [ ] SmartNgRX lazy-loading configuration approach documented
- [ ] `pnpm format` passes

## Tasks / Subtasks

- [ ] Search the codebase for the SmartSignals store/feature configuration for the Universe table (AC: #1)
  - [ ] Find the `createSmartNgRXFeature` or equivalent configuration
  - [ ] Check if `indexList` or `pageSize` or virtual-scroll range is configured
- [ ] Trace the data flow from component init to API request for the Universe table (AC: #1)
  - [ ] Identify whether `cdk-virtual-scroll-viewport` range events are wired to the store
  - [ ] Identify the server API endpoint that returns all rows and what query params it currently accepts
- [ ] Use Context7 MCP (`mcp_context7_query-docs`) to look up SmartNgRX lazy-loading documentation if needed (AC: #2)
- [ ] Produce `lazy-loading-diagnosis.md` with: root cause, correct SmartSignals lazy-loading config, recommended approach (AC: #2, #3)
- [ ] Run `pnpm format`

## Dev Notes

### Key Files

- `apps/dms-material/src/app/global/` — Universe Screen store configuration and component
- `apps/server/src/app/routes/` — Universe table server route; check if it supports `start`/`end` query params
- SmartNgRX library documentation — use Context7 to query current docs

### Approach

This is a research/documentation story. Use grep to find `createSmartNgRXFeature`, `SmartSignals`, or `indexList` in the codebase. Check whether the virtual-scroll range events (`cdk-virtual-scroll-viewport.scrolledIndexChange`) are used to drive data fetching. Document all findings before any code changes. The output drives Stories 40.2 and 40.3.

## Dev Agent Record

### Agent Model Used

### Completion Notes

## File List
