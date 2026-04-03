# Story 45.1: Audit and Remove Yahoo Finance Dividend Retrieval Code

Status: Approved

## Story

As a developer,
I want all Yahoo Finance dividend retrieval code removed from the codebase,
so that the application relies solely on dividendhistory.org for all dividend data.

## Acceptance Criteria

1. **Given** a full-codebase search for Yahoo Finance dividend retrieval (API calls, service methods, HTTP endpoints, constants, env vars), **When** every occurrence is identified, **Then** it is either deleted (if unused) or replaced with the equivalent dividendhistory.org implementation.
2. **Given** the current dividend displayed on the Universe screen, **When** the screen data is loaded after the change, **Then** the current dividend value is sourced exclusively from dividendhistory.org.
3. **Given** the current dividend displayed on Account screens, **When** the screen data is loaded after the change, **Then** the current dividend value is sourced exclusively from dividendhistory.org.
4. **Given** any dividend calculation path in the codebase, **When** dividend data is accessed, **Then** it originates from dividendhistory.org, not Yahoo Finance.
5. **Given** all changes are applied, **When** `pnpm all` runs, **Then** all unit tests pass with no regressions.

## Tasks / Subtasks

- [ ] Search the entire codebase for Yahoo Finance dividend references (AC: #1)
  - [ ] Search terms: `yahoo`, `Yahoo`, `YAHOO`, `yahoofinance`, `finance.yahoo`, `yticker`, `yfinance`
  - [ ] Include: service files, HTTP client calls, environment variable config, API constants, utility functions
  - [ ] Document every file and line that references Yahoo Finance dividend retrieval
- [ ] For each Yahoo Finance dividend code path found (AC: #1)
  - [ ] If the code path is dead/unreachable: delete it
  - [ ] If the code path is active: confirm dividendhistory.org already provides the same data, then remove the Yahoo Finance code
  - [ ] Do NOT touch Yahoo Finance code that retrieves non-dividend data (price, market cap, etc.) unless explicitly part of dividend retrieval
- [ ] Verify current dividend on Universe screen still has values after removal (AC: #2)
- [ ] Verify current dividend on Account screens still has values after removal (AC: #3)
- [ ] Trace all dividend calculation paths and confirm no Yahoo Finance dependency remains (AC: #4)
- [ ] Run `pnpm all` and confirm no regressions (AC: #5)

## Dev Notes

### Background

The dividend source was migrated to dividendhistory.org in Epic 34. However, Yahoo Finance dividend code was not fully removed and some paths remain. This story removes all remaining Yahoo Finance dividend retrieval — not just some of it.

### Key Commands

- Search for Yahoo Finance references: `grep -r -i "yahoo" apps/server/src/ --include="*.ts"`
- Run all tests: `pnpm all`

### Key File Locations

- Server source: `apps/server/src/`
- Epic 34 story files for context on dividendhistory.org implementation:
  - `_bmad-output/implementation-artifacts/34-1-evaluate-and-select-dividend-data-source.md`
  - `_bmad-output/implementation-artifacts/34-2-implement-dividend-fetch-service.md`
  - `_bmad-output/implementation-artifacts/34-3-wire-new-service-into-dividend-update-process.md`

### Rules

- Only remove Yahoo Finance DIVIDEND retrieval code — leave any Yahoo Finance code used for other data (price, etc.) unless it is also serving dividend data
- After removal, dividend values must still appear on all screens (dividendhistory.org must already cover the same data)
- Do not modify test files

### References

- [Source: _bmad-output/planning-artifacts/epics-2026-04-03.md]
- [Source: _bmad-output/implementation-artifacts/34-2-implement-dividend-fetch-service.md]
- [Source: _bmad-output/project-context.md]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
