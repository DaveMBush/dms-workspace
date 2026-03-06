# Epic AV: Persist Selected Button After Refresh

## Epic Goal

Maintain selected tab/account after browser refresh.

## Epic Description

Use localStorage or query params to persist UI state across page refreshes.

## Stories

1. **Story AV.1 (TDD):** Write Unit Tests for State Persistence Service - TDD RED Phase
2. **Story AV.2 (Implementation):** Implement State Persistence Service - TDD GREEN Phase
3. **Story AV.3 (TDD):** Write Unit Tests for Global Tab Selection Persistence - TDD RED Phase
4. **Story AV.4 (Implementation):** Persist Global Tab Selection - TDD GREEN Phase
5. **Story AV.5 (TDD):** Write Unit Tests for Account Selection Persistence - TDD RED Phase
6. **Story AV.6 (Implementation):** Persist Account Selection - TDD GREEN Phase
7. **Story AV.7 (TDD):** Write Unit Tests for Account Tab Selection Persistence - TDD RED Phase
8. **Story AV.8 (Implementation):** Persist Account Tab Selection - TDD GREEN Phase
9. **Story AV.9 (TDD):** Write Unit Tests for State Restoration on App Load - TDD RED Phase
10. **Story AV.10 (Implementation):** Restore State on App Load - TDD GREEN Phase
11. **Story AV.11 (Bug Fix):** Verify and Fix Implementation Issues Before E2E Tests
12. **Story AV.12 (E2E Tests):** Write E2E Tests for State Persistence - TDD RED Phase
13. **Story AV.13 (E2E Implementation):** Refine Implementation Based on E2E Test Results - TDD GREEN Phase

## Dependencies

- Epic AU

## Priority

**Medium**

## Estimated Effort

4-5 days (TDD pattern with RED/GREEN phases and bug fix verification)
