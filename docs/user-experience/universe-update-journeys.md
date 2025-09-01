# Universe Update User Journeys

This document outlines the user journeys for updating the universe data in the RMS application using the new icon-based controls in the Universe toolbar.

## Overview

As of Epic H, universe updates are managed directly from the Universe screen through dedicated icon buttons in the toolbar. The previous modal-based Universe Settings dialog has been removed in favor of a streamlined, direct-action approach.

## Journey 1: Update Fields Flow

### Overview

Users can update individual fields in the universe using the dedicated Update Fields icon button.

### User Journey Steps

1. **Entry Point**: User navigates to the Universe screen
2. **Icon Discovery**: User sees Update Fields icon (`pi-refresh`) in the Universe title bar
3. **Action Trigger**: User clicks the Update Fields icon
4. **Loading State**:
   - Icon shows loading indicator
   - User cannot trigger another operation while processing
   - Other icons remain available for different operations
5. **Success State**:
   - Loading indicator clears
   - Universe fields are refreshed with latest data
   - Changes are immediately visible in the universe display
6. **Error State**:
   - Loading indicator clears
   - Error toast notification appears
   - User can retry the operation

### Key Behaviors

- **Direct Action**: No dialog or modal required
- **Immediate Feedback**: Loading states and results are instantly visible
- **Non-blocking**: User can continue using the application during processing
- **Retry Friendly**: Failed operations can be immediately retried

## Journey 2: Update Universe Flow

### Overview

Users can perform a full universe synchronization using the dedicated Update Universe icon button.

### User Journey Steps

1. **Entry Point**: User navigates to the Universe screen
2. **Icon Discovery**: User sees Update Universe icon (`pi-sync`) in the Universe title bar
3. **Action Trigger**: User clicks the Update Universe icon
4. **Loading State**:
   - Icon shows loading spinner
   - Icon becomes disabled during processing
   - Update cannot be triggered while sync is in progress
5. **Success State**:
   - Success toast notification appears with sync summary
   - Shows detailed results: "X inserted, Y updated, Z expired"
   - Loading state clears
   - Universe data reflects latest screener information
6. **Error State**:
   - Error toast notification appears
   - Message: "Failed to update universe from Screener. Please try again."
   - Loading state clears
   - User can retry the operation

### Key Behaviors

- **Automatic Sync**: Universe data is synchronized from screener service
- **Rich Feedback**: Detailed success/error messages via toast notifications
- **Progress Indication**: Clear visual feedback during processing
- **Always Available**: No feature flag configuration required

## Common Elements

### Icon-Based Interface

- Both update operations are accessible via dedicated icons in the Universe toolbar
- Icons provide immediate visual recognition of functionality
- No modals or dialogs interrupt the user workflow

### Loading States

- Each icon shows individual loading indicators during processing
- Operations are clearly isolated - one loading doesn't affect the other
- Users can identify which specific operation is in progress

## User Experience Considerations

### Accessibility

- Proper ARIA labels on all icon buttons
- Keyboard navigation support for toolbar icons
- Screen reader friendly button descriptions
- Focus management for icon interactions

### Loading States

- Clear visual feedback on individual icons during operations
- Disabled states prevent multiple concurrent operations
- Loading indicators are consistent across both update types

### Error Handling

- User-friendly error messages via toast notifications
- Clear recovery paths (immediate retry capability)
- Consistent error presentation across both operations

### Mobile Responsiveness

- Touch-friendly icon sizes in toolbar
- Icons remain accessible on all screen sizes
- Toast notifications adapt to mobile viewports

## Technical Implementation Notes

### State Management

- Loading states managed via component properties and services
- Sync service tracks operation status via signals
- No feature flag dependency - universe sync is always enabled

### Error Boundaries

- HTTP errors handled at service level
- UI errors handled at component level
- Toast notifications for user-facing messages

### Performance

- Minimal DOM updates for icon state changes
- Efficient service calls for universe operations
- Optimized rendering during loading states

## Benefits of the New Approach

### Simplified User Experience

- **No Modals**: Users can trigger updates without interrupting their workflow
- **Direct Access**: Icon-based controls provide immediate access to functionality
- **Visual Clarity**: Clear separation between different update operations

### Improved Performance

- **Reduced DOM Complexity**: No modal rendering overhead
- **Faster Interactions**: Direct action triggers without dialog setup
- **Better Mobile Experience**: Touch-friendly icons work better than modal dialogs

### Enhanced Discoverability

- **Always Visible**: Update controls are always available in the toolbar
- **Intuitive Icons**: `pi-refresh` and `pi-sync` clearly communicate their purpose
- **Consistent Location**: Users always know where to find update controls
