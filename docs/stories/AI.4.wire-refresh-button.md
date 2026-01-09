# Story AI.4: Wire Refresh Button to Service

## Story

**As a** user
**I want** to click the refresh button to update universe data
**So that** I can get the latest CEF symbols

## Context

**Implementation Goal:**

- Wire refresh button to ScreenerService
- Enable and pass tests from AI.3

## Acceptance Criteria

### Functional Requirements

- [ ] Refresh button calls ScreenerService.refresh()
- [ ] Button disabled during loading
- [ ] **CRITICAL** All tests from AI.3 enabled and passing

### Technical Requirements

- [ ] Inject ScreenerService
- [ ] Subscribe to refresh() observable
- [ ] Handle completion properly

## Test-Driven Development Approach

### Step 1: Enable Tests from AI.3

Remove `.skip` from test file.

### Step 2: Implement

Update `apps/dms-material/src/app/global/universe/universe.component.ts`:

```typescript
export class UniverseComponent {
  private readonly screenerService = inject(ScreenerService);

  // Expose loading signal to template
  readonly loading = this.screenerService.loading;
  readonly error = this.screenerService.error;

  onRefresh(): void {
    this.screenerService.refresh().subscribe({
      next: () => {
        // Refresh universe data
        this.refreshUniverseData();
      },
      error: (err) => {
        console.error('Refresh failed:', err);
      },
    });
  }

  private refreshUniverseData(): void {
    // Trigger universe service to reload data
    // This will be implemented in the component
  }
}
```

Update template:

```html
<button mat-raised-button color="primary" data-testid="refresh-button" (click)="onRefresh()" [disabled]="loading()">
  <mat-icon>refresh</mat-icon>
  Refresh Universe
</button>

@if (loading()) {
<mat-progress-spinner mode="indeterminate" diameter="24"></mat-progress-spinner>
} @if (error()) {
<div class="error-message" data-testid="error-message">{{ error() }}</div>
}
```

### Step 3: Run Tests

```bash
pnpm nx test dms-material --testFile=universe.component.spec.ts
```

## Definition of Done

- [ ] Button wired to service
- [ ] All tests from AI.3 passing
- [ ] Loading states work
- [ ] Manual testing complete
- [ ] All validation commands pass
  - Run `pnpm all`
  - Run `pnpm e2e:dms-material`
  - Run `pnpm dupcheck`
  - Run `pnpm format`
  - Repeat all of these if any fail until they all pass
