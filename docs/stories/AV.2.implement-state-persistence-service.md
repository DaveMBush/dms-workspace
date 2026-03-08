# Story AV.2: Implement State Persistence Service - TDD GREEN Phase

## Story

**As a** user
**I want** my UI state to be persisted
**So that** my selections are maintained across page refreshes

## Context

**Current System:**

- UI state is lost on page refresh
- Unit tests written in Story AV.1 (currently disabled)

**Implementation Approach:**

- Re-enable unit tests from AV.1
- Create StatePersistenceService
- Implement localStorage operations
- Make all tests pass (GREEN phase)

## Acceptance Criteria

### Functional Requirements

- [ ] Service saves state to localStorage
- [ ] Service loads state from localStorage
- [ ] Service clears state from localStorage
- [ ] Service handles missing/corrupted data gracefully
- [ ] Service returns default state when no saved state exists
- [ ] All unit tests from AV.1 re-enabled and passing

### Technical Requirements

- [ ] Service is injectable
- [ ] Proper error handling for localStorage operations
- [ ] State properly serialized/deserialized
- [ ] Service follows Angular patterns

## Implementation Details

### Step 1: Re-enable Unit Tests

Remove `x` prefix or `.skip` from tests written in AV.1.

### Step 2: Create StatePersistenceService

```typescript
@Injectable({
  providedIn: 'root',
})
export class StatePersistenceService {
  private readonly STORAGE_KEY = 'dms-ui-state';

  saveState(key: string, value: any): void {
    try {
      const state = this.loadAllState();
      state[key] = value;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save state:', error);
    }
  }

  loadState<T>(key: string, defaultValue: T): T {
    try {
      const state = this.loadAllState();
      return state[key] !== undefined ? state[key] : defaultValue;
    } catch (error) {
      console.error('Failed to load state:', error);
      return defaultValue;
    }
  }

  clearState(key?: string): void {
    try {
      if (key) {
        const state = this.loadAllState();
        delete state[key];
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
      } else {
        localStorage.removeItem(this.STORAGE_KEY);
      }
    } catch (error) {
      console.error('Failed to clear state:', error);
    }
  }

  private loadAllState(): Record<string, any> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Failed to parse state:', error);
      return {};
    }
  }
}
```

### Step 3: Verify All Tests Pass

```bash
pnpm test:dms-material
```

## Definition of Done

- [ ] All unit tests from AV.1 re-enabled and passing
- [ ] Service properly implemented
- [ ] Error handling in place
- [ ] All validation commands pass:
  - [ ] Run `pnpm all`
  - [ ] Run `pnpm e2e:dms-material:chromium`
  - [ ] Run `pnpm e2e:dms-material:firefox`
  - [ ] Run `pnpm dupcheck`
  - [ ] Run `pnpm format`
  - [ ] Repeat all of these if any fail until they all pass
- [ ] Code reviewed and approved

## Notes

- This is the TDD GREEN phase
- All tests from AV.1 should now pass
- Service will be used by subsequent stories

## Related Stories

- **Previous**: Story AV.1 (TDD Tests)
- **Next**: Story AV.3 (TDD for global tab selection)
- **Epic**: Epic AV

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Status

Ready for Review

### Tasks / Subtasks

- [x] Re-enable all 19 skipped unit tests from AV.1
- [x] Implement StatePersistenceService with saveState, loadState, clearState
- [x] Implement loadAllState and removeKey private helpers
- [x] Fix lint errors (strict-boolean-expressions, max-depth, naming-convention)
- [x] All 23 unit tests passing
- [x] Validation: pnpm all passes
- [x] Validation: Chromium E2E passes (640 tests)
- [x] Validation: Firefox E2E passes (640 tests)
- [x] Validation: dupcheck passes (0 clones)
- [x] Validation: format passes

### Debug Log References

### File List

- apps/dms-material/src/app/shared/services/state-persistence.service.ts (modified - implemented service)
- apps/dms-material/src/app/shared/services/state-persistence.service.spec.ts (modified - unskipped all tests)

### Change Log

- Implemented StatePersistenceService with localStorage-backed state persistence
- Added saveState, loadState, clearState public methods
- Added loadAllState, removeKey private helpers
- Re-enabled all 19 previously skipped unit tests

### Completion Notes
