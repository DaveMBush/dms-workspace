# Story 71.2: Fix distributions_per_year Write in Sync-From-Screener Update Path

Status: Approved

## Story

As a trader,
I want the Universe sync to correctly update `distributions_per_year` for all symbols,
so that the annualised yield calculation is correct for every symbol after a sync.

## Acceptance Criteria

1. **Given** the root cause identified in Story 71.1,
   **When** `updateExistingUniverseRecord` is updated to correctly include `distributions_per_year`
   from the `getDistributions` response in the `prisma.universe.update` data object,
   **Then** the failing unit test from Story 71.1 now passes.

2. **Given** the fix is applied,
   **When** the Playwright MCP server triggers a sync and then reads the universe record for a
   known monthly payer (e.g. OXLC),
   **Then** `distributions_per_year` is 12 (not 1).

3. **Given** all other existing sync-from-screener unit tests,
   **When** `pnpm all` runs,
   **Then** all tests pass.

## Tasks / Subtasks

- [ ] Task 1: Apply the production code fix (AC: #1)
  - [ ] Subtask 1.1: Re-read `apps/server/src/app/routes/universe/sync-from-screener/index.ts`
        to confirm the exact root cause from Story 71.1
  - [ ] Subtask 1.2: If the root cause is that `distributions_per_year` is missing from the
        `prisma.universe.update` data object, add it using
        `distribution?.distributions_per_year ?? existing.distributions_per_year`
  - [ ] Subtask 1.3: If the root cause is upstream in `getDistributions` returning 1, apply
        the appropriate fix in `apps/server/src/app/routes/settings/common/get-distributions.function.ts`
        (following the same pattern as Epic 62's fix) — consult
        `_bmad-output/implementation-artifacts/62-2-fix-distribution-frequency.md` for reference
  - [ ] Subtask 1.4: Remove the `test.fails()` annotation from the Story 71.1 failing test so
        it now runs as a normal passing test

- [ ] Task 2: Verify with Playwright MCP server (AC: #2)
  - [ ] Subtask 2.1: Start the dev server and navigate to the Universe screen
  - [ ] Subtask 2.2: Trigger the "Update Universe" / sync-from-screener action
  - [ ] Subtask 2.3: After sync completes, confirm `distributions_per_year` for OXLC is 12
        (monthly) via the network response or API call
  - [ ] Subtask 2.4: Check at least one other known non-monthly payer to confirm its value
        is also correct (e.g. a quarterly payer should show 4)
  - [ ] Subtask 2.5: Document the MCP verification screenshots in the Dev Agent Record

- [ ] Task 3: Run full test suite (AC: #3)
  - [ ] Subtask 3.1: Run `pnpm all` and confirm all tests pass
  - [ ] Subtask 3.2: Confirm the Story 71.1 test (now without `test.fails()`) is green
  - [ ] Subtask 3.3: Confirm no existing sync-from-screener tests regressed

## Dev Notes

### Key Files

| File | Purpose |
|------|---------|
| `apps/server/src/app/routes/universe/sync-from-screener/index.ts` | Production fix target — `updateExistingUniverseRecord` function |
| `apps/server/src/app/routes/universe/sync-from-screener/index.spec.ts` | Remove `test.fails()` from Story 71.1 test |
| `apps/server/src/app/routes/settings/common/get-distributions.function.ts` | May need fix if root cause is upstream |

### Architecture Context

The fix must ensure that when `upsertUniverse` runs for an existing universe symbol:

1. `getDistributions(symbol)` is called and its return value is captured
2. The `distribution.distributions_per_year` value flows through to `updateExistingUniverseRecord`
3. `prisma.universe.update` includes `distributions_per_year: distribution?.distributions_per_year ?? existing.distributions_per_year`
   in the `data` object — with the `??` fallback only used when `getDistributions` returns
   null/undefined (not when it returns `{ distributions_per_year: 1 }` due to a calculation bug)

If the investigation in 71.1 reveals that `getDistributions` itself returns 1 due to
`calculateDistributionsPerYear` Path A (same root cause as Epic 62), the fix must address that
function — not just the update call.

### Technical Guidance

**Fix pattern if the issue is in `updateExistingUniverseRecord` (missing field in data object):**
```ts
// In apps/server/src/app/routes/universe/sync-from-screener/index.ts
await prisma.universe.update({
  where: { id: existing.id },
  data: {
    risk_group_id: riskGroupId,
    last_price: lastPrice ?? existing.last_price,
    distribution: distribution?.distribution ?? existing.distribution,
    distributions_per_year:
      distribution?.distributions_per_year ?? existing.distributions_per_year,
    ex_date: exDateToSet ?? existing.ex_date ?? null,
    expired: false,
  },
});
```

**Fix pattern if the issue is in `calculateDistributionsPerYear` returning 1:**
- Follow the approach in `_bmad-output/implementation-artifacts/62-2-fix-distribution-frequency.md`
- Fix `calculateDistributionsPerYear` so that symbols with limited dividend history
  correctly derive frequency from available data (e.g. amount consistency, known amounts)

### Testing Standards

- Unit tests: Vitest in same directory as source file
- `globals: true` is set — no `import { describe, it, expect }` needed
- Remove `test.fails()` from the Story 71.1 test — it should now be a regular passing test
- `pnpm all` must pass
- Named functions required everywhere (ESLint `@smarttools/no-anonymous-functions`)

### Project Structure Notes

- Route file: `apps/server/src/app/routes/universe/sync-from-screener/index.ts`
- Spec file: `apps/server/src/app/routes/universe/sync-from-screener/index.spec.ts`
- Distribution function: `apps/server/src/app/routes/settings/common/get-distributions.function.ts`

### References

- [Source: _bmad-output/planning-artifacts/epics-2026-04-13.md - Epic 71 Story 71.2]
- Reference: `_bmad-output/implementation-artifacts/71-1-investigate-sync-distribution-history.md`
- Reference: `_bmad-output/implementation-artifacts/62-2-fix-distribution-frequency.md`

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

### Completion Notes List

### File List
