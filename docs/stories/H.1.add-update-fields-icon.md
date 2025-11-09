# Story H1: Add "Update Fields" Icon to Universe Title Bar

## Summary

Add an "Update Fields" icon to the Universe screen title bar that triggers the same functionality as the current "Update Fields" button in the Universe Settings modal.

## Acceptance Criteria

- [ ] Add "Update Fields" icon to Universe title bar in the `#end` template section
- [ ] Position icon to the left of the existing settings icon
- [ ] Use appropriate PrimeNG icon (e.g., `pi-database` or `pi-refresh`)
- [ ] Add tooltip with text "Update Fields"
- [ ] Wire up click handler to call the same endpoint as current modal button
- [ ] Include proper accessibility attributes
- [ ] Follow existing button styling patterns
- [ ] Add loading state handling

## Technical Details

### Files to Modify

- `apps/rms/src/app/global/global-universe/global-universe.component.html`
- `apps/rms/src/app/global/global-universe/global-universe.component.ts`

### Implementation Notes

- Import and inject `UpdateUniverseSettingsService` or equivalent service
- Add method to handle update fields operation
- Use `p-button` with `icon` attribute
- Include `pTooltip` directive
- Add loading state management
- Follow patterns from existing Screener refresh button

### Icon Options

- `pi-database` - represents data/field updates
- `pi-refresh` - general refresh concept
- `pi-sync` - synchronization concept
- `pi-wrench` - tool/utility concept

### Recommended Icon

`pi-database` to represent field/metadata updates

## Definition of Done

- Icon appears in Universe title bar
- Tooltip shows "Update Fields"
- Clicking icon triggers field update operation
- Loading state properly handled
- No visual regressions
- Accessibility verified
- Code review completed
