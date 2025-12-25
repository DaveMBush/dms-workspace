# Story AG.2: Add Unit Tests for Risk Group Initialization in Top Route

## Story

**As a** developer
**I want** comprehensive unit tests for risk group initialization
**So that** I can ensure the top route properly validates risk group existence

## Context

**Current System:**
- AG.1 integrated `ensureRiskGroupsExist()` into top route
- Need comprehensive test coverage for this integration
- Tests should cover success, failure, and edge cases

**Testing Target:**
- Unit tests for top route handler with risk group validation
- Mock risk group service calls
- Verify proper error handling

## Acceptance Criteria

### Functional Requirements

- [ ] Tests verify `ensureRiskGroupsExist()` is called
- [ ] Tests verify risk groups returned in response
- [ ] Tests verify proper error handling when risk groups fail to create
- [ ] Tests cover edge cases (partial failures, network issues)

### Technical Requirements

- [ ] Use Vitest for unit tests
- [ ] Mock Prisma client appropriately
- [ ] Test both success and failure paths
- [ ] Achieve >80% code coverage for top route handler

## Test-Driven Development Approach

### Step 1: Create Unit Tests First

Create/expand `apps/server/src/app/routes/top/index.spec.ts`:

```typescript
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ensureRiskGroupsExist } from '../settings/common/ensure-risk-groups-exist.function';

vi.mock('../settings/common/ensure-risk-groups-exist.function');

describe('Top Route Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST / - Risk Group Validation', () => {
    it('should call ensureRiskGroupsExist before loading data', async () => {
      const mockEnsure = vi.mocked(ensureRiskGroupsExist);
      mockEnsure.mockResolvedValueOnce([
        { id: '1', name: 'Equities' },
        { id: '2', name: 'Income' },
        { id: '3', name: 'Tax Free Income' },
      ]);

      // Call top route handler
      // Verify ensureRiskGroupsExist was called
      expect(mockEnsure).toHaveBeenCalledTimes(1);
    });

    it('should return risk groups in response', async () => {
      const mockEnsure = vi.mocked(ensureRiskGroupsExist);
      mockEnsure.mockResolvedValueOnce([
        { id: '1', name: 'Equities' },
        { id: '2', name: 'Income' },
        { id: '3', name: 'Tax Free Income' },
      ]);

      // Call top route
      // Verify response contains risk group IDs
    });

    it('should handle ensureRiskGroupsExist failure gracefully', async () => {
      const mockEnsure = vi.mocked(ensureRiskGroupsExist);
      mockEnsure.mockRejectedValueOnce(new Error('Database connection failed'));

      // Call top route
      // Verify proper error response
      // Verify error is logged
    });

    it('should proceed normally when risk groups already exist', async () => {
      const mockEnsure = vi.mocked(ensureRiskGroupsExist);
      mockEnsure.mockResolvedValueOnce([
        { id: '1', name: 'Equities' },
        { id: '2', name: 'Income' },
        { id: '3', name: 'Tax Free Income' },
      ]);

      // Verify no additional database calls for creating groups
      expect(mockEnsure).toHaveBeenCalledTimes(1);
    });

    it('should log risk group initialization', async () => {
      const mockEnsure = vi.mocked(ensureRiskGroupsExist);
      const mockLogger = vi.fn();
      
      mockEnsure.mockResolvedValueOnce([
        { id: '1', name: 'Equities' },
        { id: '2', name: 'Income' },
        { id: '3', name: 'Tax Free Income' },
      ]);

      // Call route
      // Verify logging occurred
    });
  });

  describe('Edge Cases', () => {
    it('should handle partial risk group creation', async () => {
      const mockEnsure = vi.mocked(ensureRiskGroupsExist);
      mockEnsure.mockResolvedValueOnce([
        { id: '1', name: 'Equities' },
        { id: '2', name: 'Income' },
      ]);

      // Verify warning is logged about missing group
    });

    it('should handle network timeout during risk group check', async () => {
      const mockEnsure = vi.mocked(ensureRiskGroupsExist);
      mockEnsure.mockImplementationOnce(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );

      // Verify timeout is handled gracefully
    });

    it('should handle concurrent top route calls', async () => {
      const mockEnsure = vi.mocked(ensureRiskGroupsExist);
      mockEnsure.mockResolvedValue([
        { id: '1', name: 'Equities' },
        { id: '2', name: 'Income' },
        { id: '3', name: 'Tax Free Income' },
      ]);

      // Make multiple concurrent calls
      // Verify all succeed without race conditions
    });
  });
});
```

### Step 2: Run Tests (Should Fail Initially)

```bash
pnpm nx test server
```

Tests should fail initially as the implementation may not be complete.

### Step 3: Refine Implementation Based on Test Failures

Review test failures and update `apps/server/src/app/routes/top/index.ts` as needed:
- Add proper error handling
- Add logging
- Ensure risk groups are included in response

### Step 4: Run Tests Again (Should Pass)

```bash
pnpm nx test server
```

All tests should pass.

### Step 5: Verify Coverage

```bash
pnpm nx test server --coverage
```

Verify >80% coverage for top route handler.

## Technical Approach

### Files to Modify

- `apps/server/src/app/routes/top/index.spec.ts` - Add comprehensive tests
- `apps/server/src/app/routes/top/index.ts` - Refine based on test requirements

### Implementation Steps

1. Create mock for `ensureRiskGroupsExist`
2. Write tests for success path
3. Write tests for failure paths
4. Write tests for edge cases
5. Run tests and verify coverage
6. Refine implementation based on failures

### Test Coverage Goals

- Success path: Risk groups exist and returned
- Failure path: Database error handling
- Edge cases: Partial failures, timeouts, concurrent calls
- Logging: Verify proper logging at all stages

## Files Modified

| File                                            | Changes                       |
| ----------------------------------------------- | ----------------------------- |
| `apps/server/src/app/routes/top/index.spec.ts` | Added comprehensive unit tests |
| `apps/server/src/app/routes/top/index.ts`      | Refined error handling/logging |

## Definition of Done

- [ ] All unit tests created and passing
- [ ] >80% code coverage achieved
- [ ] Success and failure paths tested
- [ ] Edge cases covered
- [ ] Logging verified
- [ ] All existing tests still pass
- [ ] Lint passes
- [ ] Code reviewed
- [ ] All validation commands pass
  - Run `pnpm all`
  - Run `pnpm e2e:rms-material`
  - Run `pnpm dupcheck`
  - Run `pnpm format`
  - Repeat all of these if any fail until they all pass

## Notes

- This story focuses purely on unit testing
- E2E tests will be covered in AG.3
- Follow existing test patterns from other route handlers
- Use Vitest mocking capabilities effectively
- Ensure tests are deterministic and fast
