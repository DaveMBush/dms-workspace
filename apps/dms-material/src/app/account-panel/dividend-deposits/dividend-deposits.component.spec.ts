import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';

import { ColumnDef } from '../../shared/components/base-table/column-def.interface';
import { ConfirmDialogService } from '../../shared/services/confirm-dialog.service';
import { NotificationService } from '../../shared/services/notification.service';
import { DividendDepositsComponent } from './dividend-deposits.component';

vi.mock('../../store/div-deposits/div-deposits.selectors', () => ({
  selectDivDepositEntity: vi.fn(() => ({})),
}));

describe('DividendDepositsComponent', () => {
  let component: DividendDepositsComponent;
  let fixture: ComponentFixture<DividendDepositsComponent>;
  let mockDialog: { open: ReturnType<typeof vi.fn> };
  let mockNotification: { success: ReturnType<typeof vi.fn> };
  let mockConfirmDialog: { confirm: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
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

  describe('columns', () => {
    it('should define columns', () => {
      expect(component.columns.length).toBeGreaterThan(0);
    });

    it('should have symbol column', () => {
      expect(
        component.columns.find((c: ColumnDef) => c.field === 'symbol')
      ).toBeTruthy();
    });

    it('should have date column', () => {
      expect(
        component.columns.find((c: ColumnDef) => c.field === 'date')
      ).toBeTruthy();
    });

    it('should have amount column', () => {
      expect(
        component.columns.find((c: ColumnDef) => c.field === 'amount')
      ).toBeTruthy();
    });
  });

  describe('onAddDividend', () => {
    it('should open dialog in add mode', () => {
      component.onAddDividend();
      expect(mockDialog.open).toHaveBeenCalled();
    });

    it('should show success notification on add', () => {
      component.onAddDividend();
      expect(mockNotification.success).toHaveBeenCalledWith(
        'Dividend added successfully'
      );
    });
  });

  describe('onEditDividend', () => {
    it('should open dialog in edit mode', () => {
      const dividend = { id: '1', symbol: 'AAPL' } as any;
      component.onEditDividend(dividend);
      expect(mockDialog.open).toHaveBeenCalled();
    });
  });

  describe('onDeleteDividend', () => {
    it('should show confirm dialog', () => {
      const dividend = { id: '1', symbol: 'AAPL' } as any;
      component.onDeleteDividend(dividend);
      expect(mockConfirmDialog.confirm).toHaveBeenCalled();
    });

    it('should show success notification on delete confirm', () => {
      const dividend = { id: '1', symbol: 'AAPL' } as any;
      component.onDeleteDividend(dividend);
      expect(mockNotification.success).toHaveBeenCalledWith('Dividend deleted');
    });
  });
});
