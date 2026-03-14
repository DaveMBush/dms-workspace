import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { DivDepModal } from '../div-dep-modal/div-dep-modal.component';
import { ColumnDef } from '../../shared/components/base-table/column-def.interface';
import { ConfirmDialogService } from '../../shared/services/confirm-dialog.service';
import { NotificationService } from '../../shared/services/notification.service';
import { currentAccountSignalStore } from '../../store/current-account/current-account.signal-store';
import { DivDeposit } from '../../store/div-deposits/div-deposit.interface';
import { divDepositsEffectsServiceToken } from '../../store/div-deposits/div-deposits-effect-service-token';
import { DividendDepositsComponent } from './dividend-deposits.component';
import { DividendDepositsComponentService } from './dividend-deposits-component.service';
// Mock selectDivDepositTypes to avoid SmartNgRX initialization from DivDepModal
vi.mock(
  '../../store/div-deposit-types/selectors/select-div-deposit-types.function',
  () => ({
    selectDivDepositTypes: vi.fn().mockReturnValue([]),
  })
);

// Mock selectUniverses to avoid SmartNgRX initialization from DivDepModal
vi.mock('../../store/universe/selectors/select-universes.function', () => ({
  selectUniverses: vi.fn().mockReturnValue([]),
}));

// Mock selectDivDepositEntity to avoid SmartNgRX initialization
vi.mock('../../store/div-deposits/div-deposits.selectors', () => ({
  selectDivDepositEntity: vi.fn().mockReturnValue({}),
}));

// Mock selectDivDepositTypeEntity to avoid SmartNgRX initialization
vi.mock(
  '../../store/div-deposit-types/selectors/select-div-deposit-type-entity.function',
  () => ({
    selectDivDepositTypeEntity: vi.fn().mockReturnValue({}),
  })
);

// Mock selectTopEntities to avoid SmartNgRX initialization
vi.mock('../../store/top/selectors/select-top-entities.function', () => ({
  selectTopEntities: vi.fn().mockReturnValue([]),
}));

// Mock selectAccountsEntity to avoid SmartNgRX initialization
vi.mock(
  '../../store/accounts/selectors/select-accounts-entity.function',
  () => ({
    selectAccountsEntity: vi.fn().mockReturnValue([]),
  })
);

// Mock selectAccounts to avoid SmartNgRX initialization
vi.mock('../../store/accounts/selectors/select-accounts.function', () => ({
  selectAccounts: vi.fn().mockReturnValue([]),
}));

// Mock selectOpenTradeEntity to avoid SmartNgRX initialization
vi.mock(
  '../../store/trades/selectors/select-open-trade-entity.function',
  () => ({
    selectOpenTradeEntity: vi.fn().mockReturnValue({}),
  })
);

// Mock selectSoldTradeEntity to avoid SmartNgRX initialization
vi.mock(
  '../../store/trades/selectors/select-sold-trade-entity.function',
  () => ({
    selectSoldTradeEntity: vi.fn().mockReturnValue({}),
  })
);

// Mock selectAccountChildren to avoid SmartNgRX initialization
vi.mock(
  '../../store/trades/selectors/select-account-children.function',
  () => ({
    selectAccountChildren: vi.fn().mockReturnValue({ entities: {} }),
  })
);

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

