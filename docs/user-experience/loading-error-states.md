# Loading and Error States Design System

This document defines consistent loading and error states across the RMS application, with focus on universe update operations.

## Loading States

### Visual Design Principles

- **Immediate Feedback**: Loading states should appear within 200ms of user action
- **Progress Indication**: Show determinate progress when possible, indeterminate otherwise
- **Context Preservation**: Keep context visible during loading
- **Accessibility**: Loading states must be announced to screen readers

### Loading State Types

#### 1. Button Loading States

```typescript
// Implementation pattern
<p-button
  [loading]="isLoading()"
  [disabled]="isLoading()"
  label="Update Universe">
</p-button>
```

**Visual Behavior:**

- Button shows spinner icon instead of text
- Button becomes disabled (non-interactive)
- Button maintains original size and position
- Spinner uses consistent animation timing (0.7s duration)

**Use Cases:**

- "Update Universe" operations
- "Update Fields" operations
- Any single-action operations

#### 2. Modal Overlay Loading States

```html
@if (loading) {
<div class="modal-spinner-overlay">
  <p-progressSpinner styleClass="modal-spinner" strokeWidth="4" animationDuration=".7s" />
</div>
}
```

**Visual Behavior:**

- Semi-transparent overlay covers entire dialog
- Centered spinner with consistent styling
- Prevents all user interaction with form
- Maintains dialog size and position

**Use Cases:**

- Complex form submissions
- Multi-step operations
- When entire form needs to be locked

#### 3. Inline Loading States

```html
<div class="loading-container">
  <p-progressSpinner [style]="{'width': '20px', 'height': '20px'}" />
  <span>Syncing from screener...</span>
</div>
```

**Visual Behavior:**

- Small spinner next to descriptive text
- Doesn't block surrounding content
- Used for status updates

**Use Cases:**

- Status indicators
- Background operations
- Non-blocking updates

### Loading State Guidelines

#### Duration

- **Short Operations (< 2s)**: Button loading state only
- **Medium Operations (2-10s)**: Modal overlay with spinner
- **Long Operations (> 10s)**: Progress indicator with percentage if possible

#### Messaging

- **Button Loading**: No additional text needed (loading state is visual)
- **Modal Loading**: Optional descriptive text below spinner
- **Error Recovery**: Clear loading state immediately on error

#### Animation Standards

- **Spinner Duration**: 0.7 seconds per rotation
- **Stroke Width**: 4px for modal spinners, 2px for inline
- **Color**: Primary theme color (#007bff or equivalent)

## Error States

### Error Messaging Principles

- **User-Friendly Language**: Avoid technical jargon
- **Actionable**: Provide clear next steps
- **Contextual**: Explain what went wrong and why
- **Consistent Tone**: Professional but helpful

### Error State Types

#### 1. Toast Notifications (Non-blocking)

```typescript
// Success toast
this.messageService.add({
  severity: 'success',
  summary: 'Universe Updated',
  detail: `Successfully updated universe from Screener. ${summary.inserted} inserted, ${summary.updated} updated, ${summary.markedExpired} expired.`,
});

// Error toast
this.messageService.add({
  severity: 'error',
  summary: 'Update Failed',
  detail: 'Failed to update universe from Screener. Please try again.',
});
```

**Visual Behavior:**

- Appears in top-right corner
- Auto-dismisses after 5 seconds
- Can be manually dismissed
- Stacks multiple notifications

**Use Cases:**

- Network failures
- Server errors
- Success confirmations
- Background operation status

#### 2. Form Validation Errors

```html
<div class="field-error" role="alert">
  <i class="pi pi-exclamation-triangle"></i>
  <span>At least one symbol category is required</span>
</div>
```

**Visual Behavior:**

- Red text with warning icon
- Appears below relevant form field
- Persistent until resolved
- Announced to screen readers

**Use Cases:**

- Input validation
- Required field violations
- Format errors

#### 3. Dialog Error States

```html
<div class="dialog-error" role="alert">
  <p-message severity="error" text="Unable to connect to server. Please check your connection and try again."></p-message>
</div>
```

**Visual Behavior:**

- Error message component at top of dialog
- Remains visible until resolved or dialog closed
- Does not auto-dismiss

**Use Cases:**

- Critical operation failures
- Connection issues
- Authentication problems

### Error Message Guidelines

#### Messaging Patterns

**Network Errors:**

- Primary: "Connection Error"
- Detail: "Unable to connect to server. Please check your connection and try again."

**Server Errors:**

- Primary: "Server Error"
- Detail: "Something went wrong on our end. Please try again in a few moments."

**Validation Errors:**

- Primary: Field name (e.g., "Equity Symbols")
- Detail: Specific issue (e.g., "At least one symbol is required")

**Operation-Specific Errors:**

- Primary: Operation name (e.g., "Universe Update Failed")
- Detail: Context and next steps (e.g., "Failed to update universe from Screener. Please try again.")

#### Error Recovery

**Automatic Retry:**

- Not implemented by default
- Consider for network timeouts only

**Manual Retry:**

- Always provide retry option
- Clear error state before retry attempt
- Maintain form data when possible

**Alternative Actions:**

- Offer alternative paths when available
- Example: "Try manual update instead"

## Accessibility Requirements

### Screen Reader Support

- All loading states must be announced
- Error messages must have `role="alert"`
- Status changes must be communicated

### Keyboard Navigation

- Loading states don't affect tab order
- Error states are keyboard accessible
- Focus management during state changes

### ARIA Labels

```html
<!-- Loading button -->
<p-button [attr.aria-label]="isLoading() ? 'Updating universe, please wait' : 'Update universe'" [loading]="isLoading()"> </p-button>

<!-- Error message -->
<div role="alert" aria-live="polite">Error message content</div>
```

## Implementation Standards

### State Management

```typescript
// Loading state
readonly isLoading = signal<boolean>(false);

// Error state
readonly error = signal<string | null>(null);

// Clear error on new operation
startOperation(): void {
  this.error.set(null);
  this.isLoading.set(true);
}
```

### Error Handling Pattern

```typescript
operation$.subscribe({
  next: (result) => {
    // Handle success
    this.isLoading.set(false);
  },
  error: (error) => {
    // Handle error
    this.isLoading.set(false);
    this.error.set(this.getErrorMessage(error));
  },
});
```

### Testing Requirements

- Test loading states appear/disappear correctly
- Test error messages are displayed
- Test accessibility attributes are present
- Test keyboard navigation during states
- Test screen reader announcements

## Design Tokens

### Colors

- **Loading Spinner**: `var(--primary-color)`
- **Success**: `#28a745`
- **Error**: `#dc3545`
- **Warning**: `#ffc107`

### Timing

- **Spinner Animation**: 0.7s linear infinite
- **Toast Duration**: 5000ms
- **Error Persistence**: Until resolved or dismissed

### Typography

- **Error Text**: 14px, medium weight
- **Success Text**: 14px, normal weight
- **Helper Text**: 12px, normal weight
