# Universe Update User Journeys

This document outlines the user journeys for updating the universe data in the RMS application, covering both manual updates and screener-based updates.

## Journey 1: Manual Universe Update Flow

### Overview
When the "Use Screener for Universe" feature flag is **disabled**, users can manually update the universe by entering stock symbols in text areas.

### User Journey Steps

1. **Entry Point**: User clicks "Universe Settings" button in the application
2. **Dialog Opens**: Universe Settings dialog appears with manual input fields
3. **Input Phase**:
   - Dialog displays three text areas: "Equity", "Income", "Tax Free Income"
   - User can enter stock symbols (one per line) in any or all text areas
   - Auto-focus is set on the "Equity" text area for immediate input
4. **Action Phase**:
   - User has two action options:
     - **Update Fields**: Updates just the metadata/fields
     - **Update Universe**: Updates the universe with entered symbols
   - "Update Universe" button is disabled if all text areas are empty
5. **Loading State**:
   - Loading spinner overlay appears on the dialog
   - "Update Universe" button shows loading state
   - User cannot interact with form during processing
6. **Success State**:
   - Dialog automatically closes
   - User returns to main application view
   - Changes are reflected in the universe data
7. **Error State**:
   - Loading state clears
   - User remains in dialog
   - Error message is displayed (implementation needed)

### Key Behaviors
- **Validation**: "Update Universe" disabled when no symbols entered
- **Focus Management**: Auto-focus on equity symbols textarea when dialog opens
- **Loading Feedback**: Clear visual indication during processing
- **Modal Behavior**: Dialog blocks interaction with main application

## Journey 2: "Use Screener" Update Flow

### Overview
When the "Use Screener for Universe" feature flag is **enabled**, users can update the universe automatically from an external screener service.

### User Journey Steps

1. **Entry Point**: User clicks "Universe Settings" button in the application
2. **Dialog Opens**: Universe Settings dialog appears in screener mode
3. **Simplified Interface**:
   - Manual input fields are hidden
   - Only action buttons are available
4. **Action Phase**:
   - User has two action options:
     - **Update Fields**: Updates just the metadata/fields
     - **Update Universe**: Syncs universe from screener service
   - "Update Universe" button shows "Use Screener" functionality
5. **Loading State**:
   - "Update Universe" button shows loading spinner and becomes disabled
   - Button text may change to indicate syncing status
   - User cannot trigger sync while one is in progress
6. **Success State**:
   - Success toast notification appears with sync summary
   - Shows detailed results: "X inserted, Y updated, Z expired"
   - Dialog automatically closes
   - User returns to main application view
7. **Error State**:
   - Error toast notification appears
   - Message: "Failed to update universe from Screener. Please try again."
   - Dialog remains open for user to retry
   - Loading state clears

### Key Behaviors
- **Automatic Data**: No manual input required
- **Rich Feedback**: Detailed success/error messages via toast notifications
- **Retry Capability**: User can retry failed operations
- **Non-blocking Errors**: Errors don't close the dialog

## Common Elements

### Cancel Action
- Available in both flows
- Closes dialog without saving changes
- Returns user to main application

### Update Fields Action
- Available in both flows
- Updates metadata/field information
- Shows loading state during processing
- Closes dialog on success

## User Experience Considerations

### Accessibility
- Proper ARIA labels on all form controls
- Keyboard navigation support
- Screen reader friendly error messages
- Focus management (auto-focus, focus trapping)

### Loading States
- Clear visual feedback during all operations
- Disabled states prevent multiple submissions
- Loading indicators are consistent across flows

### Error Handling
- User-friendly error messages
- Clear recovery paths (retry options)
- Consistent error presentation

### Mobile Responsiveness
- Dialog adapts to smaller screen sizes
- Touch-friendly button sizes
- Readable text in all viewports

## Technical Implementation Notes

### State Management
- Loading states managed via component properties and services
- Sync service tracks operation status via signals
- Feature flag determines which UI mode to display

### Error Boundaries
- HTTP errors handled at service level
- UI errors handled at component level
- Toast notifications for user-facing messages

### Performance
- Lazy loading of dialog content
- Efficient form validation
- Minimal re-renders during state changes