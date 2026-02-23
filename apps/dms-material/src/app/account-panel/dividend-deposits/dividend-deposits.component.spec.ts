import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { ColumnDef } from '../../shared/components/base-table/column-def.interface';
import { ConfirmDialogService } from '../../shared/services/confirm-dialog.service';
import { NotificationService } from '../../shared/services/notification.service';
import { DivDeposit } from '../../store/div-deposits/div-deposit.interface';
import { DividendDepositsComponent } from './dividend-deposits.component';

// Use vi.hoisted to hoist mock infrastructure before vi.mock calls.
// The entity state is held in a plain closure variable — a WritableSignal cannot
// be created here because @angular/core imports have not been initialized yet.
// Instead, mockSelectDivDepositEntityFunc itself acts as the reactive bridge:
// tests call mockSelectDivDepositEntityFunc.mockImplementation(() => currentEntities)
// but the component will re-read the updated value via a signal wrapper created
// inside beforeEach once Angular is initialized.
const { mockSelectDivDepositEntityFunc } = vi.hoisted(() => {
  const mockFunc = vi.fn(() => ({}));
  return { mockSelectDivDepositEntityFunc: mockFunc };
});

vi.mock('../../store/div-deposits/div-deposits.selectors', () => ({
  selectDivDepositEntity: mockSelectDivDepositEntityFunc,
}));

// Future DividendDepositsComponentService interface (to be created in AQ.2)
interface MockDividendDepositsComponentService {
  dividends: WritableSignal<DivDeposit[]>;
  selectedAccountId: WritableSignal<string>;
}

// Helper to create test DivDeposit data
function createDivDeposit(overrides: Partial<DivDeposit> = {}): DivDeposit {
  return {
    id: 'dep-1',
    date: new Date('2024-01-15'),
    amount: 100,
    accountId: 'acc-1',
    divDepositTypeId: 'type-1',
    universeId: 'universe-1',
    ...overrides,
  };
}

