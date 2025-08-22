# Story H4: Remove Universe Settings Modal

## Summary
Remove the Universe Settings modal and all related components since the "Update Fields" and "Update Universe" functionality has been moved to the Universe title bar.

## Acceptance Criteria
- [ ] Remove settings icon from Universe title bar
- [ ] Remove Universe Settings modal component files
- [ ] Remove Universe Settings service
- [ ] Update Universe component to remove modal-related code
- [ ] Remove related imports and dependencies
- [ ] Clean up any unused services or utilities
- [ ] Remove modal-related tests
- [ ] Update any documentation references

## Technical Details
### Files to Remove
- `apps/rms/src/app/universe-settings/universe-settings.component.ts`
- `apps/rms/src/app/universe-settings/universe-settings.component.html`
- `apps/rms/src/app/universe-settings/universe-settings.component.scss`
- `apps/rms/src/app/universe-settings/universe-settings.service.ts`
- Related test files

### Files to Modify
- `apps/rms/src/app/global/global-universe/global-universe.component.html`
  - Remove settings button from title bar
  - Remove any references to settings service
- `apps/rms/src/app/global/global-universe/global-universe.component.ts`
  - Remove UniverseSettingsService injection
  - Clean up imports

### Services to Evaluate
- `UpdateUniverseSettingsService` - may need to be kept and renamed
- `UniverseSettingsService` - should be removed
- Check if any other components depend on these services

### Cleanup Checklist
- [ ] Remove all modal-related files
- [ ] Update Universe component imports
- [ ] Remove settings button from title bar
- [ ] Clean up service dependencies
- [ ] Remove related tests
- [ ] Update build configuration if needed
- [ ] Verify no broken imports remain

## Definition of Done
- All Universe Settings modal code removed
- No broken imports or references
- Universe screen functions without modal
- All tests pass
- No unused code remains
- Build succeeds without errors
- Code review completed