// Enabled in AQ.2
describe('DividendDepositsComponent', () => {
  let component: DividendDepositsComponent;
  let fixture: ComponentFixture<DividendDepositsComponent>;
  let mockDialog: { open: ReturnType<typeof vi.fn> };
  let mockNotification: { success: ReturnType<typeof vi.fn> };
  let mockConfirmDialog: { confirm: ReturnType<typeof vi.fn> };
  let mockEffectsService: {
    add: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let mockDividendDepositsService: {
    dividends: WritableSignal<DivDeposit[]>;
    selectedAccountId: WritableSignal<string>;
    addDivDeposit: ReturnType<typeof vi.fn>;
    deleteDivDeposit: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockDividendDepositsService = {
      dividends: signal<DivDeposit[]>([]),
      selectedAccountId: signal<string>(''),
      visibleRange: signal<{ start: number; end: number }>({
        start: 0,
        end: 50,
      }),
      addDivDeposit: vi.fn(),
      deleteDivDeposit: vi.fn(),
    };

    mockDialog = {
      open: vi.fn().mockReturnValue({ afterClosed: () => of(true) }),
    };
    mockNotification = { success: vi.fn() };
    mockConfirmDialog = { confirm: vi.fn().mockReturnValue(of(true)) };
    mockEffectsService = {
      add: vi.fn().mockReturnValue(of([])),
      update: vi.fn().mockReturnValue(of([])),
      delete: vi.fn().mockReturnValue(of(undefined)),
    };

    await TestBed.configureTestingModule({
      imports: [DividendDepositsComponent],
      providers: [
        {
          provide: DividendDepositsComponentService,
          useValue: mockDividendDepositsService,
        },
        { provide: MatDialog, useValue: mockDialog },
        { provide: NotificationService, useValue: mockNotification },
        { provide: ConfirmDialogService, useValue: mockConfirmDialog },
        {
          provide: divDepositsEffectsServiceToken,
          useValue: mockEffectsService,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DividendDepositsComponent);
    component = fixture.componentInstance;
  });

  // AC 3: Tests verify table columns display correctly
  describe('columns', () => {
    it('should define exactly 5 columns', () => {
      expect(component.columns.length).toBe(5);
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

    it('should have actions column with type actions and correct width', () => {
      const col = component.columns.find(
        (c: ColumnDef) => c.field === 'actions'
      );
      expect(col).toBeTruthy();
      expect(col?.type).toBe('actions');
      expect(col?.width).toBe('60px');
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
  // DividendDepositsComponentService is mocked so dividends signal is driven
  // directly by mockDividendDepositsService.dividends.set([...]) to control
  // reactive graph without depending on SmartNgRX store initialization.
  describe('SmartNgRX Integration - Dividend Deposits', () => {
    it('should inject DividendDepositsComponentService', () => {
      expect(component.dividendDepositsService).toBeDefined();
    });

    // AC 1: Tests verify table displays dividends from SmartNgRX store
    it('should display dividends from SmartNgRX store via component service', () => {
      // Arrange: push 2 acc-1 dividends into the service signal
      mockDividendDepositsService.dividends.set([
        createDivDeposit({ id: 'dep-1', accountId: 'acc-1', amount: 100 }),
        createDivDeposit({ id: 'dep-2', accountId: 'acc-1', amount: 200 }),
      ]);

      expect(component.dividends$().length).toBe(2);
    });

    // AC 5: Tests verify empty state when no dividends
    it('should display empty state when store has no dividends', () => {
      // Arrange: signal starts at [] (set in beforeEach)
      expect(component.dividends$()).toEqual([]);
      expect(component.dividends$().length).toBe(0);
    });

    // AC 2: Tests verify table filters by selected account
    it('should only display dividends for the selected account', () => {
      // Set selected account so filter applies
      mockDividendDepositsService.selectedAccountId.set('acc-1');
      // Arrange: service already has filtered results from service layer
      mockDividendDepositsService.dividends.set([
        createDivDeposit({ id: 'dep-1', accountId: 'acc-1', amount: 100 }),
        createDivDeposit({ id: 'dep-3', accountId: 'acc-1', amount: 300 }),
      ]);

      expect(component.dividends$().length).toBe(2);
      expect(
        component.dividends$().every((d: DivDeposit) => d.accountId === 'acc-1')
      ).toBe(true);
    });

    it('should not display dividends from other accounts', () => {
      // Set selected account so filter applies
      mockDividendDepositsService.selectedAccountId.set('acc-1');
      // Arrange: service returns only acc-1 entries (filtering done in service)
      mockDividendDepositsService.dividends.set([
        createDivDeposit({ id: 'dep-1', accountId: 'acc-1', amount: 100 }),
      ]);

      expect(
        component.dividends$().some((d: DivDeposit) => d.accountId === 'acc-2')
      ).toBe(false);
    });

    it('should return empty array when selected account has no dividends', () => {
      // Set selected account so filter applies
      mockDividendDepositsService.selectedAccountId.set('acc-1');
      // Arrange: service returns empty array because selected account has no dividends
      mockDividendDepositsService.dividends.set([]);

      expect(component.dividends$().length).toBe(0);
    });

    it('should reactively update when store data changes', () => {
      // Arrange: initial state — 1 dividend
      mockDividendDepositsService.dividends.set([
        createDivDeposit({ id: 'dep-1', accountId: 'acc-1', amount: 100 }),
      ]);
      expect(component.dividends$().length).toBe(1);

      // Act: add a second dividend for the same account via signal update
      mockDividendDepositsService.dividends.set([
        createDivDeposit({ id: 'dep-1', accountId: 'acc-1', amount: 100 }),
        createDivDeposit({ id: 'dep-2', accountId: 'acc-1', amount: 200 }),
      ]);

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
// AQ.3: Re-enabled in AQ.4
describe('DividendDepositsComponent - Add Dialog SmartNgRX Integration (AQ.3)', () => {
  let component: DividendDepositsComponent;
  let fixture: ComponentFixture<DividendDepositsComponent>;
  let mockDialog: { open: ReturnType<typeof vi.fn> };
  let mockDialogRef: { afterClosed: ReturnType<typeof vi.fn> };
  let mockNotification: { success: ReturnType<typeof vi.fn> };
  let mockConfirmDialog: { confirm: ReturnType<typeof vi.fn> };
  let mockDividendDepositsService: {
    dividends: WritableSignal<DivDeposit[]>;
    selectedAccountId: WritableSignal<string>;
    addDivDeposit: ReturnType<typeof vi.fn>;
    deleteDivDeposit: ReturnType<typeof vi.fn>;
  };
  let mockEffectsService: { add: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    mockDividendDepositsService = {
      dividends: signal<DivDeposit[]>([]),
      selectedAccountId: signal<string>(''),
      visibleRange: signal<{ start: number; end: number }>({
        start: 0,
        end: 50,
      }),
      addDivDeposit: vi.fn(),
      deleteDivDeposit: vi.fn(),
    };

    mockDialogRef = {
      afterClosed: vi.fn().mockReturnValue(of(null)),
    };

    mockDialog = {
      open: vi.fn().mockReturnValue(mockDialogRef),
    };

    mockNotification = { success: vi.fn() };
    mockConfirmDialog = { confirm: vi.fn().mockReturnValue(of(false)) };
    mockEffectsService = { add: vi.fn().mockReturnValue(of([])) };

    await TestBed.configureTestingModule({
      imports: [DividendDepositsComponent],
      providers: [
        {
          provide: DividendDepositsComponentService,
          useValue: mockDividendDepositsService,
        },
        { provide: MatDialog, useValue: mockDialog },
        { provide: NotificationService, useValue: mockNotification },
        { provide: ConfirmDialogService, useValue: mockConfirmDialog },
        {
          provide: divDepositsEffectsServiceToken,
          useValue: mockEffectsService,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DividendDepositsComponent);
    component = fixture.componentInstance;
  });

  // AC 1: Tests verify Add button triggers dialog open
  it('should open dialog when onAddDividend is called', () => {
    component.onAddDividend();

    expect(mockDialog.open).toHaveBeenCalledWith(
      DivDepModal,
      expect.objectContaining({
        data: expect.objectContaining({ mode: 'add' }),
      })
    );
  });

  // AC 2: Tests verify dialog opens with 'add' mode
  it('should open dialog with mode add in data', () => {
    component.onAddDividend();

    const callArgs = mockDialog.open.mock.calls[0] as [
      unknown,
      { width: string; data: { mode: string } }
    ];
    expect(callArgs[1].data.mode).toBe('add');
  });

  // AC 3: Tests verify dialog receives correct width (500px)
  it('should open dialog with width 500px', () => {
    component.onAddDividend();

    const callArgs = mockDialog.open.mock.calls[0] as [
      unknown,
      { width: string; data: unknown }
    ];
    expect(callArgs[1].width).toBe('500px');
  });

  // AC 4: Tests verify successful add shows notification
  it('should show success notification when dialog returns data', () => {
    const mockData = createDivDeposit({ id: 'dep-new', amount: 150 });
    mockDialogRef.afterClosed.mockReturnValue(of(mockData));

    component.onAddDividend();

    expect(mockNotification.success).toHaveBeenCalledWith(
      'Dividend added successfully'
    );
  });

  // AC 4 (negative): Tests verify notification NOT shown when dialog cancelled
  it('should not show notification when dialog is cancelled', () => {
    mockDialogRef.afterClosed.mockReturnValue(of(null));

    component.onAddDividend();

    expect(mockNotification.success).not.toHaveBeenCalled();
  });

  // AC 5: Tests verify data passed to SmartNgRX add method via service
  it('should call dividendDepositsService.addDivDeposit with data returned from dialog', () => {
    const mockData = createDivDeposit({ id: 'dep-new', amount: 150 });
    mockDialogRef.afterClosed.mockReturnValue(of(mockData));

    component.onAddDividend();

    expect(mockDividendDepositsService.addDivDeposit).toHaveBeenCalledWith(
      mockData
    );
  });

  // AC 5 (negative): Tests verify add NOT called when dialog is cancelled
  it('should not call dividendDepositsService.addDivDeposit when dialog is cancelled', () => {
    mockDialogRef.afterClosed.mockReturnValue(of(null));

    component.onAddDividend();

    expect(mockDividendDepositsService.addDivDeposit).not.toHaveBeenCalled();
  });

  // AC 6: Tests verify that addDivDeposit is called — SmartNgRX handles store update
  it('should call addDivDeposit after successful dialog close', () => {
    const newDividend = createDivDeposit({ id: 'dep-new', amount: 150 });
    mockDialogRef.afterClosed.mockReturnValue(of(newDividend));

    component.onAddDividend();

    // SmartNgRX store is updated by addDivDeposit (SmartArray.add! pattern)
    expect(mockDividendDepositsService.addDivDeposit).toHaveBeenCalledWith(
      newDividend
    );
  });
});

// AQ.5: Re-enabled in AQ.6
describe('DividendDepositsComponent - Edit Dialog SmartNgRX Integration (AQ.5)', () => {
  let component: DividendDepositsComponent;
  let fixture: ComponentFixture<DividendDepositsComponent>;
  let mockDialog: { open: ReturnType<typeof vi.fn> };
  let mockDialogRef: { afterClosed: ReturnType<typeof vi.fn> };
  let mockNotification: { success: ReturnType<typeof vi.fn> };
  let mockConfirmDialog: { confirm: ReturnType<typeof vi.fn> };
  let mockDividendDepositsService: {
    dividends: WritableSignal<DivDeposit[]>;
    selectedAccountId: WritableSignal<string>;
    deleteDivDeposit: ReturnType<typeof vi.fn>;
  };
  let mockEffectsService: {
    add: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockDividendDepositsService = {
      dividends: signal<DivDeposit[]>([]),
      selectedAccountId: signal<string>(''),
      visibleRange: signal<{ start: number; end: number }>({
        start: 0,
        end: 50,
      }),
      deleteDivDeposit: vi.fn(),
    };

    mockDialogRef = {
      afterClosed: vi.fn().mockReturnValue(of(null)),
    };

    mockDialog = {
      open: vi.fn().mockReturnValue(mockDialogRef),
    };

    mockNotification = { success: vi.fn() };
    mockConfirmDialog = { confirm: vi.fn().mockReturnValue(of(false)) };
    mockEffectsService = {
      add: vi.fn().mockReturnValue(of([])),
      update: vi.fn().mockReturnValue(of([])),
    };

    await TestBed.configureTestingModule({
      imports: [DividendDepositsComponent],
      providers: [
        {
          provide: DividendDepositsComponentService,
          useValue: mockDividendDepositsService,
        },
        { provide: MatDialog, useValue: mockDialog },
        { provide: NotificationService, useValue: mockNotification },
        { provide: ConfirmDialogService, useValue: mockConfirmDialog },
        {
          provide: divDepositsEffectsServiceToken,
          useValue: mockEffectsService,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DividendDepositsComponent);
    component = fixture.componentInstance;
  });

  // AC 1: Tests verify edit action triggers onEditDividend
  it('should open dialog when onEditDividend is called', () => {
    const dividend = createDivDeposit({ id: 'dep-edit' });

    component.onEditDividend(dividend);

    expect(mockDialog.open).toHaveBeenCalledWith(
      DivDepModal,
      expect.objectContaining({
        data: expect.objectContaining({ mode: 'edit' }),
      })
    );
  });

  // AC 2: Tests verify dialog opens with 'edit' mode
  it('should open dialog with mode edit in data', () => {
    const dividend = createDivDeposit({ id: 'dep-edit' });

    component.onEditDividend(dividend);

    const callArgs = mockDialog.open.mock.calls[0] as [
      unknown,
      { width: string; data: { mode: string } }
    ];
    expect(callArgs[1].data.mode).toBe('edit');
  });

  // AC 3: Tests verify existing dividend data passed to dialog
  it('should pass complete dividend object to dialog', () => {
    const dividend = createDivDeposit({ id: 'dep-edit', amount: 250 });

    component.onEditDividend(dividend);

    const callArgs = mockDialog.open.mock.calls[0] as [
      unknown,
      { width: string; data: { mode: string; dividend: DivDeposit } }
    ];
    expect(callArgs[1].data.dividend).toEqual(dividend);
  });

  // AC 4: Tests verify dialog width is 500px
  it('should open dialog with width 500px', () => {
    const dividend = createDivDeposit({ id: 'dep-edit' });

    component.onEditDividend(dividend);

    const callArgs = mockDialog.open.mock.calls[0] as [
      unknown,
      { width: string; data: unknown }
    ];
    expect(callArgs[1].width).toBe('500px');
  });

  // AC 5: Tests verify successful edit shows notification
  it('should show success notification when dialog returns updated data', () => {
    const dividend = createDivDeposit({ id: 'dep-edit' });
    const updatedDividend = createDivDeposit({ id: 'dep-edit', amount: 250 });
    mockDialogRef.afterClosed.mockReturnValue(of(updatedDividend));

    component.onEditDividend(dividend);

    expect(mockNotification.success).toHaveBeenCalledWith(
      'Dividend updated successfully'
    );
  });

  // AC 5 (negative): Tests verify notification NOT shown when cancelled
  it('should not show notification when edit is cancelled', () => {
    const dividend = createDivDeposit({ id: 'dep-edit' });
    mockDialogRef.afterClosed.mockReturnValue(of(null));

    component.onEditDividend(dividend);

    expect(mockNotification.success).not.toHaveBeenCalled();
  });

  // AC 6: Tests verify effectsService.update called with dialog result
  it('should call effectsService.update with data returned from dialog', () => {
    const dividend = createDivDeposit({ id: 'dep-edit' });
    const updatedDividend = createDivDeposit({ id: 'dep-edit', amount: 300 });
    mockDialogRef.afterClosed.mockReturnValue(of(updatedDividend));

    component.onEditDividend(dividend);

    expect(mockEffectsService.update).toHaveBeenCalledWith(updatedDividend);
  });

  // AC 6 (negative): Tests verify update NOT called when cancelled
  it('should not call effectsService.update when edit is cancelled', () => {
    const dividend = createDivDeposit({ id: 'dep-edit' });
    mockDialogRef.afterClosed.mockReturnValue(of(null));

    component.onEditDividend(dividend);

    expect(mockEffectsService.update).not.toHaveBeenCalled();
  });

  // AC 7: Tests verify cancel closes without changes (update not called)
  it('should update dividends after successful edit', () => {
    const dividend = createDivDeposit({ id: 'dep-edit' });
    const updatedDividend = createDivDeposit({ id: 'dep-edit', amount: 300 });
    mockDialogRef.afterClosed.mockReturnValue(of(updatedDividend));
    mockEffectsService.update.mockReturnValue(of([updatedDividend]));

    component.onEditDividend(dividend);

    expect(mockEffectsService.update).toHaveBeenCalledWith(updatedDividend);
  });
});

// AQ.7: Re-enabled in AQ.8
describe('DividendDepositsComponent - Delete Dialog SmartNgRX Integration (AQ.7)', () => {
  let component: DividendDepositsComponent;
  let fixture: ComponentFixture<DividendDepositsComponent>;
  let mockDialog: { open: ReturnType<typeof vi.fn> };
  let mockNotification: { success: ReturnType<typeof vi.fn> };
  let mockConfirmDialog: { confirm: ReturnType<typeof vi.fn> };
  let mockDividendDepositsService: {
    dividends: WritableSignal<DivDeposit[]>;
    selectedAccountId: WritableSignal<string>;
    deleteDivDeposit: ReturnType<typeof vi.fn>;
  };
  let mockEffectsService: {
    add: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockDividendDepositsService = {
      dividends: signal<DivDeposit[]>([]),
      selectedAccountId: signal<string>(''),
      visibleRange: signal<{ start: number; end: number }>({
        start: 0,
        end: 50,
      }),
      deleteDivDeposit: vi.fn(),
    };

    mockDialog = {
      open: vi.fn().mockReturnValue({ afterClosed: () => of(null) }),
    };

    mockNotification = { success: vi.fn() };
    mockConfirmDialog = { confirm: vi.fn().mockReturnValue(of(false)) };
    mockEffectsService = {
      add: vi.fn().mockReturnValue(of([])),
      update: vi.fn().mockReturnValue(of([])),
      delete: vi.fn().mockReturnValue(of(undefined)),
    };

    await TestBed.configureTestingModule({
      imports: [DividendDepositsComponent],
      providers: [
        {
          provide: DividendDepositsComponentService,
          useValue: mockDividendDepositsService,
        },
        { provide: MatDialog, useValue: mockDialog },
        { provide: NotificationService, useValue: mockNotification },
        { provide: ConfirmDialogService, useValue: mockConfirmDialog },
        {
          provide: divDepositsEffectsServiceToken,
          useValue: mockEffectsService,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DividendDepositsComponent);
    component = fixture.componentInstance;
  });

  // AC 2: Tests verify confirmation dialog shown before delete
  it('should show confirmation dialog when onDeleteDividend is called', () => {
    const dividend = createDivDeposit({ id: 'dep-del' });

    component.onDeleteDividend(dividend);

    expect(mockConfirmDialog.confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Delete Dividend',
        message: 'Are you sure you want to delete this dividend?',
        confirmText: 'Delete',
      })
    );
  });

  // AC 6: Tests verify success notification shown after delete
  it('should show success notification after successful delete', () => {
    const dividend = createDivDeposit({ id: 'dep-del' });
    mockConfirmDialog.confirm.mockReturnValue(of(true));

    component.onDeleteDividend(dividend);

    expect(mockNotification.success).toHaveBeenCalledWith('Dividend deleted');
  });

  // AC 4: Tests verify delete cancelled when user declines
  it('should not call deleteDivDeposit when user cancels', () => {
    const dividend = createDivDeposit({ id: 'dep-del' });
    mockConfirmDialog.confirm.mockReturnValue(of(false));

    component.onDeleteDividend(dividend);

    expect(mockDividendDepositsService.deleteDivDeposit).not.toHaveBeenCalled();
  });

  // AC 4: Tests verify notification NOT shown when cancelled
  it('should not show success notification when user cancels', () => {
    const dividend = createDivDeposit({ id: 'dep-del' });
    mockConfirmDialog.confirm.mockReturnValue(of(false));

    component.onDeleteDividend(dividend);

    expect(mockNotification.success).not.toHaveBeenCalled();
  });

  // AC 7: Tests verify SmartNgRX store updated after delete
  it('should call deleteDivDeposit on service after confirmation', () => {
    const dividend = createDivDeposit({ id: 'dep-del' });
    mockConfirmDialog.confirm.mockReturnValue(of(true));

    component.onDeleteDividend(dividend);

    expect(mockDividendDepositsService.deleteDivDeposit).toHaveBeenCalledWith(
      dividend.id
    );
    // Regression guard: delete must go through SmartNgRX service,
    // not raw effectsService.delete
    expect(mockEffectsService.delete).not.toHaveBeenCalled();
  });
});

// Story AU.9: TDD Tests for Dividend Deposits Account Selection Integration
// Enabled in AU.10: Wire Dividend Deposits to Account Selection
// These tests verify that the dividend deposits screen properly integrates with
// account selection, refreshing data when the selected account changes.
describe('DividendDepositsComponent - Account Selection Integration', () => {
  let component: DividendDepositsComponent;
  let fixture: ComponentFixture<DividendDepositsComponent>;
  let mockDividendDepositsService: {
    dividends: WritableSignal<DivDeposit[]>;
    selectedAccountId: WritableSignal<string>;
    addDivDeposit: ReturnType<typeof vi.fn>;
    deleteDivDeposit: ReturnType<typeof vi.fn>;
  };
  let mockCurrentAccountStore: {
    id: WritableSignal<string>;
    selectCurrentAccountId: WritableSignal<string>;
    setCurrentAccountId: ReturnType<typeof vi.fn>;
  };

  let mockDialog: { open: ReturnType<typeof vi.fn> };
  let mockConfirmDialogService: { confirm: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    mockCurrentAccountStore = {
      id: signal<string>(''),
      selectCurrentAccountId: signal<string>(''),
      setCurrentAccountId: vi.fn(),
    };

    mockDividendDepositsService = {
      dividends: signal<DivDeposit[]>([]),
      selectedAccountId: signal<string>(''),
      visibleRange: signal<{ start: number; end: number }>({
        start: 0,
        end: 50,
      }),
      addDivDeposit: vi.fn(),
      deleteDivDeposit: vi.fn(),
    };

    mockDialog = {
      open: vi.fn().mockReturnValue({ afterClosed: () => of(null) }),
    };

    mockConfirmDialogService = {
      confirm: vi.fn().mockReturnValue(of(true)),
    };

    await TestBed.configureTestingModule({
      imports: [DividendDepositsComponent],
      providers: [
        {
          provide: DividendDepositsComponentService,
          useValue: mockDividendDepositsService,
        },
        {
          provide: currentAccountSignalStore,
          useValue: mockCurrentAccountStore,
        },
        { provide: MatDialog, useValue: mockDialog },
        { provide: NotificationService, useValue: { success: vi.fn() } },
        { provide: ConfirmDialogService, useValue: mockConfirmDialogService },
        {
          provide: divDepositsEffectsServiceToken,
          useValue: { add: vi.fn(), update: vi.fn(), delete: vi.fn() },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DividendDepositsComponent);
    component = fixture.componentInstance;
  });

  describe('subscribes to account selection changes', () => {
    it('should react when the selected account ID changes', () => {
      fixture.detectChanges();

      // Simulate account change via the store
      mockCurrentAccountStore.selectCurrentAccountId.set('acc-123');
      fixture.detectChanges();

      // Verify propagation into component service context
      expect(mockDividendDepositsService.selectedAccountId()).toBe('acc-123');
    });

    it('should not display stale data when account ID is empty', () => {
      fixture.detectChanges();

      mockCurrentAccountStore.selectCurrentAccountId.set('');
      mockDividendDepositsService.dividends.set([]);
      fixture.detectChanges();

      const dividends = component.dividends$();
      expect(dividends.length).toBe(0);
    });

    it('should handle initial account selection on component creation', () => {
      mockCurrentAccountStore.selectCurrentAccountId.set('acc-initial');
      fixture.detectChanges();

      // Verify service receives initial account selection
      expect(mockDividendDepositsService.selectedAccountId()).toBe(
        'acc-initial'
      );
    });
  });

  describe('data refresh on account change', () => {
    it('should load dividends for selected account', () => {
      const account1Dividends: DivDeposit[] = [
        createDivDeposit({
          id: 'dep-1',
          accountId: 'acc-1',
          amount: 100,
        }),
      ];

      fixture.detectChanges();

      mockCurrentAccountStore.selectCurrentAccountId.set('acc-1');
      fixture.detectChanges();
      expect(mockDividendDepositsService.selectedAccountId()).toBe('acc-1');
      mockDividendDepositsService.dividends.set(account1Dividends);

      const dividends = component.dividends$();
      expect(dividends.length).toBe(1);
      expect(dividends[0].amount).toBe(100);
    });

    it('should refresh table when account changes', () => {
      const account1Dividends: DivDeposit[] = [
        createDivDeposit({
          id: 'dep-1',
          accountId: 'acc-1',
          amount: 100,
        }),
      ];

      const account2Dividends: DivDeposit[] = [
        createDivDeposit({
          id: 'dep-10',
          accountId: 'acc-2',
          amount: 250,
        }),
        createDivDeposit({
          id: 'dep-11',
          accountId: 'acc-2',
          amount: 375,
        }),
      ];

      fixture.detectChanges();

      // First account
      mockCurrentAccountStore.selectCurrentAccountId.set('acc-1');
      fixture.detectChanges();
      expect(mockDividendDepositsService.selectedAccountId()).toBe('acc-1');
      mockDividendDepositsService.dividends.set(account1Dividends);

      expect(component.dividends$().length).toBe(1);

      // Switch to second account
      mockCurrentAccountStore.selectCurrentAccountId.set('acc-2');
      fixture.detectChanges();
      expect(mockDividendDepositsService.selectedAccountId()).toBe('acc-2');
      mockDividendDepositsService.dividends.set(account2Dividends);

      const dividends = component.dividends$();
      expect(dividends.length).toBe(2);
      expect(dividends[0].amount).toBe(250);
      expect(dividends[1].amount).toBe(375);
    });

    it('should clear dividends when account deselected', () => {
      const mockDividends: DivDeposit[] = [
        createDivDeposit({
          id: 'dep-1',
          accountId: 'acc-1',
          amount: 100,
        }),
      ];

      fixture.detectChanges();

      mockCurrentAccountStore.selectCurrentAccountId.set('acc-1');
      fixture.detectChanges();
      expect(mockDividendDepositsService.selectedAccountId()).toBe('acc-1');
      mockDividendDepositsService.dividends.set(mockDividends);
      expect(component.dividends$().length).toBe(1);

      // Deselect account
      mockCurrentAccountStore.selectCurrentAccountId.set('');
      fixture.detectChanges();
      expect(mockDividendDepositsService.selectedAccountId()).toBe('');
      mockDividendDepositsService.dividends.set([]);

      expect(component.dividends$().length).toBe(0);
    });

    it('should update dividend amounts for new account', () => {
      const dividends: DivDeposit[] = [
        createDivDeposit({
          id: 'dep-1',
          accountId: 'acc-1',
          amount: 500,
        }),
        createDivDeposit({
          id: 'dep-2',
          accountId: 'acc-1',
          amount: 150,
        }),
      ];

      fixture.detectChanges();

      mockCurrentAccountStore.selectCurrentAccountId.set('acc-1');
      mockDividendDepositsService.dividends.set(dividends);
      fixture.detectChanges();

      const displayed = component.dividends$();
      expect(displayed.length).toBe(2);
      expect(displayed[0].amount).toBe(500);
      expect(displayed[1].amount).toBe(150);
    });
  });

  describe('correct account ID passed to service calls', () => {
    it('should verify correct account ID is used by the service', () => {
      fixture.detectChanges();

      mockCurrentAccountStore.selectCurrentAccountId.set('acc-789');
      fixture.detectChanges();

      // Verify service received the propagated account ID
      expect(mockDividendDepositsService.selectedAccountId()).toBe('acc-789');
    });

    it('should use updated account ID after rapid account switches', () => {
      fixture.detectChanges();

      // Rapid account switches
      mockCurrentAccountStore.selectCurrentAccountId.set('acc-1');
      mockCurrentAccountStore.selectCurrentAccountId.set('acc-2');
      mockCurrentAccountStore.selectCurrentAccountId.set('acc-3');
      fixture.detectChanges();

      // The most recent account should be active in the service
      expect(mockDividendDepositsService.selectedAccountId()).toBe('acc-3');
    });

    it('should pass account ID through to service computation', () => {
      fixture.detectChanges();

      mockCurrentAccountStore.selectCurrentAccountId.set('acc-555');
      fixture.detectChanges();

      // Service should have access to the current account context
      expect(mockDividendDepositsService.selectedAccountId()).toBe('acc-555');
    });
  });

  describe('table updates with new account data', () => {
    it('should display dividends specific to the selected account', () => {
      const accountDividends: DivDeposit[] = [
        createDivDeposit({
          id: 'dep-100',
          accountId: 'acc-nvda',
          amount: 75,
          divDepositTypeId: 'type-2',
        }),
      ];

      fixture.detectChanges();

      mockCurrentAccountStore.selectCurrentAccountId.set('acc-nvda');
      mockDividendDepositsService.dividends.set(accountDividends);
      fixture.detectChanges();

      const dividends = component.dividends$();
      expect(dividends.length).toBe(1);
      expect(dividends[0].id).toBe('dep-100');
      expect(dividends[0].amount).toBe(75);
    });

    it('should update table columns when account data changes structure', () => {
      fixture.detectChanges();

      mockCurrentAccountStore.selectCurrentAccountId.set('acc-new');
      fixture.detectChanges();

      // Columns should remain defined regardless of account
      expect(component.columns.length).toBeGreaterThan(0);
      expect(
        component.columns.find(function findSymbol(c: ColumnDef) {
          return c.field === 'symbol';
        })
      ).toBeTruthy();
      expect(
        component.columns.find(function findAmount(c: ColumnDef) {
          return c.field === 'amount';
        })
      ).toBeTruthy();
    });

    it('should handle empty dividends for a new account gracefully', () => {
      fixture.detectChanges();

      mockCurrentAccountStore.selectCurrentAccountId.set('acc-empty');
      mockDividendDepositsService.dividends.set([]);
      fixture.detectChanges();

      const dividends = component.dividends$();
      expect(Array.isArray(dividends)).toBe(true);
      expect(dividends.length).toBe(0);
    });
  });

  describe('edge cases for account switching', () => {
    it('should handle switching to same account without error', () => {
      fixture.detectChanges();

      mockCurrentAccountStore.selectCurrentAccountId.set('acc-1');
      fixture.detectChanges();

      // Switch to same account again
      mockCurrentAccountStore.selectCurrentAccountId.set('acc-1');
      fixture.detectChanges();

      // Service should still reflect the correct account
      expect(mockDividendDepositsService.selectedAccountId()).toBe('acc-1');
    });

    it('should handle add operation with correct account context', () => {
      fixture.detectChanges();

      mockCurrentAccountStore.selectCurrentAccountId.set('acc-add');
      fixture.detectChanges();

      // Verify service has the correct account context for add operations
      expect(mockDividendDepositsService.selectedAccountId()).toBe('acc-add');

      // Simulate add - dialog opens with account context available
      const newDividend = createDivDeposit({ accountId: 'acc-add' });
      mockDialog.open.mockReturnValue({
        afterClosed: () => of(newDividend),
      });
      component.onAddDividend();
      expect(mockDividendDepositsService.addDivDeposit).toHaveBeenCalledWith(
        newDividend
      );
    });

    it('should handle delete operation with correct account context', () => {
      const dividend = createDivDeposit({
        id: 'dep-del',
        accountId: 'acc-del',
      });

      fixture.detectChanges();

      mockCurrentAccountStore.selectCurrentAccountId.set('acc-del');
      fixture.detectChanges();

      // Verify service has the correct account context for delete
      expect(mockDividendDepositsService.selectedAccountId()).toBe('acc-del');

      mockDividendDepositsService.dividends.set([dividend]);

      // Verify the dividend belongs to the current account
      expect(component.dividends$()[0].accountId).toBe('acc-del');

      // Simulate delete - service method should be callable
      component.onDeleteDividend(dividend);
    });

    it('should preserve component state across account switches', () => {
      fixture.detectChanges();

      // Columns should remain stable across switches
      const columnCount = component.columns.length;

      // Switch accounts
      mockCurrentAccountStore.selectCurrentAccountId.set('acc-new');
      fixture.detectChanges();

      // Component column definitions should be preserved
      expect(component.columns.length).toBe(columnCount);
    });
  });
});

// Story AX.3: TDD Tests for Dividend Deposits Virtual Data Access
// Disabled in AX.3: Re-enable in AX.4
// Re-enabled in AX.4
describe('DividendDepositsComponent - Virtual Data Access (AX.3)', () => {
  let component: DividendDepositsComponent;
  let fixture: ComponentFixture<DividendDepositsComponent>;
  let mockDividendDepositsService: {
    dividends: WritableSignal<DivDeposit[]>;
    selectedAccountId: WritableSignal<string>;
    visibleRange: WritableSignal<{ start: number; end: number }>;
    addDivDeposit: ReturnType<typeof vi.fn>;
    deleteDivDeposit: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockDividendDepositsService = {
      dividends: signal<DivDeposit[]>([]),
      selectedAccountId: signal<string>(''),
      visibleRange: signal<{ start: number; end: number }>({
        start: 0,
        end: 50,
      }),
      addDivDeposit: vi.fn(),
      deleteDivDeposit: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [DividendDepositsComponent],
      providers: [
        {
          provide: DividendDepositsComponentService,
          useValue: mockDividendDepositsService,
        },
        {
          provide: MatDialog,
          useValue: {
            open: vi.fn().mockReturnValue({ afterClosed: () => of(null) }),
          },
        },
        { provide: NotificationService, useValue: { success: vi.fn() } },
        {
          provide: ConfirmDialogService,
          useValue: { confirm: vi.fn().mockReturnValue(of(false)) },
        },
        {
          provide: divDepositsEffectsServiceToken,
          useValue: { add: vi.fn(), update: vi.fn(), delete: vi.fn() },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DividendDepositsComponent);
    component = fixture.componentInstance;
  });

  // AC: Test visibleRange signal has default { start: 0, end: 50 }
  it('should have visibleRange signal with default { start: 0, end: 50 }', () => {
    expect(component.visibleRange()).toEqual({ start: 0, end: 50 });
  });

  // AC: Test onRangeChange updates signal correctly
  it('should update visibleRange when onRangeChange is called', () => {
    component.onRangeChange({ start: 10, end: 60 });

    expect(component.visibleRange()).toEqual({ start: 10, end: 60 });
  });

  it('should update visibleRange to different values on subsequent calls', () => {
    component.onRangeChange({ start: 5, end: 25 });
    expect(component.visibleRange()).toEqual({ start: 5, end: 25 });

    component.onRangeChange({ start: 100, end: 150 });
    expect(component.visibleRange()).toEqual({ start: 100, end: 150 });
  });

  it('should propagate range change to service visibleRange', () => {
    component.onRangeChange({ start: 20, end: 70 });

    expect(mockDividendDepositsService.visibleRange()).toEqual({
      start: 20,
      end: 70,
    });
  });
});