// Disabled until implementation in AQ.2
describe.skip('DividendDepositsComponent', () => {
  let component: DividendDepositsComponent;
  let fixture: ComponentFixture<DividendDepositsComponent>;
  let mockDialog: { open: ReturnType<typeof vi.fn> };
  let mockNotification: { success: ReturnType<typeof vi.fn> };
  let mockConfirmDialog: { confirm: ReturnType<typeof vi.fn> };
  // WritableSignal created inside beforeEach (after Angular is initialized) and
  // wired into mockSelectDivDepositEntityFunc so computed signals re-evaluate.
  let entitySignal: WritableSignal<Record<string, DivDeposit>>;

  beforeEach(async () => {
    // Create a fresh signal each test; wire the mock so the component's computed
    // signal tracks it as a reactive dependency via Angular's signal graph.
    entitySignal = signal<Record<string, DivDeposit>>({});
    mockSelectDivDepositEntityFunc.mockImplementation(() => entitySignal());

    mockDialog = {
      open: vi.fn().mockReturnValue({ afterClosed: () => of(true) }),
    };
    mockNotification = { success: vi.fn() };
    mockConfirmDialog = { confirm: vi.fn().mockReturnValue(of(true)) };

    await TestBed.configureTestingModule({
      imports: [DividendDepositsComponent],
      providers: [
        { provide: MatDialog, useValue: mockDialog },
        { provide: NotificationService, useValue: mockNotification },
        { provide: ConfirmDialogService, useValue: mockConfirmDialog },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DividendDepositsComponent);
    component = fixture.componentInstance;
  });

  // AC 3: Tests verify table columns display correctly
  describe('columns', () => {
    it('should define exactly 4 columns', () => {
      expect(component.columns.length).toBe(4);
    });

    it('should have symbol column with sortable true and correct width', () => {
      const col = component.columns.find(
        (c: ColumnDef) => c.field === 'symbol'
      );
      expect(col).toBeTruthy();
      expect(col?.sortable).toBe(true);
      expect(col?.width).toBe('120px');
    });

    it('should have date column with type date, sortable true, and correct width', () => {
      const col = component.columns.find((c: ColumnDef) => c.field === 'date');
      expect(col).toBeTruthy();
      expect(col?.type).toBe('date');
      expect(col?.sortable).toBe(true);
      expect(col?.width).toBe('110px');
    });

    it('should have amount column with type currency, sortable true, and correct width', () => {
      const col = component.columns.find(
        (c: ColumnDef) => c.field === 'amount'
      );
      expect(col).toBeTruthy();
      expect(col?.type).toBe('currency');
      expect(col?.sortable).toBe(true);
      expect(col?.width).toBe('100px');
    });

    it('should have type column with correct width', () => {
      const col = component.columns.find((c: ColumnDef) => c.field === 'type');
      expect(col).toBeTruthy();
      expect(col?.width).toBe('120px');
    });

    // AC 4: Tests verify table sorting functionality
    it('should have sortable columns for symbol, date, and amount', () => {
      const sortableFields = component.columns
        .filter((c: ColumnDef) => c.sortable === true)
        .map((c: ColumnDef) => c.field);
      expect(sortableFields).toContain('symbol');
      expect(sortableFields).toContain('date');
      expect(sortableFields).toContain('amount');
    });

    it('should not have type column as sortable', () => {
      const typeCol = component.columns.find(
        (c: ColumnDef) => c.field === 'type'
      );
      expect(typeCol?.sortable).toBeFalsy();
    });
  });

  // AC 1 & 2: Tests for SmartNgRX integration and account filtering.
  // Signal-based mocking: mockSelectDivDepositEntityFunc.mockImplementation()
  // points to a WritableSignal so entitySignal.set() drives Angular's reactive
  // graph — component computed signals re-evaluate when data changes.
  describe('SmartNgRX Integration - Dividend Deposits', () => {
    it('should inject DividendDepositsComponentService', () => {
      // Fails until AQ.2 creates and wires the service
      // eslint-disable-next-line @typescript-eslint/dot-notation -- accessing private for test
      expect(component['dividendDepositsService']).toBeDefined();
    });

    // AC 1: Tests verify table displays dividends from SmartNgRX store
    it('should display dividends from SmartNgRX store via component service', () => {
      // Arrange: push 2 acc-1 dividends into the reactive signal
      entitySignal.set({
        'dep-1': createDivDeposit({
          id: 'dep-1',
          accountId: 'acc-1',
          amount: 100,
        }),
        'dep-2': createDivDeposit({
          id: 'dep-2',
          accountId: 'acc-1',
          amount: 200,
        }),
      });

      // Fails until AQ.2 wires component to DividendDepositsComponentService
      expect(component.dividends$().length).toBe(2);
    });

    // AC 5: Tests verify empty state when no dividends
    it('should display empty state when store has no dividends', () => {
      // Arrange: signal starts at {} (set in beforeEach)
      expect(component.dividends$()).toEqual([]);
      expect(component.dividends$().length).toBe(0);
    });

    // AC 2: Tests verify table filters by selected account
    it('should only display dividends for the selected account', () => {
      // Arrange: store contains dividends from two different accounts
      entitySignal.set({
        'dep-1': createDivDeposit({
          id: 'dep-1',
          accountId: 'acc-1',
          amount: 100,
        }),
        'dep-2': createDivDeposit({
          id: 'dep-2',
          accountId: 'acc-2',
          amount: 200,
        }),
        'dep-3': createDivDeposit({
          id: 'dep-3',
          accountId: 'acc-1',
          amount: 300,
        }),
      });

      // Fails: component returns all 3; after AQ.2 should return 2 (acc-1 only)
      expect(component.dividends$().length).toBe(2);
      expect(
        component.dividends$().every((d: DivDeposit) => d.accountId === 'acc-1')
      ).toBe(true);
    });

    it('should not display dividends from other accounts', () => {
      // Arrange: store has one entry per account
      entitySignal.set({
        'dep-1': createDivDeposit({
          id: 'dep-1',
          accountId: 'acc-1',
          amount: 100,
        }),
        'dep-2': createDivDeposit({
          id: 'dep-2',
          accountId: 'acc-2',
          amount: 200,
        }),
      });

      // Fails: dividends$ currently returns all entries including acc-2
      expect(
        component.dividends$().some((d: DivDeposit) => d.accountId === 'acc-2')
      ).toBe(false);
    });

    it('should return empty array when selected account has no dividends', () => {
      // Arrange: store only has dividends for acc-2; selected account is acc-1
      entitySignal.set({
        'dep-1': createDivDeposit({
          id: 'dep-1',
          accountId: 'acc-2',
          amount: 100,
        }),
      });

      // Fails: dividends$ returns 1 (acc-2 entry) instead of 0
      expect(component.dividends$().length).toBe(0);
    });

    it('should reactively update when store data changes', () => {
      // Arrange: initial state — 1 dividend
      entitySignal.set({
        'dep-1': createDivDeposit({
          id: 'dep-1',
          accountId: 'acc-1',
          amount: 100,
        }),
      });
      expect(component.dividends$().length).toBe(1);

      // Act: add a second dividend for the same account via signal update
      entitySignal.set({
        'dep-1': createDivDeposit({
          id: 'dep-1',
          accountId: 'acc-1',
          amount: 100,
        }),
        'dep-2': createDivDeposit({
          id: 'dep-2',
          accountId: 'acc-1',
          amount: 200,
        }),
      });

      // Assert: component reactively reflects updated store state
      expect(component.dividends$().length).toBe(2);
    });
  });

  describe('onAddDividend', () => {
    it('should open dialog in add mode', () => {
      component.onAddDividend();
      expect(mockDialog.open).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: expect.objectContaining({ mode: 'add' }),
        })
      );
    });

    it('should show success notification when dialog closes with result', () => {
      component.onAddDividend();
      expect(mockNotification.success).toHaveBeenCalledWith(
        'Dividend added successfully'
      );
    });
  });

  describe('onEditDividend', () => {
    it('should open dialog in edit mode with the dividend', () => {
      const dividend = createDivDeposit({ id: 'dep-edit' });
      component.onEditDividend(dividend);
      expect(mockDialog.open).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: expect.objectContaining({ mode: 'edit', dividend }),
        })
      );
    });

    it('should show success notification when edit dialog closes with result', () => {
      const dividend = createDivDeposit({ id: 'dep-edit' });
      component.onEditDividend(dividend);
      expect(mockNotification.success).toHaveBeenCalledWith(
        'Dividend updated successfully'
      );
    });
  });

  describe('onDeleteDividend', () => {
    it('should show confirmation dialog with correct title', () => {
      const dividend = createDivDeposit({ id: 'dep-del' });
      component.onDeleteDividend(dividend);
      expect(mockConfirmDialog.confirm).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Delete Dividend' })
      );
    });

    it('should show success notification when delete is confirmed', () => {
      const dividend = createDivDeposit({ id: 'dep-del' });
      component.onDeleteDividend(dividend);
      expect(mockNotification.success).toHaveBeenCalledWith('Dividend deleted');
    });
  });
});
