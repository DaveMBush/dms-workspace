# Story G1: Remove Feature Flag from Frontend Components

## Summary
Remove all feature flag conditional logic from Universe Settings component and related frontend code.

## Acceptance Criteria
- [ ] Remove `isFeatureEnabled$` computed signal from UniverseSettingsComponent
- [ ] Remove conditional rendering in universe-settings.component.html
- [ ] Always show screener-based "Update Universe" button
- [ ] Remove manual input fields for equity/income/tax-free symbols
- [ ] Update component imports to remove unused dependencies
- [ ] Remove feature flag injection from component
- [ ] Update component tests to remove feature flag scenarios

## Technical Details
### Files to Modify
- `apps/rms/src/app/universe-settings/universe-settings.component.ts`
- `apps/rms/src/app/universe-settings/universe-settings.component.html`
- Related test files

### Implementation Notes
- Remove the `@if (!isFeatureEnabled$())` block containing manual input fields
- Always use the screener-based update functionality
- Simplify the footer template to only show screener-based "Update Universe" button
- Remove `featureFlagsService` injection
- Clean up unused accessibility methods related to manual entry

## Definition of Done
- Feature flag logic removed from Universe Settings component
- Component always renders screener-based interface
- All tests updated and passing
- No compilation errors
- Code review completed