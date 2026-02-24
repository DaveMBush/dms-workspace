import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatNativeDateModule } from '@angular/material/core';
import { vi } from 'vitest';

import { DivDepModal } from './div-dep-modal.component';
import { DivDepModalData } from './div-dep-modal-data.interface';

vi.mock(
  '../../store/div-deposit-types/selectors/select-div-deposit-types.function',
  () => ({
    selectDivDepositTypes: vi.fn().mockReturnValue([
      { id: 'type-1', name: 'Regular' },
      { id: 'type-2', name: 'Special' },
    ]),
  })
);

vi.mock('../../store/universe/selectors/select-universes.function', () => ({
  selectUniverses: vi
    .fn()
    .mockReturnValue([
      { id: 'universe-aapl', symbol: 'AAPL', name: 'Apple Inc.' },
    ]),
}));

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
    const dividend = {
      id: '1',
      symbol: 'AAPL',
      amount: 0.25,
      universeId: 'universe-1',
      divDepositTypeId: 'type-1',
    };

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

    it('should report invalidSymbol when symbol not in universe', () => {
      component.form.get('symbol')?.setValue('NOTEXIST');
      component.form.get('symbol')?.markAsTouched();
      expect(component.form.get('symbol')?.hasError('invalidSymbol')).toBe(
        true
      );
    });

    it('should be valid when symbol exists in universe', () => {
      component.form.get('symbol')?.setValue('AAPL');
      expect(component.form.get('symbol')?.hasError('required')).toBe(false);
      expect(component.form.get('symbol')?.hasError('invalidSymbol')).toBe(
        false
      );
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

    it('should close dialog with data on valid submit', () => {
      (component as any).selectedUniverseId = 'universe-1';
      component.form.patchValue({
        symbol: 'AAPL',
        date: new Date(),
        amount: 0.25,
        divDepositTypeId: 'type-1',
      });
      component.onSubmit();
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

  describe('onSymbolBlur', () => {
    beforeEach(() => createComponent({ mode: 'add' }));

    it('should not throw when symbolAutocomplete is undefined', () => {
      expect(() => component.onSymbolBlur()).not.toThrow();
    });

    it('should set selectedUniverseId via exact match on blur', () => {
      // Simulate the autocomplete searchControl having text typed by user
      // (as opposed to a SymbolOption object from a dropdown selection)
      const fakeAutocomplete = {
        searchControl: { value: 'aapl', setValue: vi.fn() },
      };
      (component as any).symbolAutocomplete = fakeAutocomplete;
      component.onSymbolBlur();
      expect((component as any).selectedUniverseId).toBe('universe-aapl');
      expect((component as any).selectedSymbolId).toBe('AAPL');
      expect(component.symbolControl.value).toBe('AAPL');
    });

    it('should uppercase the search control text on blur', () => {
      const fakeAutocomplete = {
        searchControl: { value: 'aapl', setValue: vi.fn() },
      };
      (component as any).symbolAutocomplete = fakeAutocomplete;
      component.onSymbolBlur();
      expect(fakeAutocomplete.searchControl.setValue).toHaveBeenCalledWith(
        'AAPL',
        { emitEvent: false }
      );
    });

    it('should mark touched when symbol not found in universe', () => {
      const fakeAutocomplete = {
        searchControl: { value: 'UNKNOWN', setValue: vi.fn() },
      };
      (component as any).symbolAutocomplete = fakeAutocomplete;
      component.onSymbolBlur();
      expect((component as any).selectedUniverseId).toBeNull();
      expect(component.symbolControl.touched).toBe(true);
    });
  });
});
