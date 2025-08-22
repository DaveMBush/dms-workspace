# Story G2: Update Backend Feature Flag Endpoint

## Summary
Update or remove the backend feature flag endpoint since the sync feature flag is no longer needed.

## Acceptance Criteria
- [ ] Determine if feature flag endpoint should be removed or return static values
- [ ] Update `/api/feature-flags` endpoint implementation
- [ ] Ensure backward compatibility during transition
- [ ] Update API documentation if applicable
- [ ] Remove or update related backend tests

## Technical Details
### Files to Modify
- Server route handling `/api/feature-flags`
- Related backend test files
- API documentation

### Implementation Options
1. **Remove endpoint entirely** - if no other feature flags exist
2. **Return static response** - always return `{ useScreenerForUniverse: true }`
3. **Keep for future flags** - maintain infrastructure for future feature flags

### Recommended Approach
Return static response to maintain API contract while removing the dynamic flag logic.

## Definition of Done
- Backend endpoint updated appropriately
- No breaking changes to API contract
- All backend tests updated and passing
- Documentation updated if necessary
- Code review completed