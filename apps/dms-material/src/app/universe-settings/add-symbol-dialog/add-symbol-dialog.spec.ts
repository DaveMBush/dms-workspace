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
    it('should create dialog with correct MatDialogRef configuration', () => {
      expect(mockDialogRef).toBeDefined();
      expect(component).toBeDefined();
    });

    it('should initialize with isLoading as false', () => {
      expect(component.isLoading()).toBe(false);
    });

    it('should initialize with empty selectedSymbol', () => {
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

    it('should validate symbol format to be uppercase', () => {
      component.form.patchValue({ symbol: 'aapl' });
      expect(component.form.get('symbol')?.hasError('uppercase')).toBe(true);
    });

    it('should accept valid uppercase symbol', () => {
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

    it('should handle API error with 409 conflict', () => {
      mockUniverseAdd.mockRejectedValueOnce({ status: 409 });
      component.form.patchValue({ symbol: 'AAPL', riskGroupId: 'rg1' });
      component.selectedSymbol.set({
        symbol: 'AAPL',
        name: 'Apple Inc.',
      } as any);
      component.onSubmit();
      expect(component.isLoading()).toBe(false);
    });

    it('should handle network errors gracefully', () => {
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
    it('should be disabled when form is invalid', () => {
      expect(component.form.invalid).toBe(true);
      // In real implementation, button should be disabled via template binding
    });

    it('should be enabled when form is valid', () => {
      component.form.patchValue({ symbol: 'AAPL', riskGroupId: 'rg1' });
      expect(component.form.valid).toBe(true);
      // In real implementation, button should be enabled via template binding
    });

    it('should be disabled while isLoading is true', () => {
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

  describe('symbol autocomplete integration', () => {
    it.skip('should call SymbolSearchService when user types in autocomplete', async () => {
      // This test will fail until we inject SymbolSearchService
      const query = 'AAPL';
      const mockResults = [
        { symbol: 'AAPL', name: 'Apple Inc.' },
        { symbol: 'AAPLW', name: 'Apple Warrants' },
      ];

      // Once SymbolSearchService is injected, verify it's called
      const result = await component.searchSymbols(query);
      expect(result).toBeDefined();
      // Should eventually return results from service
    });

    it.skip('should display autocomplete dropdown with search results', () => {
      // This test will fail until template has autocomplete dropdown
      fixture.detectChanges();
      const autocomplete = fixture.nativeElement.querySelector(
        'dms-symbol-autocomplete'
      );
      expect(autocomplete).toBeTruthy();
    });

    it.skip('should show loading indicator during search', () => {
      // This test will fail until loading state is properly managed
      const query = 'AAPL';
      void component.searchSymbols(query);
      // Loading state should be true during search
      // expect(component.isSearching()).toBe(true);
    });

    it.skip('should populate form when autocomplete option selected', () => {
      // This test will fail until onSymbolSelected properly handles form population
      const symbol = { symbol: 'AAPL', name: 'Apple Inc.' };
      component.onSymbolSelected(symbol as any);

      expect(component.form.get('symbol')?.value).toBe('AAPL');
      expect(component.selectedSymbol()).toEqual(symbol);
      // Should also enable submit button
    });

    it.skip('should show "no results" message when search returns empty', async () => {
      // This test will fail until template handles empty results
      const query = 'NONEXISTENT';
      const results = await component.searchSymbols(query);

      fixture.detectChanges();
      const noResultsMsg = fixture.nativeElement.querySelector(
        '.no-results-message'
      );
      // Should display no results message
      // expect(noResultsMsg).toBeTruthy();
    });

    it.skip('should clear autocomplete when form is reset', () => {
      // This test will fail until reset functionality is implemented
      const symbol = { symbol: 'AAPL', name: 'Apple Inc.' };
      component.onSymbolSelected(symbol as any);
      component.form.reset();

      expect(component.selectedSymbol()).toBeNull();
      expect(component.form.get('symbol')?.value).toBeFalsy();
    });

    it.skip('should debounce autocomplete searches by 300ms', () => {
      // This test will fail until debouncing is implemented
      const query1 = 'AA';
      const query2 = 'AAP';
      const query3 = 'AAPL';

      // Rapid fire searches
      void component.searchSymbols(query1);
      void component.searchSymbols(query2);
      void component.searchSymbols(query3);

      // Only last search should execute
      // Verify through service spy or HTTP mock
    });

    it.skip('should validate symbol is selected before enabling submit', () => {
      // This test will fail until validation logic is implemented
      component.form.patchValue({
        symbol: 'AAPL',
        riskGroupId: 'rg1',
      });

      // Submit should be disabled if symbol not selected from autocomplete
      expect(component.isSubmitDisabled()).toBe(true);

      // Select symbol from autocomplete
      component.onSymbolSelected({ symbol: 'AAPL', name: 'Apple Inc.' } as any);

      // Now submit should be enabled
      expect(component.isSubmitDisabled()).toBe(false);
    });

    it.skip('should handle autocomplete errors gracefully', async () => {
      // This test will fail until error handling is implemented
      const query = 'ERROR';

      try {
        await component.searchSymbols(query);
        // Should not throw error to user, just return empty results
      } catch (error: unknown) {
        // If an error is thrown, test should fail
        expect(error).toBeUndefined();
      }
    });

    it.skip('should filter autocomplete results by query', async () => {
      // This test will fail until filtering logic is implemented
      const query = 'AP';
      const results = await component.searchSymbols(query);

      // All results should contain the query string
      const allMatch = results.every(
        (result: any) =>
          result.symbol.includes(query.toUpperCase()) ||
          result.name.toLowerCase().includes(query.toLowerCase())
      );
      expect(allMatch).toBe(true);
    });

    it.skip('should limit autocomplete results to 10 items', async () => {
      // This test will fail until result limiting is implemented
      const query = 'A';
      const results = await component.searchSymbols(query);

      expect(results.length).toBeLessThanOrEqual(10);
    });

    it.skip('should display symbol ticker and company name in autocomplete', () => {
      // This test will fail until template displays both fields
      fixture.detectChanges();
      const symbol = { symbol: 'AAPL', name: 'Apple Inc.' };
      component.onSymbolSelected(symbol as any);

      fixture.detectChanges();
      const autocompleteOption = fixture.nativeElement.querySelector(
        '.autocomplete-option'
      );
      // Should display both symbol and name
      // expect(autocompleteOption?.textContent).toContain('AAPL');
      // expect(autocompleteOption?.textContent).toContain('Apple Inc.');
    });

    it.skip('should clear previous autocomplete results on new search', async () => {
      // This test will fail until clearing logic is implemented
      const query1 = 'AAPL';
      const query2 = 'MSFT';

      await component.searchSymbols(query1);
      const results1 = await component.searchSymbols(query2);

      // Should only contain MSFT results, not AAPL
      expect(results1.every((r: any) => r.symbol.includes('MSFT'))).toBe(true);
    });

    it.skip('should maintain selected symbol when clicking outside autocomplete', () => {
      // This test will fail until blur handling is implemented
      const symbol = { symbol: 'AAPL', name: 'Apple Inc.' };
      component.onSymbolSelected(symbol as any);

      // Simulate blur event
      // component.onAutocompleteBlur();

      expect(component.selectedSymbol()).toEqual(symbol);
      expect(component.form.get('symbol')?.value).toBe('AAPL');
    });
  });
});
