# RMS Frontend: PrimeNG → Angular Material Migration Quick Reference

## Component Mapping Guide

### Form Components

| PrimeNG              | Angular Material        | Migration Notes                                            |
| -------------------- | ----------------------- | ---------------------------------------------------------- |
| `InputTextModule`    | `MatInputModule`        | Rename p-inputText to matInput, use mat-form-field wrapper |
| `InputNumberModule`  | `MatInputModule`        | Use [type]="number" with matInput                          |
| `PasswordModule`     | `MatInputModule`        | Use [type]="password" with matInput                        |
| `CheckboxModule`     | `MatCheckboxModule`     | Similar API, rename p-checkbox to matCheckbox              |
| `SelectModule`       | `MatSelectModule`       | Wrap in mat-form-field, similar options approach           |
| `DatePickerModule`   | `MatDatepickerModule`   | Use matInput with matDatepicker trigger                    |
| `AutoCompleteModule` | `MatAutocompleteModule` | Similar filter pattern, use matInput trigger               |

### Navigation & Layout

| PrimeNG          | Angular Material                             | Migration Notes                                           |
| ---------------- | -------------------------------------------- | --------------------------------------------------------- |
| `ButtonModule`   | `MatButtonModule`                            | Rename p-button to matButton, handle variants differently |
| `ToolbarModule`  | `MatToolbarModule`                           | Similar structure, different styling                      |
| `PanelModule`    | `MatExpansionPanelModule`                    | Header/content structure differs                          |
| `ListboxModule`  | `MatListModule` or `MatSelectModule`         | Depends on use case                                       |
| `SplitterModule` | Custom CSS Flexbox/Grid or `MatDrawerModule` | No direct equivalent                                      |

### Data Tables

| PrimeNG           | Angular Material     | Migration Notes                               |
| ----------------- | -------------------- | --------------------------------------------- |
| `TableModule`     | `MatTableModule`     | Major refactor: template-driven → column defs |
| `PaginatorModule` | `MatPaginatorModule` | Similar concept, different integration        |
| (sorting)         | `MatSortModule`      | Works with matTable naturally                 |

### Dialogs & Feedback

| PrimeNG                          | Angular Material              | Migration Notes                                     |
| -------------------------------- | ----------------------------- | --------------------------------------------------- |
| `DialogModule`                   | `MatDialogModule`             | Use MatDialogRef and data injection pattern         |
| `ConfirmDialogModule`            | `MatDialog`                   | Create custom confirm dialog component              |
| `ToastModule` + `MessageService` | `MatSnackBarModule`           | MatSnackBar is simpler, less configurable           |
| `MessageModule`                  | `MatSnackBarModule` or custom | Use snackbar for inline messages                    |
| `TooltipModule`                  | `MatTooltipModule`            | Very similar API, rename [pTooltip] to [matTooltip] |

### Other Components

| PrimeNG                 | Angular Material           | Migration Notes                        |
| ----------------------- | -------------------------- | -------------------------------------- |
| `ProgressSpinnerModule` | `MatProgressSpinnerModule` | Similar, rename p-progressSpinner      |
| `ProgressBarModule`     | `MatProgressBarModule`     | Rename p-progressBar                   |
| `CardModule`            | `MatCardModule`            | mat-card structure similar to p-card   |
| `TagModule`             | `MatChipsModule`           | Use for tag display, different styling |
| `ChartModule`           | Chart.js direct            | Keep as is, no Material equivalent     |

---

## Services to Migrate

### MessageService Replacement Strategy

**PrimeNG Pattern:**

```typescript
constructor(private messageService: MessageService) {}
showSuccess() {
  this.messageService.add({severity: 'success', summary: 'Success', detail: 'Saved'});
}
```

**Material Pattern:**

```typescript
constructor(private snackBar: MatSnackBar) {}
showSuccess() {
  this.snackBar.open('Saved', 'Close', {duration: 3000});
}
```

**Alternative:** Create custom notification service wrapping MatSnackBar for richer features.

### ConfirmationService Replacement Strategy

**PrimeNG Pattern:**

```typescript
this.confirmationService.confirm({
  message: 'Delete?',
  accept: () => {
    /* do delete */
  },
  reject: () => {
    /* do nothing */
  },
});
```

**Material Pattern:**

