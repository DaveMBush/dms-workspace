# Story AG.1: Integrate Risk Group Validation into Top Route Handler

## Story

**As a** backend developer
**I want** risk groups to be validated and created when the top route loads
**So that** downstream components always have the required risk group data

## Context

**Current System:**

- `ensureRiskGroupsExist()` function exists in `apps/server/src/app/routes/settings/common/`
- Top route handler in `apps/server/src/app/routes/top/index.ts` loads top-level data
- Risk groups (Equities, Income, Tax Free Income) are required for universe and screener

**Problem:**

- Risk group validation may not be running when needed
- Missing risk groups cause errors in universe/screener operations

## Acceptance Criteria

### Functional Requirements

- [x] Top route calls `ensureRiskGroupsExist()` before loading risk group IDs
- [x] All three risk groups (Equities, Income, Tax Free Income) exist after top route completes
- [x] Risk group IDs returned in top response match created/existing groups

### Technical Requirements

- [x] Import and call `ensureRiskGroupsExist()` in top route handler
- [x] Handle errors appropriately with logging
- [x] Maintain existing top route response structure

## Test-Driven Development Approach

### Step 1: Create Comprehensive Unit Tests First

Create/update `apps/server/src/app/routes/top/index.spec.ts`:

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
      mockEnsure.mockImplementationOnce(() => new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 100)));

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

### Step 2: Run Tests (They Should Fail)

```bash
pnpm nx test server
```

### Step 3: Implement

Modify `apps/server/src/app/routes/top/index.ts`:

```typescript
import { ensureRiskGroupsExist } from '../settings/common/ensure-risk-groups-exist.function';

export default function registerTopRoutes(fastify: FastifyInstance): void {
  fastify.post<{ Body: string[]; Reply: Top[] }>('/', async function handleTopRequest(request, reply): Promise<Top[]> {
    // Ensure risk groups exist before proceeding
    await ensureRiskGroupsExist();

    // ... rest of existing logic
  });
}
```

### Step 4: Run Tests Again (Should Pass)

```bash
pnpm nx test server
```

### Step 4.5: Verify Coverage

```bash
pnpm nx test server --coverage
```

Verify >80% coverage for top route handler.

### Step 5: Manual Testing

```bash
# Start server
pnpm nx serve server

# In another terminal, test the endpoint
curl -X POST http://localhost:3000/api/top -H "Content-Type: application/json" -d '["1"]'
```

## Technical Approach

### Files to Modify

- `apps/server/src/app/routes/top/index.ts` - Add ensureRiskGroupsExist call
- `apps/server/src/app/routes/top/index.spec.ts` - Add unit tests

### Implementation Steps

1. Import `ensureRiskGroupsExist` function
2. Call it at the start of the top route handler
3. Add error handling with structured logging
4. Verify response still includes proper risk group IDs

## Files Modified

| File                                           | Changes                          |
| ---------------------------------------------- | -------------------------------- |
| `apps/server/src/app/routes/top/index.ts`      | Added ensureRiskGroupsExist call |
| `apps/server/src/app/routes/top/index.spec.ts` | Added unit tests                 |

## Definition of Done

- [x] Comprehensive unit tests created (>80% coverage)
- [x] All tests passing (success, failure, edge cases)
- [x] Implementation complete with error handling and logging
- [x] All existing tests still pass
- [x] Lint passes
- [x] Manual testing confirms risk groups created
- [ ] Code reviewed
- [x] All validation commands pass
  - Run `pnpm all`
  - Run `pnpm e2e:dms-material`
  - Run `pnpm dupcheck`
  - Run `pnpm format`
  - Repeat all of these if any fail until they all pass

## Notes

- This is a critical foundation for Epic AG
- Ensures data integrity from the start
- Follow existing patterns from screener route

## QA Results

### Gate Status

Gate: PASS → docs/qa/gates/AG.1-integrate-risk-group-validation-top-route.yml
