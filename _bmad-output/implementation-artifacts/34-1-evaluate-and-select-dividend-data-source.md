# Story 34.1: Evaluate and Select Dividend Data Source

Status: Approved

## Story

As a developer,
I want to evaluate dividendhistory.org and dividendhistory.net (and any other viable free sources) against the dividend data needs of the DMS application,
so that I can select the best source before writing any integration code.

## Acceptance Criteria

1. **Given** the requirement to fetch dividend amounts with ≥ 4 decimal-place precision, **When** dividendhistory.org is evaluated (manually or via automated HTTP request), **Then** the evaluation determines whether it provides dividend history for standard US CEF tickers with ≥ 4 decimal places and without a paid API key requirement.
2. **Given** dividendhistory.net is also evaluated, **When** the comparison is complete, **Then** a short decision record (`_bmad-output/implementation-artifacts/dividend-source-evaluation.md`) is produced documenting: URL, sample response structure, precision of amounts returned, rate-limit constraints, ToS summary, and the recommended choice.
3. **Given** neither candidate source satisfies the requirements, **When** the evaluation document is produced, **Then** it documents the investigation steps taken and recommends an alternative source (e.g. cefconnect.com, macrotrends.net, or a fallback to a Yahoo Finance workaround for precision).
4. **Given** the evaluation, **When** the document is complete, **Then** it includes at least one real sample fetch for a known ticker (e.g. `PDI`) demonstrating the actual data shape returned.

## Definition of Done

- [ ] `dividend-source-evaluation.md` created with all required sections
- [ ] At least one real HTTP fetch documented for each candidate
- [ ] A clear recommendation present in the document
- [ ] `pnpm format` passes

## Tasks / Subtasks

- [ ] Fetch and analyse dividendhistory.org for ticker `PDI` (AC: #1)
  - [ ] Make a real HTTP request (or manual browser inspection) to retrieve dividend data
  - [ ] Record: URL pattern used, response format, decimal precision of amounts, rate-limit information
- [ ] Fetch and analyse dividendhistory.net for ticker `PDI` (AC: #2)
  - [ ] Same analysis as above for the `.net` variant
  - [ ] Compare both sources on precision, data coverage, and ToS constraints
- [ ] Research alternative sources if neither candidate qualifies (AC: #3)
  - [ ] Check cefconnect.com, macrotrends.net; document findings if checked
- [ ] Produce `dividend-source-evaluation.md` artefact (AC: #2)
  - [ ] Section per candidate: URL, sample response, precision, rate limits, ToS summary
  - [ ] Clear recommendation section at the top
- [ ] Run `pnpm format` (AC: #4)

## Dev Notes

### Key Files

- `apps/server/src/app/routes/common/distribution-api.function.ts` — existing Yahoo Finance dividend fetch; study rate-limit and response-parsing patterns before selecting new source
- `_bmad-output/implementation-artifacts/dividend-source-evaluation.md` — artefact to be created by this story

### Approach

This is a research/documentation story. No production code changes are expected. The output is `dividend-source-evaluation.md` which Story 34.2 will use as its specification. Fetch at least one real ticker (`PDI`) from each candidate source via `fetch`/`axios` in a quick throwaway Node script or via `curl`, and capture the raw response in the document.

## Dev Agent Record

### Agent Model Used

### Completion Notes

## File List
