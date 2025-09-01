# Epic G: Remove Sync Feature Flag

## Summary

Remove the feature flag for sync functionality now that the screener-to-universe sync feature is stable and working correctly.

## Background

The `useScreenerForUniverse` feature flag was implemented to safely roll out the sync functionality. Now that the feature has been validated and is working correctly, the feature flag can be removed to simplify the codebase.

## Goals

- Remove feature flag infrastructure for sync functionality
- Simplify Universe Settings modal logic
- Clean up conditional rendering based on feature flag
- Ensure seamless transition to always-enabled sync functionality

## Acceptance Criteria

- [ ] Feature flag service no longer checks for `useScreenerForUniverse`
- [ ] Universe Settings modal no longer renders different UI based on feature flag
- [ ] Screener sync functionality is always available
- [ ] All feature flag conditional logic is removed
- [ ] Server endpoint for feature flags updated or removed
- [ ] No breaking changes to existing functionality

## Dependencies

- Epic F (sync functionality) must be complete and stable
- All previous epics (A-F) should be deployed and verified

## Stories

- [Story G1: Remove feature flag from frontend components](./story-g1-remove-frontend-feature-flag.md)
- [Story G2: Update backend feature flag endpoint](./story-g2-update-backend-feature-flag.md)
- [Story G3: Clean up feature flag service](./story-g3-cleanup-feature-flag-service.md)

## Definition of Done

- Feature flag is completely removed from codebase
- Universe Settings modal always shows sync functionality
- All tests pass
- No references to `useScreenerForUniverse` remain
- Code review completed
- Documentation updated
