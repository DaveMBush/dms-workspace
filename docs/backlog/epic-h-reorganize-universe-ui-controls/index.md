# Epic H: Reorganize Universe Screen UI Controls

## Summary

Reorganize the Universe screen by moving "Update Fields" and "Update Universe" buttons from the Universe Settings modal to the Universe title bar as intuitive icons with tooltips and overlays.

## Background

Currently, universe update functionality is hidden behind a settings modal, making it less discoverable and requiring extra clicks. Moving these controls to the main Universe screen will improve user experience and workflow efficiency.

## Goals

- Move "Update Fields" button to Universe title bar as icon with tooltip
- Move "Update Universe" button to Universe title bar as sync icon with tooltip
- Add translucent overlay during update operations (similar to Screener refresh)
- Remove the Universe Settings modal entirely
- Improve discoverability and accessibility of update functions

## User Experience Improvements

- **Discoverability**: Update functions visible directly on main screen
- **Efficiency**: One-click access to update operations
- **Consistency**: Similar pattern to Screener screen refresh functionality
- **Visual Feedback**: Clear overlay indication during processing

## Acceptance Criteria

- [ ] "Update Fields" icon added to Universe title bar (left of settings icon)
- [ ] "Update Universe" sync icon added to Universe title bar (left of "Update Fields" icon)
- [ ] Both icons have descriptive tooltips
- [ ] Translucent overlay shown during update operations
- [ ] Universe Settings modal and related components removed
- [ ] All functionality preserved and working correctly
- [ ] Icons follow PrimeNG icon conventions
- [ ] Responsive design maintained
- [ ] Accessibility requirements met

## Dependencies

- Epic G (feature flag removal) should be completed first
- Current sync functionality must be stable

## Stories

- [Story H1: Add "Update Fields" icon to Universe title bar](./story-h1-add-update-fields-icon.md)
- [Story H2: Add "Update Universe" sync icon to Universe title bar](./story-h2-add-update-universe-icon.md)
- [Story H3: Implement translucent overlay for update operations](./story-h3-implement-update-overlay.md)
- [Story H4: Remove Universe Settings modal](./story-h4-remove-settings-modal.md)

## Definition of Done

- Universe title bar contains both update icons
- Icons have appropriate tooltips and functionality
- Overlay provides visual feedback during operations
- Settings modal completely removed
- All tests pass
- Accessibility verified
- Code review completed
- User experience validated
