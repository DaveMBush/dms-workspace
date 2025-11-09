# Story I2: Clean Up Unused Service Methods and Properties

## Summary

Clean up unused methods, properties, and service logic that is no longer needed after feature flag removal and UI reorganization.

## Acceptance Criteria

- [ ] Remove unused methods from remaining services
- [ ] Clean up unused properties and signals
- [ ] Remove unused service dependencies
- [ ] Simplify service interfaces where possible
- [ ] Remove unused observable subscriptions
- [ ] Clean up unused error handling methods
- [ ] Update service documentation if needed

## Technical Details

### Services to Review

- `UpdateUniverseSettingsService` - may have unused methods after modal removal
- `FeatureFlagsService` - may need simplification after flag removal
- `UniverseSyncService` - review for unused methods
- Any other services that were modified

### Common Cleanup Tasks

- Remove methods that were only used by removed components
- Clean up unused computed signals
- Remove unused error handling logic
- Simplify service constructors and dependencies
- Remove unused private methods
- Clean up unused constants and configuration

### Method Categories to Review

- **Unused public methods** - no longer called from components
- **Unused private methods** - helper methods no longer needed
- **Unused properties** - signals, observables, simple properties
- **Unused subscriptions** - cleanup subscription management
- **Unused error handlers** - specific error handling no longer needed

### Validation Process

1. Search codebase for method usage
2. Verify methods are not called from tests
3. Check for indirect usage through service injection
4. Ensure removal doesn't break interface contracts
5. Update service documentation

## Definition of Done

- All unused service methods removed
- No unused properties or signals remain
- Service interfaces simplified where appropriate
- All service dependencies optimized
- TypeScript compilation succeeds
- All tests pass
- Code review completed
