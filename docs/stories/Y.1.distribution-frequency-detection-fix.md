# Story Y.1: Update Distribution Frequency Detection Algorithm

## Story

**As a** user managing dividend-paying securities
**I want** distribution frequencies to be detected accurately and remain stable
**So that** daily field updates don't cause frequency values to fluctuate incorrectly

## Context

**Current System:**

- Location: `apps/server/src/app/routes/settings/common/get-distributions.function.ts`
- Function: `calculateDistributionsPerYear(rows, today)`
- Current behavior: Uses last 4 distributions, averages intervals
- Thresholds: <10 days (weekly), <40 days (monthly), <120 days (quarterly)

**Problem:**

- When distribution frequency changes (e.g., monthly → weekly), averaging masks the transition
- Requires 4+ distributions to overcome old averaged intervals
- Causes `distributions_per_year` to change on every daily field update
- Impacts yield calculations and data reliability

**Root Cause:**

- Line 42: `.slice(-4)` uses 4 distributions
- Lines 48-61: Averaging logic dilutes frequency changes

## Acceptance Criteria

- [ ] Distribution frequency uses last 2 distributions only
- [ ] Interval calculated directly between those 2 distributions (no averaging)
- [ ] Weekly threshold: ≤7 days → 52/year (accounts for holidays/weekends)
- [ ] Monthly threshold: >27 and ≤45 days → 12/year
- [ ] Quarterly threshold: >45 days → 4/year
- [ ] Annual/default: Otherwise → 1/year
- [ ] All existing tests updated and passing
- [ ] New test cases added for:
  - [ ] Frequency change scenario (monthly → weekly)
  - [ ] Exactly 2 distributions edge case
  - [ ] Weekly boundary test (exactly 7 days)
  - [ ] Weekly holiday shift test (6 days)
  - [ ] Monthly boundary test (30 days)
- [ ] Code coverage maintained or improved
- [ ] All lint and format checks pass
- [ ] Real-world validation: affected symbols show stable frequencies

## Technical Approach

### Implementation Changes

**File:** `apps/server/src/app/routes/settings/common/get-distributions.function.ts`

**Step 1: Update distribution slice (Line 42)**

```typescript
// FROM:
.slice(-4);

// TO:
.slice(-2);
```

**Step 2: Replace averaging logic (Lines 48-75)**

Remove:

```typescript
const intervals: number[] = [];
for (let i = 1; i < recentRows.length; i++) {
  intervals.push(Math.abs(recentRows[i].date.valueOf() - recentRows[i - 1].date.valueOf()) / (1000 * 60 * 60 * 24));
}

const avgInterval =
  intervals.reduce(function sumIntervals(a: number, b: number): number {
    return a + b;
  }, 0) / intervals.length;
```

Replace with:

```typescript
// Calculate single interval between last 2 distributions
const daysBetween = Math.abs(recentRows[1].date.valueOf() - recentRows[0].date.valueOf()) / (1000 * 60 * 60 * 24);
```

**Step 3: Update threshold logic**

```typescript
// Detect frequency based on interval
// ≤7 days accounts for weekly distributions with holiday/weekend shifts
if (daysBetween <= 7) {
  return 52; // weekly
}

// >27 and ≤45 days accounts for monthly with holiday variations
if (daysBetween > 27 && daysBetween <= 45) {
  return 12; // monthly
}

// >45 days for quarterly (allows for holiday shifts)
if (daysBetween > 45) {
  return 4; // quarterly
}

return 1; // annual/default
```

### Complete Modified Function

```typescript
function calculateDistributionsPerYear(rows: ProcessedRow[], today: Date): number {
  if (rows.length <= 1) {
    return 1;
  }

  const recentRows = rows
    .filter(function filterPastDistributions(row: ProcessedRow): boolean {
      return row.date < today;
    })
    .reverse() // oldest to newest
    .slice(-2); // Use last 2 distributions only

  if (recentRows.length <= 1) {
    return 1;
  }

  // Calculate single interval between last 2 distributions
  const daysBetween = Math.abs(recentRows[1].date.valueOf() - recentRows[0].date.valueOf()) / (1000 * 60 * 60 * 24);

  // Detect frequency based on interval
  // ≤7 days accounts for weekly distributions with holiday/weekend shifts
  if (daysBetween <= 7) {
    return 52; // weekly
  }

  // >27 and ≤45 days accounts for monthly with holiday variations
  if (daysBetween > 27 && daysBetween <= 45) {
    return 12; // monthly
  }

  // >45 days for quarterly (allows for holiday shifts)
  if (daysBetween > 45) {
    return 4; // quarterly
  }

  return 1; // annual/default
}
```

### Test Updates

**File:** `apps/server/src/app/routes/settings/common/get-distributions.function.spec.ts`

**New Test Cases to Add:**

1. **Frequency Change Detection:**

```typescript
test('detects frequency change from monthly to weekly', async () => {
  const mockRows: ProcessedRow[] = [
    { amount: 0.1, date: new Date('2025-05-15') }, // Old monthly
    { amount: 0.1, date: new Date('2025-06-15') }, // Old monthly
    { amount: 0.025, date: new Date('2025-08-14') }, // New weekly
    { amount: 0.025, date: new Date('2025-08-21') }, // New weekly (7 days)
  ];

  mockFetchDistributionData.mockResolvedValueOnce(mockRows);

  const result = await getDistributions('FREQ_CHANGE');

  expect(result?.distributions_per_year).toBe(52); // Should detect weekly
});
```

2. **Exactly 2 Distributions:**

