import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
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
      imports: [AddSymbolDialog, NoopAnimationsModule],
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

    it('should set isLoading and call universeArray.add on valid submit', () => {
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
  });

  describe('onCancel', () => {
    it('should close dialog with null', () => {
      component.onCancel();
      expect(mockDialogRef.close).toHaveBeenCalledWith(null);
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
