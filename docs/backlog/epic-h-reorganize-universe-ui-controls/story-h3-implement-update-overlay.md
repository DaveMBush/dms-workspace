# Story H3: Implement Translucent Overlay for Update Operations

## Summary
Add a translucent overlay to the Universe screen during "Update Fields" and "Update Universe" operations, similar to the overlay used in the Screener refresh functionality.

## Acceptance Criteria
- [ ] Add overlay signal to track loading state
- [ ] Show overlay during "Update Fields" operation
- [ ] Show overlay during "Update Universe" operation
- [ ] Use same overlay styling as Screener screen
- [ ] Include loading spinner and appropriate text
- [ ] Overlay covers entire Universe screen content
- [ ] Proper accessibility attributes for overlay
- [ ] Hide overlay when operations complete or error

## Technical Details
### Files to Modify
- `apps/rms/src/app/global/global-universe/global-universe.component.html`
- `apps/rms/src/app/global/global-universe/global-universe.component.ts`

### Implementation Notes
- Add `showOverlay$` signal similar to Screener component
- Set overlay to true when starting update operations
- Set overlay to false when operations complete
- Use same overlay HTML structure as Screener:
  ```html
  @if (showOverlay$()) {
    <div class="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div class="text-center" role="status" aria-live="polite">
        <p-progressSpinner />
        <p class="mt-4 text-white font-medium">Updating...</p>
      </div>
    </div>
  }
  ```

### Overlay Text Options
- "Update Fields" operation: "Updating field information..."
- "Update Universe" operation: "Updating universe from screener..."

### Error Handling
- Hide overlay on operation error
- Ensure overlay doesn't remain stuck if operation fails
- Include proper cleanup in error handlers

## Definition of Done
- Overlay appears during both update operations
- Overlay uses consistent styling with Screener
- Proper loading text displayed
- Overlay hides on completion/error
- Accessibility requirements met
- No overlay stuck states
- Code review completed