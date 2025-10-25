# Sprint Change Proposal

## Distribution Frequency Detection Bug Fix

**Date:** 2025-10-25
**Priority:** High
**Type:** Bug Fix
**Epic:** Y - Distribution Frequency Detection Fix
**Story:** Y.1 - Update Distribution Frequency Detection Algorithm
**Status:** APPROVED

---

## 1. Issue Summary

### Problem Statement

The distribution frequency detection algorithm in `get-distributions.function.ts` uses a 4-distribution averaging approach that fails to detect frequency changes promptly. This causes `distributions_per_year` values to fluctuate incorrectly during daily field updates.

### Root Cause

- **Current logic:** `.slice(-4)` averages intervals across last 4 distributions
- **When frequency changes** (e.g., monthly → weekly), old intervals dilute the calculation
- **Result:** Incorrect frequency classification during transition periods

### Impact

- **User Workflow:** Distribution frequency changes on every field update (daily occurrence)
- **Data Quality:** Inaccurate `distributions_per_year` values
- **Affected Scope:** Multiple symbols with inconsistent distribution schedules
- **Business Impact:** User frustration, unreliable yield calculations

### Evidence

- **Location:** `apps/server/src/app/routes/settings/common/get-distributions.function.ts:29-76`
- **Specific issue:** Line 42 (`.slice(-4)`) and lines 48-61 (averaging logic)

---

## 2. Epic Impact Summary

### Current Epic Status

- **Current Epic:** `183-dividend-deposits-lazy-loading`
- **Status:** Can continue but paused for this fix

### Epic Structure Changes

- ✅ **Current Epic:** No modifications needed - remains intact
- ✅ **Future Epics:** No dependencies or conflicts identified
- 🆕 **New Epic Required:** "Epic Y - Distribution Frequency Detection Fix"
  - **Priority:** Immediate (insert before current work)
  - **Scope:** Single story - bug fix implementation
  - **Timeline:** Complete before resuming lazy-loading work

### Epic Sequencing

1. **New:** Distribution Frequency Fix (Epic Y, Story Y.1) ← **DO NOW**
2. **Resume:** 183-dividend-deposits-lazy-loading
3. **Continue:** All planned future epics unchanged

---

## 3. Artifact Conflict & Impact Analysis

### Files Requiring Changes

1. **Implementation File:** `apps/server/src/app/routes/settings/common/get-distributions.function.ts`

   - Modify `calculateDistributionsPerYear` function (lines 29-76)

2. **Test File:** `apps/server/src/app/routes/settings/common/get-distributions.function.spec.ts`
   - Update existing test cases to reflect 2-distribution logic
   - Add new test cases for frequency change scenarios

### Documentation

- ✅ **No PRD updates needed** (implementation detail)
- ✅ **No architecture doc updates needed** (interface unchanged)
- ✅ **No API contract changes** (same return type/structure)

### PRD Review

- **PRD References:** Found in `docs/architecture.md:72-74`
- Documents use of `getDistributions(symbol)` for Yahoo data consistency
- Does NOT document the internal frequency detection algorithm
- **Conflict:** None - PRD describes the interface, not implementation

### Architecture Document

- **Architecture References:** Multiple references in architecture docs
- `getDistributions` mentioned as data source for `distributions_per_year`
- No specific documentation of the 4-distribution averaging algorithm
- **Conflict:** None - architecture describes what, not how

### Test Documentation

- **Existing Tests:** `get-distributions.function.spec.ts` with 12 test cases
- Tests cover: quarterly, monthly, annual, weekly patterns
- Tests use 4-5 distributions in mock data (reflects current 4-distribution logic)
- **Conflict:** YES - Tests will need updating to reflect 2-distribution logic
- **Tests to Add:**
  - Frequency change scenarios (monthly → weekly transition)
  - Edge case: exactly 2 distributions
  - New threshold boundaries (≤7, >27, >45 days)
  - Holiday shift scenarios

### API Documentation/Frontend Impact

- **API Contract:** `DistributionResult` interface unchanged
- `distributions_per_year` field remains same type (number)
- **Frontend Impact:** Minimal - same data structure
- **Behavioral Change:** Values may change more responsively when frequencies shift
- **User Impact:** Positive - more accurate, up-to-date frequency detection

### Database/Schema

- **Schema Impact:** None - no database changes required
- **Data Migration:** None needed

### Artifact Impact Summary

**Single file change with test updates:**

- **Modified:** `apps/server/src/app/routes/settings/common/get-distributions.function.ts`
- **Test Updates:** `apps/server/src/app/routes/settings/common/get-distributions.function.spec.ts`
- **Documentation:** No updates required (implementation detail not documented)

---

## 4. Path Forward Evaluation

