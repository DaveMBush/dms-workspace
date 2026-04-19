# Story 71.1: Investigate and Reproduce Distribution History Bug in Sync Path

Status: Approved

## Story

As a developer,
I want to confirm that `updateExistingUniverseRecord` in the sync-from-screener path is not
correctly persisting `distributions_per_year`,
so that I can design a targeted fix in Story 71.2.

## Acceptance Criteria

1. **Given** the source code of `apps/server/src/app/routes/universe/sync-from-screener/index.ts`
   including `updateExistingUniverseRecord`,
   **When** the developer traces what fields are written to the database for an existing universe
   record on sync,
   **Then** the investigation confirms whether `distributions_per_year` from the `getDistributions`
   return value is included in the `prisma.universe.update` call.

2. **Given** the Playwright MCP server,
   **When** the developer uses it to trigger a "Update Universe" sync and then queries the API for a
   known monthly-payer symbol (e.g. OXLC),
   **Then** the `distributions_per_year` value in the response is either 1 (bug confirmed) or 12
   (bug not present on this symbol — root cause may differ).

3. **Given** a failing unit test in `sync-from-screener/index.spec.ts`,
   **When** the test asserts that `updateExistingUniverseRecord` writes the `distributions_per_year`
   from `getDistributions` to the database,
   **Then** the test currently **FAILS** confirming the omission.

4. **Given** all other existing tests are unmodified,
   **When** `pnpm all` runs,
   **Then** all previously passing tests continue to pass.

## Tasks / Subtasks

