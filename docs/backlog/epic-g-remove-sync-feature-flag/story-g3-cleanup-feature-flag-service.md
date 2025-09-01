# Story G3: Clean Up Feature Flag Service

## Summary

Clean up the FeatureFlagsService to remove unused sync feature flag logic while maintaining service structure for potential future use.

## Acceptance Criteria

- [ ] Remove `isUseScreenerForUniverseEnabled` computed signal
- [ ] Simplify or remove feature flag HTTP resource
- [ ] Update service interface and methods
- [ ] Remove unused imports and dependencies
- [ ] Update service tests
- [ ] Consider keeping service shell for future feature flags

## Technical Details

### Files to Modify

- `apps/rms/src/app/shared/services/feature-flags.service.ts`
- Related test files
- Any other components that might inject this service

### Implementation Approach

1. **Option A: Remove service entirely** - if no future feature flags planned
2. **Option B: Keep service shell** - maintain basic structure for future flags
3. **Option C: Simplify to basic structure** - remove specific flag logic but keep framework

### Recommended Approach

Keep basic service structure but remove the specific sync feature flag logic to maintain infrastructure for future feature flags.

## Definition of Done

- Sync feature flag logic removed from service
- Service structure maintained for future use
- All references to removed methods updated
- Tests updated and passing
- No unused code remains
- Code review completed
