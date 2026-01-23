# Epic AK: Wire Up Global/Universe Update Universe Button

## Epic Goal

Enable universe synchronization from screener data in DMS-MATERIAL.

## Epic Description

Connects the "Update Universe" button to sync universe data from screener selections.

## Stories

### TDD/Implementation Cycle 1: Wire Update Universe Button

1. **Story AK.1 (TDD):** Write unit tests for universe button integration
2. **Story AK.2 (Implementation):** Wire update universe button to UniverseSyncService

### TDD/Implementation Cycle 2: Notifications

3. **Story AK.3 (TDD):** Write unit tests for success/error notifications
4. **Story AK.4 (Implementation):** Add success/error notifications

### TDD/Implementation Cycle 3: E2E Testing

5. **Story AK.5 (TDD):** Write e2e tests for universe update flow
6. **Story AK.6 (Implementation):** Refine implementation based on e2e test results

## Dependencies

- Epic AJ (Screener table working)

## Priority

**High**

## Estimated Effort

2 days
