import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CusipCacheAddDialogComponent } from './cusip-cache-add-dialog.component';

describe('CusipCacheAddDialogComponent', function describeDialog() {
  describe('add mode', function describeAddMode() {
    let component: CusipCacheAddDialogComponent;
    let fixture: ComponentFixture<CusipCacheAddDialogComponent>;
    let dialogRefSpy: { close: ReturnType<typeof vi.fn> };

    beforeEach(async function setup() {
      dialogRefSpy = { close: vi.fn() };

      await TestBed.configureTestingModule({
        imports: [CusipCacheAddDialogComponent],
        providers: [
          { provide: MatDialogRef, useValue: dialogRefSpy },
          { provide: MAT_DIALOG_DATA, useValue: null },
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(CusipCacheAddDialogComponent);
      component = fixture.componentInstance;
    });

    it('should create', function shouldCreate() {
      expect(component).toBeTruthy();
    });

    it('should be in add mode', function shouldBeAddMode() {
      expect(component.isEdit).toBe(false);
    });

    it('should have empty form', function shouldHaveEmptyForm() {
      expect(component.form.get('cusip')?.value).toBe('');
      expect(component.form.get('symbol')?.value).toBe('');
      expect(component.form.get('source')?.value).toBe('OPENFIGI');
    });

    it('should have cusip enabled', function shouldEnableCusip() {
      expect(component.form.get('cusip')?.enabled).toBe(true);
    });

    it('should validate required cusip', function shouldRequireCusip() {
      component.form.get('cusip')?.setValue('');
      expect(component.form.get('cusip')?.hasError('required')).toBe(true);
    });

    it('should validate cusip pattern', function shouldValidatePattern() {
      component.form.get('cusip')?.setValue('ABC');
      expect(component.form.get('cusip')?.hasError('pattern')).toBe(true);

      component.form.get('cusip')?.setValue('037833100');
      expect(component.form.get('cusip')?.valid).toBe(true);
    });

    it('should validate required symbol', function shouldRequireSymbol() {
      component.form.get('symbol')?.setValue('');
      expect(component.form.get('symbol')?.hasError('required')).toBe(true);
    });

    it('should not submit invalid form', function shouldNotSubmitInvalid() {
      component.onSubmit();
      expect(dialogRefSpy.close).not.toHaveBeenCalled();
    });

    it('should submit valid form', function shouldSubmitValid() {
      component.form.get('cusip')?.setValue('037833100');
      component.form.get('symbol')?.setValue('AAPL');
      component.form.get('source')?.setValue('OPENFIGI');
      component.form.get('reason')?.setValue('test');

      component.onSubmit();

      expect(dialogRefSpy.close).toHaveBeenCalledWith({
        cusip: '037833100',
        symbol: 'AAPL',
        source: 'OPENFIGI',
        reason: 'test',
      });
    });

    it('should not submit whitespace-only symbol', function shouldRejectWhitespace() {
      component.form.get('cusip')?.setValue('037833100');
      component.form.get('symbol')?.setValue('   ');
      component.form.get('source')?.setValue('OPENFIGI');

      component.onSubmit();

      expect(dialogRefSpy.close).not.toHaveBeenCalled();
    });

    it('should trim symbol whitespace on submit', function shouldTrimSymbol() {
      component.form.get('cusip')?.setValue('037833100');
      component.form.get('symbol')?.setValue('  AAPL  ');
      component.form.get('source')?.setValue('OPENFIGI');
      component.form.get('reason')?.setValue('');

      component.onSubmit();

      expect(dialogRefSpy.close).toHaveBeenCalledWith(
        expect.objectContaining({ symbol: 'AAPL' })
      );
    });

    it('should close with null on cancel', function shouldCancel() {
      component.onCancel();
      expect(dialogRefSpy.close).toHaveBeenCalledWith(null);
    });
  });

  describe('edit mode', function describeEditMode() {
    let component: CusipCacheAddDialogComponent;
    let fixture: ComponentFixture<CusipCacheAddDialogComponent>;
    let dialogRefSpy: { close: ReturnType<typeof vi.fn> };

    const existingEntry = {
      id: '1',
      cusip: '037833100',
      symbol: 'AAPL',
      source: 'OPENFIGI',
      resolvedAt: null,
      lastUsedAt: null,
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
    };

    beforeEach(async function setup() {
      dialogRefSpy = { close: vi.fn() };

      await TestBed.configureTestingModule({
        imports: [CusipCacheAddDialogComponent],
        providers: [
          { provide: MatDialogRef, useValue: dialogRefSpy },
          { provide: MAT_DIALOG_DATA, useValue: existingEntry },
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(CusipCacheAddDialogComponent);
      component = fixture.componentInstance;
    });

    it('should be in edit mode', function shouldBeEditMode() {
      expect(component.isEdit).toBe(true);
    });

    it('should pre-fill form', function shouldPreFill() {
      expect(component.form.get('cusip')?.value).toBe('037833100');
      expect(component.form.get('symbol')?.value).toBe('AAPL');
      expect(component.form.get('source')?.value).toBe('OPENFIGI');
    });

    it('should disable cusip field', function shouldDisableCusip() {
      expect(component.form.get('cusip')?.disabled).toBe(true);
    });

    it('should include cusip in raw value', function shouldIncludeCusip() {
      component.form.get('symbol')?.setValue('AAPL2');
      component.form.get('reason')?.setValue('corrected');

      component.onSubmit();

      expect(dialogRefSpy.close).toHaveBeenCalledWith(
        expect.objectContaining({ cusip: '037833100' })
      );
    });
  });
});
