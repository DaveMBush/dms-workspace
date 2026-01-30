import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { provideSmartNgRX } from '@smarttools/smart-signals';

// Declare mock functions before vi.mock calls
const mockUniverseAdd = vi.fn();

// Mock upstream selectors BEFORE anything else
vi.mock('../../store/top/selectors/select-top-entities.function', () => ({
  selectTopEntities: vi.fn().mockReturnValue({
    entities: { '1': { id: '1', name: 'Test Entity' } },
  }),
}));

vi.mock('../../store/risk-group/selectors/select-risk-group.function', () => ({
  selectRiskGroup: vi.fn().mockReturnValue([
    { id: 'rg1', name: 'Risk Group 1' },
    { id: 'rg2', name: 'Risk Group 2' },
  ]),
}));

vi.mock('../../store/universe/selectors/select-universes.function', () => ({
  selectUniverses: vi.fn(() => ({
    add: mockUniverseAdd,
  })),
}));

import { AddSymbolDialog } from './add-symbol-dialog';
import { NotificationService } from '../../shared/services/notification.service';

describe('AddSymbolDialog', () => {
  let component: AddSymbolDialog;
  let fixture: ComponentFixture<AddSymbolDialog>;
  let mockDialogRef: { close: ReturnType<typeof vi.fn> };
  let notificationService: NotificationService;

  beforeEach(async () => {
    mockDialogRef = { close: vi.fn() };
    mockUniverseAdd.mockClear();

    await TestBed.configureTestingModule({
      imports: [AddSymbolDialog],
      providers: [
        provideSmartNgRX(),
        { provide: MatDialogRef, useValue: mockDialogRef },
        NotificationService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AddSymbolDialog);
    component = fixture.componentInstance;
    notificationService = TestBed.inject(NotificationService);
  });

  describe('dialog configuration', () => {
    it.skip('should create dialog with correct MatDialogRef configuration', () => {
      expect(mockDialogRef).toBeDefined();
      expect(component).toBeDefined();
    });

    it.skip('should initialize with isLoading as false', () => {
      expect(component.isLoading()).toBe(false);
    });

    it.skip('should initialize with empty selectedSymbol', () => {
      expect(component.selectedSymbol()).toBeNull();
    });
  });

  describe('form', () => {
    it('should have empty form initially', () => {
      expect(component.form.get('symbol')?.value).toBe('');
      expect(component.form.get('riskGroupId')?.value).toBe('');
    });

    it('should require symbol', () => {
      component.form.get('symbol')?.markAsTouched();
      expect(component.form.get('symbol')?.hasError('required')).toBe(true);
    });

    it('should require riskGroupId', () => {
      component.form.get('riskGroupId')?.markAsTouched();
      expect(component.form.get('riskGroupId')?.hasError('required')).toBe(
        true
      );
    });

    it.skip('should validate symbol format to be uppercase', () => {
      component.form.patchValue({ symbol: 'aapl' });
      expect(component.form.get('symbol')?.hasError('uppercase')).toBe(true);
    });

    it.skip('should accept valid uppercase symbol', () => {
      component.form.patchValue({ symbol: 'AAPL' });
      expect(component.form.get('symbol')?.valid).toBe(true);
    });
  });

  describe('onSymbolSelected', () => {
    it('should set selectedSymbol signal', () => {
      const symbol = { symbol: 'AAPL', name: 'Apple Inc.' };
      component.onSymbolSelected(symbol as any);
      expect(component.selectedSymbol()).toEqual(symbol);
    });

    it('should patch form with symbol value', () => {
      const symbol = { symbol: 'AAPL', name: 'Apple Inc.' };
      component.onSymbolSelected(symbol as any);
      expect(component.form.get('symbol')?.value).toBe('AAPL');
    });
  });

  describe('onSubmit', () => {
    it('should not submit invalid form', () => {
      component.onSubmit();
      expect(mockDialogRef.close).not.toHaveBeenCalled();
    });

    it('should mark form as touched on invalid submit', () => {
      const spy = vi.spyOn(component.form, 'markAllAsTouched');
      component.onSubmit();
      expect(spy).toHaveBeenCalled();
    });

    it.skip('should set isLoading and call universeArray.add on valid submit', () => {
      const notifySpy = vi.spyOn(notificationService, 'success');
      component.form.patchValue({ symbol: 'AAPL', riskGroupId: 'rg1' });
      component.selectedSymbol.set({
        symbol: 'AAPL',
        name: 'Apple Inc.',
      } as any);
      component.onSubmit();
      expect(mockUniverseAdd).toHaveBeenCalled();
      expect(notifySpy).toHaveBeenCalledWith('Added AAPL to universe');
    });

    it('should close dialog with data on valid submit', () => {
      component.form.patchValue({ symbol: 'AAPL', riskGroupId: 'rg1' });
      component.selectedSymbol.set({
        symbol: 'AAPL',
        name: 'Apple Inc.',
      } as any);
      component.onSubmit();
      expect(mockDialogRef.close).toHaveBeenCalledWith(
        expect.objectContaining({ symbol: 'AAPL', riskGroupId: 'rg1' })
      );
    });

    it.skip('should handle API error with 409 conflict', () => {
      mockUniverseAdd.mockRejectedValueOnce({ status: 409 });
      component.form.patchValue({ symbol: 'AAPL', riskGroupId: 'rg1' });
      component.selectedSymbol.set({
        symbol: 'AAPL',
        name: 'Apple Inc.',
      } as any);
      component.onSubmit();
      expect(component.isLoading()).toBe(false);
    });

    it.skip('should handle network errors gracefully', () => {
      mockUniverseAdd.mockRejectedValueOnce(new Error('Network error'));
      component.form.patchValue({ symbol: 'AAPL', riskGroupId: 'rg1' });
      component.selectedSymbol.set({
        symbol: 'AAPL',
        name: 'Apple Inc.',
      } as any);
      component.onSubmit();
      expect(component.isLoading()).toBe(false);
    });
  });

  describe('onCancel', () => {
    it('should close dialog with null', () => {
      component.onCancel();
      expect(mockDialogRef.close).toHaveBeenCalledWith(null);
    });
  });

  describe('submit button state', () => {
    it.skip('should be disabled when form is invalid', () => {
      expect(component.form.invalid).toBe(true);
      // In real implementation, button should be disabled via template binding
    });

    it.skip('should be enabled when form is valid', () => {
      component.form.patchValue({ symbol: 'AAPL', riskGroupId: 'rg1' });
      expect(component.form.valid).toBe(true);
      // In real implementation, button should be enabled via template binding
    });

    it.skip('should be disabled while isLoading is true', () => {
      component.isLoading.set(true);
      expect(component.isLoading()).toBe(true);
      // In real implementation, button should be disabled via template binding
    });
  });

  describe('riskGroups', () => {
    it('should return array of risk groups', () => {
      expect(Array.isArray(component.riskGroups)).toBe(true);
    });
  });

  describe('searchSymbols', () => {
    it('should return promise of symbol options', async () => {
      const result = await component.searchSymbols('AAPL');
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
