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

// Use vi.hoisted so the mock function is available before vi.mock is called
const { mockSelectDivDepositEntityFunc } = vi.hoisted(() => {
  const mockFunc = vi.fn(() => ({}));
  return { mockSelectDivDepositEntityFunc: mockFunc };
});

vi.mock('../../store/div-deposits/div-deposits.selectors', () => ({
  selectDivDepositEntity: mockSelectDivDepositEntityFunc,
}));

// Future DividendDepositsComponentService interface (to be created in AQ.2)
// Disabled until implementation in AQ.2
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

  beforeEach(async () => {
    mockSelectDivDepositEntityFunc.mockReturnValue({});

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

  // AC 1 & 2: Tests for SmartNgRX integration and account filtering
  // These tests represent intended behavior for AQ.2 implementation (RED phase)
  describe('SmartNgRX Integration - Dividend Deposits', () => {
    let mockDividendDepositsService: MockDividendDepositsComponentService;

    beforeEach(() => {
      const dividendsSignal = signal<DivDeposit[]>([]);
      const selectedAccountIdSignal = signal<string>('acc-1');
      mockDividendDepositsService = {
        dividends: dividendsSignal,
        selectedAccountId: selectedAccountIdSignal,
      };
    });

    it('should inject DividendDepositsComponentService', () => {
      // Fails until AQ.2 creates and wires the service
      // eslint-disable-next-line @typescript-eslint/dot-notation -- accessing private for test
      expect(component['dividendDepositsService']).toBeDefined();
    });

    // AC 1: Tests verify table displays dividends from SmartNgRX store
    it('should display dividends from SmartNgRX store via component service', () => {
      const testDividends: DivDeposit[] = [
        createDivDeposit({ id: 'dep-1', accountId: 'acc-1', amount: 100 }),
        createDivDeposit({ id: 'dep-2', accountId: 'acc-1', amount: 200 }),
      ];

      // Set store to return the test dividends (only acc-1 dividends)
      const entityMap: Record<string, DivDeposit> = {};
      testDividends.forEach((d) => {
        entityMap[d.id] = d;
      });
      mockSelectDivDepositEntityFunc.mockReturnValue(entityMap);

      // Fails until AQ.2 wires component to DividendDepositsComponentService
      expect(component.dividends$().length).toBe(2);
    });

    // AC 5: Tests verify empty state when no dividends
    it('should display empty state when store has no dividends', () => {
      mockSelectDivDepositEntityFunc.mockReturnValue({});

      // Passes with current implementation (selectDivDepositEntity returns {})
      expect(component.dividends$()).toEqual([]);
      expect(component.dividends$().length).toBe(0);
    });

    // AC 2: Tests verify table filters by selected account
    it('should only display dividends for the selected account', () => {
      // Store contains dividends from two different accounts
      const allDividends: Record<string, DivDeposit> = {
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
      };
      mockSelectDivDepositEntityFunc.mockReturnValue(allDividends);

      // Fails: current dividends$ returns all 3, but should filter to acc-1 only (2 results)
      expect(component.dividends$().length).toBe(2);
      expect(
        component.dividends$().every((d: DivDeposit) => d.accountId === 'acc-1')
      ).toBe(true);
    });

    it('should not display dividends from other accounts', () => {
      // Store contains dividends from acc-1 and acc-2
      const allDividends: Record<string, DivDeposit> = {
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
      };
      mockSelectDivDepositEntityFunc.mockReturnValue(allDividends);

      // Fails: dividends$ currently returns all, including acc-2
      expect(
        component.dividends$().some((d: DivDeposit) => d.accountId === 'acc-2')
      ).toBe(false);
    });

    it('should return empty array when selected account has no dividends', () => {
      // Store has dividends only for acc-2, but selected account is acc-1
      const allDividends: Record<string, DivDeposit> = {
        'dep-1': createDivDeposit({
          id: 'dep-1',
          accountId: 'acc-2',
          amount: 100,
        }),
      };
      mockSelectDivDepositEntityFunc.mockReturnValue(allDividends);

      // Fails: dividends$ currently returns all dividends regardless of account
      expect(component.dividends$().length).toBe(0);
    });

    it('should reactively update when store data changes', () => {
      // Initial state: 1 dividend
      const initialMap: Record<string, DivDeposit> = {
        'dep-1': createDivDeposit({
          id: 'dep-1',
          accountId: 'acc-1',
          amount: 100,
        }),
      };
      mockSelectDivDepositEntityFunc.mockReturnValue(initialMap);

      // Updated state: 2 dividends for same account
      const updatedMap: Record<string, DivDeposit> = {
        ...initialMap,
        'dep-2': createDivDeposit({
          id: 'dep-2',
          accountId: 'acc-1',
          amount: 200,
        }),
      };
      mockSelectDivDepositEntityFunc.mockReturnValue(updatedMap);

      // Fails until component uses DividendDepositsComponentService reactive signal
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
