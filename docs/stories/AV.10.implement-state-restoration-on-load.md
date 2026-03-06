# Story AV.10: Restore State on App Load - TDD GREEN Phase

## Story

**As a** user
**I want** all my UI selections to be restored when I refresh the page
**So that** I can continue where I left off

## Context

**Current System:**

- Individual persistence features implemented (AV.2-AV.8)
- Individual components handle their own state restoration
- Unit tests written in Story AV.9 (currently disabled)

**Implementation Approach:**

- Re-enable unit tests from AV.9
- Ensure proper initialization order of components
- Verify complete state restoration flow
- Make all tests pass (GREEN phase)

## Acceptance Criteria

### Functional Requirements

- [ ] Global tab selection restored first
- [ ] Account selection restored next
- [ ] Account tab selection restored last (for selected account)
- [ ] Graceful handling when no saved state exists
- [ ] Graceful handling of partial saved state
- [ ] Complete restoration verified working
- [ ] All unit tests from AV.9 re-enabled and passing

### Technical Requirements

- [ ] Component initialization order correct
- [ ] No race conditions in state restoration
- [ ] Error handling for invalid saved state
- [ ] State restoration completes before UI interaction enabled

## Implementation Details

### Step 1: Re-enable Unit Tests

Remove `x` prefix or `.skip` from tests written in AV.9.

### Step 2: Verify Initialization Order

Ensure components initialize in correct order:
1. App component initializes
2. Global tabs component restores tab selection
3. Account component restores account selection
4. Account detail component restores tab for selected account

### Step 3: Add Integration Test

```typescript
describe('State Restoration Integration', () => {
  it('should restore complete UI state on app load', () => {
    // Setup: Save complete state
    statePersistence.saveState('global-tab-selection', 1); // Account tab
    statePersistence.saveState('selected-account-id', 'account-123');
    statePersistence.saveState('account-tab-account-123', 2); // Holdings tab
    
    // Act: Initialize app
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    
    // Assert: Verify all state restored
    expect(globalTabsComponent.selectedIndex()).toBe(1);
    expect(accountComponent.selectedAccountId()).toBe('account-123');
    expect(accountDetailComponent.selectedTabIndex()).toBe(2);
  });
});
```

### Step 4: Verify All Tests Pass

```bash
pnpm test:dms-material
```

## Definition of Done

- [ ] All unit tests from AV.9 re-enabled and passing
- [ ] Complete state restoration working
- [ ] Proper initialization order verified
- [ ] All validation commands pass:
  - [ ] Run `pnpm all`
  - [ ] Run `pnpm e2e:dms-material:chromium`
  - [ ] Run `pnpm e2e:dms-material:firefox`
  - [ ] Run `pnpm dupcheck`
  - [ ] Run `pnpm format`
  - [ ] Repeat all of these if any fail until they all pass
- [ ] Code reviewed and approved

## Related Stories

- **Previous**: Story AV.9 (TDD Tests)
- **Next**: Story AV.11 (Bug Fix)
- **Epic**: Epic AV

---

## Dev Agent Record

### Status

Not Started
