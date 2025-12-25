# Story Restructure Summary: Proper TDD Implementation

## Problem Identified

Stories were structured with separate unit test stories AFTER implementation stories, which violates TDD principles:

- Write tests FIRST
- Then implement to make tests pass

## Changes Made

### Epic AG: Risk Group Data Initialization

**Before:** 3 stories

1. AG.1 - Implementation with basic unit tests
2. AG.2 - Add comprehensive unit tests (WRONG - tests should be in AG.1)
3. AG.3 - E2E tests

**After:** 2 stories

1. AG.1 - Implementation with comprehensive unit tests (merged AG.2 content into Step 1)
2. AG.2 - E2E tests (renamed from AG.3)

**Rationale:**

- Unit tests and implementation are part of the same TDD cycle
- E2E tests can be separate since they test the integrated system

### Epic AH: Wire Account Panel

**Before:** 6 stories

1. AH.1 - Wire list (basic tests)
2. AH.2 - Add account (basic tests)
3. AH.3 - Edit account (basic tests)
4. AH.4 - Delete account (basic tests)
5. AH.5 - Add comprehensive unit tests (WRONG - should be in AH.1-4)
6. AH.6 - E2E tests

**After:** 5 stories

1. AH.1 - Wire list (with comprehensive unit tests)
2. AH.2 - Add account (with comprehensive unit tests)
3. AH.3 - Edit account (with comprehensive unit tests)
4. AH.4 - Delete account (with comprehensive unit tests)
5. AH.5 - E2E tests (renamed from AH.6)

**Rationale:**

- Each CRUD operation story includes its comprehensive unit tests in TDD Step 1
- E2E tests remain separate for full integration testing

## Updated Story Template Pattern

### When to Separate Stories

✅ **Keep Separate:**

- E2E tests from unit tests (different tools, different scope)
- Major features from each other (add vs edit vs delete)
- Backend from frontend (different tech stacks)

❌ **Do NOT Separate:**

- Unit tests from implementation (violates TDD)
- "Basic tests" from "comprehensive tests" (should all be comprehensive from start)

### Proper TDD Story Structure

Each story should have:

1. **Step 1:** Write COMPREHENSIVE unit tests first (not just stubs)

   - Include success paths
   - Include failure paths
   - Include edge cases
   - Mock all dependencies
   - Target >80% coverage

2. **Step 2:** Run tests (they fail)

3. **Step 3:** Implement to make tests pass

4. **Step 4:** Tests pass

5. **Step 5:** Manual verification (E2E/Playwright)

### E2E Test Stories

E2E tests CAN be separate stories because:

- They test the integrated system (not just one component)
- They use different tools (Playwright vs Vitest)
- They require different setup (full app + backend + database)
- They're slower and run less frequently
- They often follow after multiple implementation stories are complete

## Impact on Remaining Epics

All future epics (AI-AX) should follow this pattern:

- Implementation stories include comprehensive unit tests in TDD Step 1
- E2E tests are separate final story per epic
- No separate "add unit tests" stories

## Files Modified

- Deleted: `AG.2.unit-tests-risk-group-initialization.md`
- Deleted: `AH.5.unit-tests-account-crud.md`
- Updated: `AG.1.integrate-risk-group-validation-top-route.md` (added comprehensive tests)
- Renamed: `AG.3.e2e-tests-risk-groups-load.md` → `AG.2.e2e-tests-risk-groups-load.md`
- Renamed: `AH.6.e2e-tests-account-crud.md` → `AH.5.e2e-tests-account-crud.md`
- Updated: `epic-ag-risk-group-data-initialization.md` (story count 3→2)
- Updated: `epic-ah-wire-account-panel.md` (story count 6→5)

## Benefits

1. **Follows TDD:** Tests written before implementation
2. **Prevents gaps:** No separate "comprehensive tests" story means they're there from the start
3. **Better estimates:** Each story's true scope is visible upfront
4. **Clearer DOD:** >80% coverage required in each story, not deferred

**Date:** December 25, 2025
**Author:** BMad PM (John)