```typescript
test('handles exactly 2 distributions correctly', async () => {
  const mockRows: ProcessedRow[] = [
    { amount: 0.5, date: new Date('2025-06-15') },
    { amount: 0.5, date: new Date('2025-07-22') }, // 37 days apart
  ];

  mockFetchDistributionData.mockResolvedValueOnce(mockRows);

  const result = await getDistributions('TWO_ONLY');

  expect(result?.distributions_per_year).toBe(12); // Monthly
});
```

3. **Weekly Boundary (7 days):**

```typescript
test('correctly identifies weekly at 7-day threshold', async () => {
  const mockRows: ProcessedRow[] = [
    { amount: 0.1, date: new Date('2025-08-14') },
    { amount: 0.1, date: new Date('2025-08-21') }, // Exactly 7 days
  ];

  mockFetchDistributionData.mockResolvedValueOnce(mockRows);

  const result = await getDistributions('WEEKLY_BOUNDARY');

  expect(result?.distributions_per_year).toBe(52);
});
```

4. **Weekly with Holiday Shift:**

```typescript
test('correctly identifies weekly with 6-day interval (holiday shift)', async () => {
  const mockRows: ProcessedRow[] = [
    { amount: 0.1, date: new Date('2025-08-14') },
    { amount: 0.1, date: new Date('2025-08-20') }, // 6 days (holiday)
  ];

  mockFetchDistributionData.mockResolvedValueOnce(mockRows);

  const result = await getDistributions('WEEKLY_HOLIDAY');

  expect(result?.distributions_per_year).toBe(52);
});
```

5. **Monthly Boundary (30 days):**

```typescript
test('correctly identifies monthly at 30-day interval', async () => {
  const mockRows: ProcessedRow[] = [
    { amount: 0.25, date: new Date('2025-07-15') },
    { amount: 0.25, date: new Date('2025-08-14') }, // 30 days
  ];

  mockFetchDistributionData.mockResolvedValueOnce(mockRows);

  const result = await getDistributions('MONTHLY_BOUNDARY');

  expect(result?.distributions_per_year).toBe(12);
});
```

**Existing Tests to Review:**

- Lines 72-89: Quarterly pattern test (may need data adjustment)
- Lines 91-109: Monthly pattern test (verify still valid)
- All other tests should continue to pass

## Implementation Steps

1. **Modify Function Logic**

   - [ ] Update `.slice(-4)` to `.slice(-2)` on line 42
   - [ ] Replace averaging logic with single interval calculation
   - [ ] Update threshold comparisons
   - [ ] Add comments explaining holiday considerations

2. **Add Test Cases**

   - [ ] Add frequency change detection test
   - [ ] Add exactly-2-distributions edge case test
   - [ ] Add weekly boundary test (7 days)
   - [ ] Add weekly holiday shift test (6 days)
   - [ ] Add monthly boundary test (30 days)

3. **Validation**

   - [ ] Run `pnpm format`
   - [ ] Run `pnpm dupcheck`
   - [ ] Run `DATABASE_URL="file:./database.db" pnpm nx run server:test --code-coverage`
   - [ ] Run `pnpm nx run server:lint`
   - [ ] Run `pnpm nx run server:build:production`

4. **Real-World Testing**
   - [ ] Test with symbols known to have frequency changes
   - [ ] Verify field updates don't cause frequency fluctuations
   - [ ] Check that all affected symbols show stable `distributions_per_year` values

## Edge Cases & Considerations

1. **Single Distribution:** Returns 1 (annual) - no change needed
2. **Exactly 2 Distributions:** Now primary calculation case
3. **Holiday Shifts:** Weekly threshold (≤7) accounts for 1-2 day shifts
4. **Monthly Variations:** Range (>27 to ≤45) handles month length differences
5. **Frequency Changes:** Detected immediately with 2nd new distribution

## Dependencies

- None - isolated change

## Related Files

**Modified:**

- `apps/server/src/app/routes/settings/common/get-distributions.function.ts`
- `apps/server/src/app/routes/settings/common/get-distributions.function.spec.ts`

**Referenced (no changes):**

- `apps/server/src/app/routes/settings/index.ts` (consumer)
- `apps/server/src/app/routes/universe/sync-from-screener/index.ts` (consumer)
- `apps/server/src/app/routes/universe/add-symbol/add-symbol.function.ts` (consumer)

## Success Validation

**Functional:**

- ✅ Frequency no longer fluctuates during daily updates
- ✅ Frequency changes detected within 2 distributions
- ✅ Weekly distributions detected accurately (≤7 days)
- ✅ Monthly distributions detected accurately (28-45 days)
- ✅ Quarterly distributions detected accurately (>45 days)

**Technical:**

- ✅ All tests pass (existing + new)
- ✅ Code coverage ≥ previous level
- ✅ Lint checks pass
- ✅ Format checks pass
- ✅ Build succeeds

**User Impact:**

- ✅ Stable frequency values during field updates
- ✅ Accurate yield calculations
- ✅ Reduced workflow frustration

## Risks & Mitigations

| Risk                        | Likelihood | Impact | Mitigation                               |
| --------------------------- | ---------- | ------ | ---------------------------------------- |
| Tests fail with new logic   | Low        | Medium | Update mock data patterns in tests       |
| Edge case misclassification | Low        | Low    | Comprehensive boundary testing           |
| Existing consumers break    | Very Low   | High   | Interface unchanged, no breaking changes |

## Notes

- This fix addresses a long-standing bug affecting daily workflow
- The 2-distribution approach is more responsive and accurate
- Holiday considerations built into weekly threshold (≤7 days)
- No API contract changes - purely internal logic improvement
- Simpler code (direct comparison vs averaging) improves maintainability
