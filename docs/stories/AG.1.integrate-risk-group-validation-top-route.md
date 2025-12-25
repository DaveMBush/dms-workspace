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

- [ ] Top route calls `ensureRiskGroupsExist()` before loading risk group IDs
- [ ] All three risk groups (Equities, Income, Tax Free Income) exist after top route completes
- [ ] Risk group IDs returned in top response match created/existing groups

### Technical Requirements

- [ ] Import and call `ensureRiskGroupsExist()` in top route handler
- [ ] Handle errors appropriately with logging
- [ ] Maintain existing top route response structure

## Test-Driven Development Approach

### Step 1: Create Unit Tests First

Create/update `apps/server/src/app/routes/top/index.spec.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Top Route Handler', () => {
  describe('POST /', () => {
    it('should call ensureRiskGroupsExist before loading data', async () => {
      // Test implementation
    });

    it('should return risk groups in response', async () => {
      // Test implementation
    });

    it('should handle ensureRiskGroupsExist failures gracefully', async () => {
      // Test implementation
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

- [ ] Unit tests created and passing
- [ ] Implementation complete
- [ ] All existing tests still pass
- [ ] Lint passes
- [ ] Manual testing confirms risk groups created
- [ ] Code reviewed
- [ ] All validation commands pass
  - Run `pnpm all`
  - Run `pnpm e2e:rms-material`
  - Run `pnpm dupcheck`
  - Run `pnpm format`
  - Repeat all of these if any fail until they all pass

## Notes

- This is a critical foundation for Epic AG
- Ensures data integrity from the start
- Follow existing patterns from screener route
