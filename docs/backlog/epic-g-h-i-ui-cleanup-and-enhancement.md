# Epics G, H, I: UI Cleanup and Enhancement

## Overview
This document outlines three interconnected epics (G, H, I) that will clean up and enhance the Universe screen interface after the successful implementation of the screener sync functionality.

## Epic Sequence
These epics should be implemented in order due to their dependencies:

### Epic G → Epic H → Epic I

## Epic Summaries

### [Epic G: Remove Sync Feature Flag](./epic-g-remove-sync-feature-flag/index.md)
**Priority**: High  
**Dependencies**: Epic F (sync functionality) must be complete

Remove the feature flag for sync functionality now that it's stable and working correctly.

**Key Changes**:
- Remove `useScreenerForUniverse` feature flag
- Simplify Universe Settings modal to always show sync functionality
- Clean up conditional rendering logic

**Stories**:
- G1: Remove feature flag from frontend components
- G2: Update backend feature flag endpoint
- G3: Clean up feature flag service

---

### [Epic H: Reorganize Universe Screen UI Controls](./epic-h-reorganize-universe-ui-controls/index.md)
**Priority**: High  
**Dependencies**: Epic G must be complete

Move update controls from the modal to the main Universe screen for better UX.

**Key Changes**:
- Move "Update Fields" button to Universe title bar as icon
- Move "Update Universe" button to Universe title bar as sync icon
- Add translucent overlay during operations
- Remove Universe Settings modal entirely

**Stories**:
- H1: Add "Update Fields" icon to Universe title bar
- H2: Add "Update Universe" sync icon to Universe title bar
- H3: Implement translucent overlay for update operations
- H4: Remove Universe Settings modal

---

### [Epic I: Clean Up Unused Code](./epic-i-cleanup-unused-code/index.md)
**Priority**: Medium  
**Dependencies**: Epics G and H must be complete

Clean up all unused code resulting from the previous changes.

**Key Changes**:
- Remove unused imports and dependencies
- Clean up unused service methods
- Remove dead code paths
- Update documentation

**Stories**:
- I1: Remove unused imports and dependencies
- I2: Clean up unused service methods and properties
- I3: Remove dead code and unused utilities
- I4: Update documentation and type definitions

## Implementation Strategy

### Phase 1: Feature Flag Removal (Epic G)
Focus on safely removing the feature flag infrastructure while preserving all functionality.

### Phase 2: UI Reorganization (Epic H)
Move update controls to the main screen and improve user experience with better visual feedback.

### Phase 3: Code Cleanup (Epic I)
Perform comprehensive cleanup to ensure maintainable, optimized code.

## Success Criteria

### User Experience
- [ ] Update functions easily accessible from Universe screen
- [ ] Clear visual feedback during operations
- [ ] Consistent UI patterns across the application
- [ ] Improved discoverability of update functions

### Technical Quality
- [ ] No feature flag complexity
- [ ] Clean, maintainable codebase
- [ ] Optimized bundle size
- [ ] Comprehensive test coverage
- [ ] Updated documentation

### Functional Requirements
- [ ] All existing functionality preserved
- [ ] No regressions in sync operations
- [ ] Proper error handling maintained
- [ ] Accessibility requirements met

## Risk Mitigation

### Testing Strategy
- Thorough testing at each epic completion
- User acceptance testing for UI changes
- Regression testing for all sync functionality
- Performance testing to ensure no degradation

### Rollback Plan
- Each epic should be completable independently
- Feature toggles for Epic H if needed during development
- Database backups before any changes
- Incremental deployment strategy

## Timeline Estimation

- **Epic G**: 1-2 days (low complexity, high impact)
- **Epic H**: 3-4 days (medium complexity, high impact)  
- **Epic I**: 1-2 days (low complexity, maintenance)

**Total Estimated Duration**: 5-8 days

## Definition of Done

All three epics completed successfully with:
- ✅ All acceptance criteria met
- ✅ All tests passing
- ✅ Code reviews completed
- ✅ Documentation updated
- ✅ User experience validated
- ✅ No regressions identified