### Option 1: Direct Adjustment / Integration ✅ SELECTED

**Approach:**

- Modify `calculateDistributionsPerYear` function to use last 2 distributions instead of last 4
- Update threshold logic from averaging to direct comparison
- Update/add test cases to cover frequency changes

**Scope:**

- Change line 42: `.slice(-4)` → `.slice(-2)`
- Simplify logic: Remove averaging, use single interval comparison
- Update thresholds:
  - **≤7 days** → Weekly (52/year) - accounts for holidays/weekends
  - **>27 and ≤45 days** → Monthly (12/year)
  - **>45 days** → Quarterly (4/year)
  - **Otherwise** → Annual (1/year)

**Feasibility:** ✅ High - isolated change, clear requirements

**Effort:** ⏱️ Low - ~30-45 minutes implementation + testing

**Risks:** ⚠️ Minimal

- Well-tested function with existing test suite
- Single responsibility, clear inputs/outputs
- No external dependencies affected

**Benefits:** ✨

- Fixes daily workflow frustration
- More accurate frequency detection
- Faster response to frequency changes
- Cleaner, simpler logic

### Option 2: Potential Rollback

**Assessment:** ❌ Not Applicable

- No completed stories to roll back
- This is a bug fix, not a feature revert
- Rolling back would mean keeping the bug

### Option 3: PRD MVP Review & Re-scoping

**Assessment:** ❌ Not Needed

- Bug fix doesn't affect MVP scope
- No features need to be added/removed
- Core functionality remains unchanged
- This improves existing behavior

### Selected Recommended Path

**✅ Option 1 - Direct Adjustment**

**Rationale:**

1. **Minimal scope** - Single function modification
2. **High value** - Fixes daily workflow issue
3. **Low risk** - Isolated change with existing test coverage
4. **Quick turnaround** - Can be completed and validated immediately
5. **No dependencies** - Doesn't block or affect other work

---

## 5. PRD MVP Impact

**Assessment:** ✅ **No MVP Impact**

- Core functionality preserved
- API contract unchanged
- Feature set remains identical
- Behavioral improvement only (more accurate frequency detection)
- No scope additions or reductions required

---

## 6. Specific Proposed Edits

### Edit 1: Modify `calculateDistributionsPerYear` Function

**File:** `apps/server/src/app/routes/settings/common/get-distributions.function.ts`

**Lines to Change:** 29-76

#### Change 1: Update Distribution Slice (Line 42)

```typescript
// FROM:
.slice(-4);

// TO:
.slice(-2);
```

#### Change 2: Replace Averaging Logic (Lines 48-75)

**REMOVE LINES 48-61:**

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

**REPLACE WITH:**

```typescript
// Calculate single interval between last 2 distributions
const daysBetween = Math.abs(recentRows[1].date.valueOf() - recentRows[0].date.valueOf()) / (1000 * 60 * 60 * 24);
```

#### Change 3: Update Threshold Logic (Lines 63-75)

**REPLACE:**

```typescript
if (avgInterval < 10) {
  return 52; // weekly
}

if (avgInterval < 40) {
  return 12; // monthly
}

if (avgInterval < 120) {
  return 4; // quarterly
}

return 1;
```

**WITH:**

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

#### Complete Proposed Function

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

### Edit 2: Add New Test Cases

**File:** `apps/server/src/app/routes/settings/common/get-distributions.function.spec.ts`

**Add these 5 new test cases:**

#### Test 1: Frequency Change Detection (Monthly → Weekly)

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

#### Test 2: Exactly 2 Distributions

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

#### Test 3: Weekly Boundary (Exactly 7 Days)

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

#### Test 4: Weekly with Holiday Shift

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

#### Test 5: Monthly Boundary (30 Days)

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

### Edit 3: Review Existing Tests

**Tests to Review/Verify Still Pass:**

- Lines 72-89: Quarterly pattern test (may need adjustment)
- Lines 91-109: Monthly pattern test (verify still valid)
- All other existing tests should continue to pass

---

## 7. High-Level Action Plan

### Implementation Steps

1. **Create Epic/Story Structure** ✅ COMPLETE

   - [x] Epic Y: Distribution Frequency Detection Fix
   - [x] Story Y.1: Update frequency algorithm
   - [x] Acceptance Criteria defined

2. **Implementation Phase**

   - [ ] Modify `calculateDistributionsPerYear` function (5 min)
   - [ ] Add new test cases for frequency changes (10 min)
   - [ ] Update existing tests if needed (5 min)
   - [ ] Run test suite and validate (5 min)

