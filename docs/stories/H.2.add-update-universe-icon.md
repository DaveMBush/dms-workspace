# Story H2: Add "Update Universe" Sync Icon to Universe Title Bar

## Summary

Add an "Update Universe" sync icon to the Universe screen title bar that triggers the same screener sync functionality as the current "Update Universe" button in the Universe Settings modal.

## Acceptance Criteria

- [ ] Add "Update Universe" sync icon to Universe title bar in the `#end` template section
- [ ] Position icon to the left of the "Update Fields" icon
- [ ] Use sync icon (`pi-sync`)
- [ ] Add tooltip with text "Update Universe"
- [ ] Wire up click handler to call screener sync endpoint
- [ ] Include proper accessibility attributes
- [ ] Follow existing button styling patterns
- [ ] Add loading state handling
- [ ] Integrate with existing sync service

## Technical Details

### Files to Modify

- `apps/dms/src/app/global/global-universe/global-universe.component.html`
- `apps/dms/src/app/global/global-universe/global-universe.component.ts`

### Implementation Notes

- Import and inject `UniverseSyncService`
- Add method to handle universe sync operation
- Use `p-button` with `icon="pi-sync"`
- Include `pTooltip` directive with "Update Universe"
- Use existing sync service and patterns from Universe Settings modal
- Handle success/error states appropriately
- Add toast notifications for feedback

### Service Integration

- Use existing `UniverseSyncService.syncFromScreener()` method
- Handle observable subscription properly
- Use same success/error handling as current modal implementation
- Show appropriate user feedback

## Definition of Done

- Sync icon appears in Universe title bar
- Tooltip shows "Update Universe"
- Clicking icon triggers universe sync from screener
- Loading state properly handled
- Success/error feedback provided
- No visual regressions
- Accessibility verified
- Code review completed
