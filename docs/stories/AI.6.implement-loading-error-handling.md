# Story AI.6: Implement Loading and Error Handling

## Story

**As a** user
**I want** to see loading indicators and error messages
**So that** I understand the refresh status

## Context

**Implementation Goal:**

- Add loading spinner
- Add error display
- Add success notifications
- Enable tests from AI.5

## Acceptance Criteria

### Functional Requirements

- [ ] Loading spinner shows during refresh
- [ ] Error messages display on failure
- [ ] Success notification on completion
- [ ] Retry button on errors
- [ ] **CRITICAL** All tests from AI.5 passing

### Technical Requirements

- [ ] Use Material spinner
- [ ] Use NotificationService
- [ ] Reactive template updates
- [ ] Proper signal binding

## Test-Driven Development Approach

### Step 1: Enable Tests

Remove `.skip` from AI.5 tests.

### Step 2: Implement

Update component:

```typescript
export class UniverseComponent {
  private readonly notificationService = inject(NotificationService);

  onRefresh(): void {
    this.screenerService.refresh().subscribe({
      next: () => {
        this.notificationService.success('Universe data refreshed successfully');
        this.refreshUniverseData();
      },
      error: () => {
        // Error already set by service
      },
    });
  }
}
```

Update template:

```html
@if (loading()) {
<div class="loading-overlay">
  <mat-progress-spinner mode="indeterminate"></mat-progress-spinner>
  <p>Refreshing universe data...</p>
</div>
} @if (error()) {
<mat-card class="error-card" data-testid="error-message">
  <mat-card-content>
    <mat-icon color="warn">error</mat-icon>
    <p>{{ error() }}</p>
    <button mat-button data-testid="retry-button" (click)="onRefresh()">Retry</button>
  </mat-card-content>
</mat-card>
}
```

### Step 3: Run Tests

```bash
pnpm nx test dms-material
```

## Definition of Done

- [ ] Loading states implemented
- [ ] Error handling implemented
- [ ] All tests passing
- [ ] Manual testing complete