3. **Validation Phase**

   - [ ] Run `pnpm format`
   - [ ] Run `pnpm dupcheck`
   - [ ] Run `DATABASE_URL="file:./database.db" pnpm nx run server:test --code-coverage`
   - [ ] Run `pnpm nx run server:lint`
   - [ ] Run `pnpm nx run server:build:production`
   - [ ] Test with real symbols showing frequency issues
   - [ ] Verify field updates no longer cause frequency changes

4. **Completion**
   - [ ] Commit changes with clear message
   - [ ] Update story status to complete
   - [ ] Resume lazy-loading epic work

### Estimated Time

**Total:** 30-45 minutes

**Breakdown:**

- Code changes: 5 minutes
- Test additions: 10 minutes
- Test adjustments: 5 minutes
- Validation suite: 10 minutes
- Real-world testing: 5-10 minutes

### Success Criteria

- ✅ All tests pass (existing + new)
- ✅ Frequency changes detected within 2 distributions
- ✅ Field updates don't cause incorrect frequency fluctuations
- ✅ Real-world validation with affected symbols
- ✅ Code coverage maintained or improved
- ✅ All lint/format checks pass

---

## 8. Agent Handoff Plan

### Current Agent

**PM (John)** - Analysis and proposal complete ✅

### Next Agent(s)

**Developer/Implementation Agent** - Execute the code changes

- **Input:** This Sprint Change Proposal + Story Y.1
- **Tasks:** Implement edits, update tests, validate
- **Handoff:** When all tests pass and validation complete

### No Additional Agents Needed

- ✅ **No architecture changes** → No Architect needed
- ✅ **No UI changes** → No Design Arch needed
- ✅ **No backlog reorganization** → No PO needed (single story)

---

## 9. Risk Assessment & Mitigation

### Risks

| Risk                                               | Likelihood | Impact   | Mitigation                                     | Rollback             |
| -------------------------------------------------- | ---------- | -------- | ---------------------------------------------- | -------------------- |
| Existing tests fail with 2-distribution logic      | Low        | Medium   | Review and adjust test mock data if needed     | Revert single commit |
| New logic misclassifies some distribution patterns | Low        | Low      | Comprehensive test coverage for boundary cases | Revert single commit |
| Performance impact from changed logic              | Very Low   | Positive | Simpler calculation = faster execution         | N/A                  |

### Overall Risk Level

✅ **Low** - High-confidence change with strong mitigation strategies

---

## 10. Validation Plan

### Pre-Deployment Validation

1. ✅ All unit tests pass (existing + new)
2. ✅ Code coverage maintained or improved
3. ✅ Linting passes
4. ✅ Format checks pass
5. ✅ Build succeeds
6. ✅ Manual testing with affected symbols

### Post-Deployment Validation

1. Monitor `distributions_per_year` values for affected symbols
2. Verify field updates don't cause fluctuations
3. Confirm frequency changes detected promptly (within 2 distributions)

### Real-World Test Cases

**Symbols to test:**

- Symbols known to have changed frequencies
- Symbols with weekly distributions (verify ≤7 day detection)
- Symbols with monthly distributions (verify 28-45 day range)
- Symbols with quarterly distributions (verify >45 days)

---

## 11. Change Navigation Checklist - COMPLETED ✓

- ✅ **Section 1:** Understand Trigger & Context
- ✅ **Section 2:** Epic Impact Assessment
- ✅ **Section 3:** Artifact Conflict & Impact Analysis
- ✅ **Section 4:** Path Forward Evaluation
- ✅ **Section 5:** Sprint Change Proposal Components
- ✅ **Section 6:** Final Review & Handoff
- ✅ **User Approval:** APPROVED (2025-10-25)

---

## 12. Summary

### What Changed

Bug in distribution frequency detection using 4-distribution averaging that masks frequency changes

### What We're Doing

Switching to 2-distribution direct comparison with clearer thresholds:

- ≤7 days → Weekly (52/year)
- > 27 and ≤45 days → Monthly (12/year)
- > 45 days → Quarterly (4/year)

### Who Needs to Do What

Developer/Implementation agent executes the code changes per detailed proposal in Section 6

### When We'll Know It Worked

- All tests pass (existing + 5 new)
- Field updates stop causing frequency fluctuations
- Real-world validation with affected symbols succeeds
- Frequency changes detected within 2 distributions

---

## Appendix: Related Documentation

- **Epic:** `docs/backlog/epic-y-distribution-frequency-detection-fix.md`
- **Story:** `docs/stories/Y.1.distribution-frequency-detection-fix.md`
- **Implementation File:** `apps/server/src/app/routes/settings/common/get-distributions.function.ts`
- **Test File:** `apps/server/src/app/routes/settings/common/get-distributions.function.spec.ts`

---

**Status:** Ready for Implementation
**Approved By:** User
**Approval Date:** 2025-10-25
**Next Action:** Developer implementation per Section 6
