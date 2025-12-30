import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatNativeDateModule } from '@angular/material/core';

import { DivDepModal } from './div-dep-modal.component';
import { DivDepModalData } from './div-dep-modal-data.interface';

describe('DivDepModal', () => {
  let component: DivDepModal;
  let fixture: ComponentFixture<DivDepModal>;
  let mockDialogRef: { close: ReturnType<typeof vi.fn> };

  const createComponent = (data: DivDepModalData) => {
    mockDialogRef = { close: vi.fn() };
    TestBed.configureTestingModule({
      imports: [DivDepModal, MatNativeDateModule],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    });
    fixture = TestBed.createComponent(DivDepModal);
    component = fixture.componentInstance;
  };

  describe('add mode', () => {
    beforeEach(() => createComponent({ mode: 'add' }));

    it('should have empty form', () => {
      expect(component.form.get('symbol')?.value).toBe('');
    });

    it('should return false for isEditMode', () => {
      expect(component.isEditMode).toBe(false);
    });

    it('should have title "New Dividend or Deposit"', () => {
      expect(component.title).toBe('New Dividend or Deposit');
    });
  });

  describe('edit mode', () => {
    const dividend = { id: '1', symbol: 'AAPL', amount: 0.25, shares: 100 };

    beforeEach(() =>
      createComponent({ mode: 'edit', dividend: dividend as any })
    );

    it('should populate form with dividend data', () => {
      component.ngOnInit();
      expect(component.form.get('symbol')?.value).toBe('AAPL');
      expect(component.form.get('amount')?.value).toBe(0.25);
    });

    it('should return true for isEditMode', () => {
      expect(component.isEditMode).toBe(true);
    });

    it('should have title "Edit Dividend or Deposit"', () => {
      expect(component.title).toBe('Edit Dividend or Deposit');
    });
  });

  describe('validation', () => {
    beforeEach(() => createComponent({ mode: 'add' }));

    it('should require symbol', () => {
      component.form.get('symbol')?.markAsTouched();
      expect(component.form.get('symbol')?.hasError('required')).toBe(true);
    });

    it('should require date', () => {
      component.form.get('date')?.markAsTouched();
      expect(component.form.get('date')?.hasError('required')).toBe(true);
    });

    it('should require amount > 0', () => {
      component.form.patchValue({ amount: 0 });
      expect(component.form.get('amount')?.hasError('min')).toBe(true);
    });
  });

  describe('submit', () => {
    beforeEach(() => createComponent({ mode: 'add' }));

    it('should not submit invalid form', () => {
      component.onSubmit();
      expect(mockDialogRef.close).not.toHaveBeenCalled();
    });

    it('should close dialog with data on valid submit', async () => {
      component.form.patchValue({
        symbol: 'AAPL',
        date: new Date(),
        amount: 0.25,
        type: 'Regular',
      });
      component.onSubmit();
      // Wait for async operation
      await new Promise((r) => setTimeout(r, 600));
      expect(mockDialogRef.close).toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    beforeEach(() => createComponent({ mode: 'add' }));

    it('should close dialog with null', () => {
      component.onCancel();
      expect(mockDialogRef.close).toHaveBeenCalledWith(null);
    });
  });
});