- [ ] Task 1: Read and trace the full sync-from-screener code path (AC: #1)
  - [ ] Subtask 1.1: Read `apps/server/src/app/routes/universe/sync-from-screener/index.ts` in
        full — trace `upsertUniverse` → `updateExistingUniverseRecord` — note which fields are
        passed to `prisma.universe.update`
  - [ ] Subtask 1.2: Confirm whether `getDistributions(symbol)` is called for existing records
        or only for new inserts — check the code path inside `upsertUniverse`
  - [ ] Subtask 1.3: Confirm whether the `distribution` return value is passed to
        `updateExistingUniverseRecord` and whether `distributions_per_year` is included in the
        `data` object of the `prisma.universe.update` call
  - [ ] Subtask 1.4: Read `apps/server/src/app/routes/settings/common/get-distributions.function.ts`
        — note whether `calculateDistributionsPerYear` could return 1 for an existing symbol with
        limited dividend history (same root cause as Epic 62)

- [ ] Task 2: Reconcile the update path vs. expected behaviour (AC: #1)
  - [ ] Subtask 2.1: If `distributions_per_year` IS present in the `prisma.universe.update` call,
        determine whether the bug is upstream — i.e. `getDistributions` itself returns 1 via
        `calculateDistributionsPerYear` Path A (`rows.length <= 1`)
  - [ ] Subtask 2.2: If `distributions_per_year` is NOT present in the update call (or uses
        `existing.distributions_per_year` as fallback unconditionally), document this as the
        root cause
  - [ ] Subtask 2.3: Read `apps/server/src/app/routes/universe/sync-from-screener/index.spec.ts`
        — confirm what `getDistributions` mock returns and whether it exercises the
        `distributions_per_year` write path
  - [ ] Subtask 2.4: Document the complete root cause in Dev Agent Record

- [ ] Task 3: Reproduce with Playwright MCP server (AC: #2)
  - [ ] Subtask 3.1: Start the dev server and navigate to the Universe screen
  - [ ] Subtask 3.2: Trigger the "Update Universe" / sync-from-screener action
  - [ ] Subtask 3.3: After sync completes, query `GET /api/universe` or inspect the network
        response to confirm the `distributions_per_year` value for OXLC (a known monthly payer)
  - [ ] Subtask 3.4: If OXLC is not in the universe, first add it then trigger sync and re-check
  - [ ] Subtask 3.5: Document the MCP session screenshots / network responses in the Dev Agent Record

- [ ] Task 4: Write failing unit test (AC: #3, #4)
  - [ ] Subtask 4.1: In `sync-from-screener/index.spec.ts`, add a `test.fails()` test that
        mocks `getDistributions` to return `{ distributions_per_year: 12, distribution: 0.15 }`
        and asserts that the `prisma.universe.update` call receives `distributions_per_year: 12`
        in its data object for an existing record
  - [ ] Subtask 4.2: Name the test `BUG(71-1): updateExistingUniverseRecord does not persist
        distributions_per_year from getDistributions`
  - [ ] Subtask 4.3: Run `pnpm all` and confirm all tests pass with the new `test.fails()` test
        counted as an expected failure

## Dev Notes

### Key Files

| File | Purpose |
|------|---------|
| `apps/server/src/app/routes/universe/sync-from-screener/index.ts` | Main sync route — contains `upsertUniverse`, `updateExistingUniverseRecord`, `createNewUniverseRecord` |
| `apps/server/src/app/routes/universe/sync-from-screener/index.spec.ts` | Unit tests for sync route — add new `test.fails()` test here |
| `apps/server/src/app/routes/universe/sync-from-screener/sync.integration.spec.ts` | Integration tests — read for context, do not modify |
| `apps/server/src/app/routes/settings/common/get-distributions.function.ts` | Distribution fetch — may return 1 via `calculateDistributionsPerYear` Path A |

### Architecture Context

The sync path flows as:

```
POST /api/universe/sync-from-screener
  └─► upsertUniverse({ symbol, riskGroupId })
        ├─► getLastPrice(symbol)
        ├─► getDistributions(symbol)   ← called for ALL symbols (insert and update)
        └─► if (existing):
              updateExistingUniverseRecord({ existing, riskGroupId, lastPrice, distribution, exDateToSet })
                └─► prisma.universe.update({ data: {
                      risk_group_id,
                      last_price,
                      distribution,
                      distributions_per_year,   ← presence and value to be confirmed
                      ex_date,
                      expired
                    }})
            else:
              createNewUniverseRecord(...)
```

The key question is whether `distributions_per_year` in the `prisma.universe.update` data object
correctly uses `distribution?.distributions_per_year` or falls back to `existing.distributions_per_year`
in a way that preserves an incorrect stored value of 1.

This is distinct from Epic 62 (which was about the `addSymbol` → `fetchAndUpdatePriceData` path).
Epic 71 is about the `sync-from-screener` update path for symbols **already** in the universe.

### Technical Guidance

**Possible root causes (to be confirmed by investigation):**

1. `getDistributions` is called correctly and its return value is passed to `updateExistingUniverseRecord`,
   but `distributions_per_year` IS present in the update data object  using
   `distribution?.distributions_per_year ?? existing.distributions_per_year` — in this case the
   bug is that `getDistributions` itself returns 1 (same `calculateDistributionsPerYear` Path A
   issue as Epic 62).

2. `getDistributions` result is passed but the `prisma.universe.update` data object omits
   `distributions_per_year` entirely, defaulting to the existing stored value.

**Test structure for 71-1:**
```ts
// BUG(71-1): updateExistingUniverseRecord does not persist distributions_per_year from getDistributions
test.fails('BUG(71-1): updateExistingUniverseRecord does not persist distributions_per_year from getDistributions', async function verifyDistributionsPerYearWrittenOnUpdate() {
  mockGetDistributions.mockResolvedValueOnce({
    distributions_per_year: 12,
    distribution: 0.15,
  });
  // ... trigger sync for an existing symbol
  // assert prisma.universe.update was called with distributions_per_year: 12
  expect(mockPrismaUniverseUpdate).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({ distributions_per_year: 12 }),
    })
  );
});
```

### Testing Standards

- Unit tests: Vitest in same directory as source file
- `globals: true` is set — no `import { describe, it, expect }` needed
- Use `test.fails()` for intentionally failing regression tests per project convention
- `pnpm all` must pass
- Named functions required everywhere (ESLint `@smarttools/no-anonymous-functions`)
- Test naming must include the story number prefix: `BUG(71-1): ...`
- No production code changes in this story — investigation and test-writing only

### Project Structure Notes

- Route file: `apps/server/src/app/routes/universe/sync-from-screener/index.ts`
- Spec file: `apps/server/src/app/routes/universe/sync-from-screener/index.spec.ts`
- Distribution function: `apps/server/src/app/routes/settings/common/get-distributions.function.ts`

### References

- [Source: _bmad-output/planning-artifacts/epics-2026-04-13.md - Epic 71 Story 71.1]
- Reference: `_bmad-output/implementation-artifacts/62-1-investigate-epic-58-fix-failure.md`

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

### Completion Notes List

### File List
