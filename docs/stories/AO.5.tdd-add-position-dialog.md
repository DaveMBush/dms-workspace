# Story AO.5: TDD - Unit Tests for Add New Position Dialog

## Story

**As a** frontend developer
**I want** comprehensive unit tests for Add New Position functionality
**So that** I can ensure the dialog integration works before implementation

## Context

**Current System:**

- Open positions table displays and edits data
- Need button and dialog to add new positions manually
- Dialog component may already exist from migration

**Problem:**

- No way to add new positions manually
- Need to verify dialog integration before implementation

## Acceptance Criteria

### Functional Requirements

- [ ] Tests verify Add New Position button triggers dialog
- [ ] Tests verify dialog receives current account ID
- [ ] Tests verify dialog form validation
- [ ] Tests verify successful save creates trade
- [ ] Tests verify cancel closes dialog

### Technical Requirements

- [ ] Unit tests created with >80% coverage
- [ ] Tests follow AAA pattern
- [ ] Tests disabled with .skip after RED verification
- [ ] Mock dialog service and TradesEffects

## Test-Driven Development Approach

### Step 1: Create Comprehensive Unit Tests First

Add to `open-positions.component.spec.ts`:

```typescript
describe.skip('Add New Position Dialog', () => {
  let mockDialogService: any;

  beforeEach(() => {
    mockDialogService = {
      open: vi.fn().mockReturnValue({
        afterClosed: () => of({ symbol: 'AAPL', quantity: 100, price: 150, purchase_date: '2024-01-01' }),
      }),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: MatDialog, useValue: mockDialogService }],
    });
  });

  it('should open dialog when Add button clicked', () => {
    component.openAddPositionDialog();

    expect(mockDialogService.open).toHaveBeenCalled();
  });

  it('should pass current account ID to dialog', () => {
    mockTradesEffects.selectedAccountId.set('account-123');

    component.openAddPositionDialog();

    expect(mockDialogService.open).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        data: expect.objectContaining({
          accountId: 'account-123',
        }),
      })
    );
  });

  it('should create new trade when dialog confirms', async () => {
    mockDialogService.open.mockReturnValue({
      afterClosed: () =>
        of({
          symbol: 'AAPL',
          quantity: 100,
          price: 150,
          purchase_date: '2024-01-01',
        }),
    });

    component.openAddPositionDialog();

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(mockTradesEffects.create).toHaveBeenCalledWith({
      symbol: 'AAPL',
      quantity: 100,
      price: 150,
      purchase_date: '2024-01-01',
      accountId: 'account-123',
      sell_date: null,
    });
  });

  it('should not create trade when dialog cancelled', () => {
    mockDialogService.open.mockReturnValue({
      afterClosed: () => of(null),
    });

    component.openAddPositionDialog();

    expect(mockTradesEffects.create).not.toHaveBeenCalled();
  });

  it('should handle dialog errors gracefully', () => {
    mockDialogService.open.mockReturnValue({
      afterClosed: () => throwError(() => new Error('Dialog error')),
    });

    component.openAddPositionDialog();

    expect(component.errorMessage()).toContain('Dialog error');
  });

  it('should show success message after adding position', async () => {
    mockDialogService.open.mockReturnValue({
      afterClosed: () => of({ symbol: 'AAPL', quantity: 100, price: 150 }),
    });
    mockTradesEffects.create.mockResolvedValueOnce({ id: '1' });

    component.openAddPositionDialog();

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(component.successMessage()).toBe('Position added successfully');
  });

  it('should validate required fields before creating', () => {
    mockDialogService.open.mockReturnValue({
      afterClosed: () => of({ symbol: '', quantity: 100 }), // Missing symbol
    });

    component.openAddPositionDialog();

    expect(mockTradesEffects.create).not.toHaveBeenCalled();
    expect(component.errorMessage()).toContain('required');
  });
});
```

### Step 2: Run Tests (Should Fail - RED)

```bash
pnpm nx test dms-material --testFile=open-positions.component.spec.ts
```

### Step 3: Disable Tests for CI

```typescript
describe.skip('Add New Position Dialog', () => {
  // Disabled until implementation in AO.6
});
```

### Step 4: Commit RED Tests

```bash
git add apps/dms-material/src/app/features/account/components/open-positions/open-positions.component.spec.ts
git commit -m "feat(AO.5): Add RED unit tests for Add New Position dialog"
```

## Files Modified

| File                                                                                                    | Changes                  |
| ------------------------------------------------------------------------------------------------------- | ------------------------ |
| `apps/dms-material/src/app/features/account/components/open-positions/open-positions.component.spec.ts` | Add RED tests for dialog |

## Definition of Done

- [ ] Comprehensive unit tests created (>80% coverage)
- [ ] Tests run and fail (RED state verified)
- [ ] Tests disabled with .skip for CI
- [ ] Dialog interaction tests included
- [ ] Validation tests included
- [ ] Error handling tests included
- [ ] All existing tests still pass
- [ ] Lint passes
- [ ] Code reviewed
- [ ] All validation commands pass
  - Run `pnpm all`
  - Run `pnpm e2e:dms-material`
  - Run `pnpm dupcheck`
  - Run `pnpm format`
  - Repeat all of these if any fail until they all pass

## Notes

- Implementation in Story AO.6
- May need to create dialog component if not exists
- Follow Material Dialog patterns

## Dependencies

- Story AO.4 completed
- MatDialog service available