```typescript
const dialogRef = this.dialog.open(ConfirmDialogComponent, {
  data: { message: 'Delete?' },
});
dialogRef.afterClosed().subscribe((result) => {
  if (result) {
    /* do delete */
  }
});
```

---

## Key Files Affected by Migration

### High Priority (Heavy PrimeNG Usage)

- `apps/rms/src/app/shared/base-positions-table.component.ts` - Table component
- `apps/rms/src/app/global/global-universe/global-universe.component.ts` - Complex data table
- `apps/rms/src/app/account-panel/open-positions/open-positions.component.ts` - Editable table
- `apps/rms/src/app/shell/shell.component.ts` - Main layout (toolbar, panels)
- `apps/rms/src/app/app.config.ts` - Theme configuration

### Medium Priority (Moderate Usage)

- `apps/rms/src/app/auth/login/login.ts` - Forms
- `apps/rms/src/app/auth/profile/profile.ts` - Cards, dialogs
- `apps/rms/src/app/accounts/account.ts` - Listbox
- `apps/rms/src/app/account-panel/div-dep-modal/div-dep-modal.component.ts` - Dialog

### Low Priority (Light Usage)

- All card components (profile cards)
- Filter headers and sortable headers
- Display-only components

---

## Configuration Changes Required

### 1. app.config.ts

Remove:

```typescript
import { providePrimeNG } from 'primeng/config';

providePrimeNG({
  theme: { preset: aura, ... }
}),
```

Add:

```typescript
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

// Already exists - keep it
provideAnimationsAsync(),

// Add if using prebuilt theme
import '@angular/material/prebuilt-themes/indigo-pink.css';
// OR for custom theme, ensure styles.scss is configured
```

### 2. Styling Changes

- Update `styles.scss` to use Material theme
- May keep TailwindCSS alongside Material
- Update dark mode handling (Material uses different CSS var approach)
- Remove `tailwindcss-primeui` dependency

### 3. Module Imports

Change component imports from:

```typescript
import { TableModule, ButtonModule, ... } from 'primeng/...';

imports: [TableModule, ButtonModule, ...]
```

To:

```typescript
import { MatTableModule, MatButtonModule, ... } from '@angular/material/...';

imports: [MatTableModule, MatButtonModule, ...]
```

### 4. Icon Migration

Change all PrimeIcon classes:

```html
<!-- From -->
<i class="pi pi-check"></i>
<button pButton icon="pi-save">Save</button>

<!-- To -->
<mat-icon>check</mat-icon>
<button mat-button>
  <mat-icon>save</mat-icon>
  Save
</button>
```

---

## Critical Implementation Patterns

### Table with Sorting, Filtering, Pagination

**Material approach is significantly different:**

```typescript
// PrimeNG - template driven
<p-table [value]="data" (onSort)="onSort($event)">
  <ng-template pTemplate="header">
    <tr><th pSortableColumn="name">Name</th></tr>
  </ng-template>
  <ng-template pTemplate="body" let-row>
    <tr><td>{{row.name}}</td></tr>
  </ng-template>
</p-table>

// Material - column definition driven
displayedColumns = ['name', 'actions'];
dataSource = new MatTableDataSource(this.data);
sort = viewChild(MatSort);
paginator = viewChild(MatPaginator);

ngAfterViewInit() {
  this.dataSource.sort = this.sort();
  this.dataSource.paginator = this.paginator();
}

// Template
<mat-table [dataSource]="dataSource" matSort>
  <ng-container matColumnDef="name">
    <mat-header-cell *matHeaderCellDef mat-sort-header>Name</mat-header-cell>
    <mat-cell *matCellDef="let row">{{row.name}}</mat-cell>
  </ng-container>
  <mat-header-row *matHeaderRowDef="displayedColumns"></mat-header-row>
  <mat-row *matRowDef="let row; columns: displayedColumns;"></mat-row>
</mat-table>
<mat-paginator></mat-paginator>
```

### Form Fields with Validation

```typescript
// Material requires mat-form-field wrapper
<mat-form-field>
  <mat-label>Username</mat-label>
  <input matInput [(ngModel)]="username" required>
  <mat-error *ngIf="form.get('username')?.hasError('required')">
    Required
  </mat-error>
</mat-form-field>
```

### Dialog Implementation

```typescript
// Open dialog
const dialogRef = this.dialog.open(MyDialogComponent, {
  width: '500px',
  data: { id: 123 }
});

// In dialog component
constructor(
  public dialogRef: MatDialogRef<MyDialogComponent>,
  @Inject(MAT_DIALOG_DATA) public data: any
) {}

onSave() {
  this.dialogRef.close({saved: true});
}
```

---

## Migration Phases Recommendation

### Phase 1: Setup (1-2 days)

- Install Material and CDK dependencies
- Configure Material theme
- Update app.config.ts
- Update global styles
- Create custom notification service (wrapper around MatSnackBar)
- Create custom confirm dialog component

### Phase 2: Forms (1-2 days)

- Migrate all form components (Login, Profile cards, etc.)
- Update form validation display
- Test form interactions

### Phase 3: Basic Components (1-2 days)

- Buttons, cards, toolbars
- Lists and navigation
- Simple dialogs

### Phase 4: Tables (3-5 days) - MOST TIME INTENSIVE

- Start with simpler tables (Screener, GlobalErrorLogs)
- Move to complex tables (OpenPositions, SoldPositions)
- Handle sorting, filtering, pagination, inline editing

### Phase 5: Advanced Features (1-2 days)

- Dialogs and modals
- Date pickers with specific behavior
- Autocomplete implementations

### Phase 6: Polish & Testing (2-3 days)

- Dark mode implementation
- Accessibility review
- Responsive design
- Component tests update
- E2E test updates

---

## Testing Implications

### Unit Tests

Most component tests will need updates because:

- Element selectors change (p-button → mat-button)
- Harnesses available via `MatButtonHarness`, etc.
- Service injection patterns similar

### E2E Tests

Cypress selectors will need updates:

```typescript
// From
cy.get('[pButton]').contains('Save').click();

// To
cy.get('button[mat-button]').contains('Save').click();
```

### Recommended Tools

- Use Material's testing harnesses for robustness
- Material provides `MatButtonHarness`, `MatInputHarness`, etc.

---

## Estimated Effort

| Phase             | Effort         | Risk                |
| ----------------- | -------------- | ------------------- |
| Setup             | 1-2 days       | Low                 |
| Forms             | 1-2 days       | Low                 |
| Basic Components  | 1-2 days       | Low                 |
| Tables            | 3-5 days       | High - most complex |
| Advanced Features | 1-2 days       | Medium              |
| Polish & Testing  | 2-3 days       | Medium              |
| **Total**         | **10-16 days** | **Medium**          |

---

## Known Challenges & Solutions

### Challenge 1: PrimeNG Table is More Feature-Rich

**Solution:** Use MatTable with CDK + MatSort + MatPaginator for core features. For advanced features (drag-drop, etc.), use CDK directly.

### Challenge 2: MessageService is More Flexible

**Solution:** Create wrapper service around MatSnackBar that provides richer notification API if needed.

### Challenge 3: Splitter Layout Component

**Solution:** Use CSS Flexbox/Grid, or implement custom splitter with drag-to-resize using Angular CDK drag-drop.

### Challenge 4: Theme Integration with TailwindCSS

**Solution:** Configure Material theme and TailwindCSS to coexist. May need custom CSS layer configuration like PrimeNG currently uses.

### Challenge 5: Inline Cell Editing in Tables

**Solution:** Use EditableCellComponent pattern with MatInput inside mat-cell, no visible form-field border during display mode.

---

## Dependency Changes

### Add

```json
"@angular/cdk": "^20.0.0",
"@angular/material": "^20.0.0"
```

### Remove

```json
"primeng": "^20.0.0",
"@primeng/themes": "^19.1.3",
"tailwindcss-primeui": "0.6.1"
```

### Keep

```json
"chart.js": "^4.5.0",  // No Material equivalent
"primeicons": "^7.0.0" // Can be replaced with mat-icon
```

---

## References

- [Angular Material Docs](https://material.angular.io/)
- [Material Table Guide](https://material.angular.io/components/table/overview)
- [Material Form Field](https://material.angular.io/components/form-field/overview)
- [Material Dialog](https://material.angular.io/components/dialog/overview)
- [Material Icons](https://material.angular.io/components/icon/overview)
- [CDK Documentation](https://material.angular.io/cdk/categories)
