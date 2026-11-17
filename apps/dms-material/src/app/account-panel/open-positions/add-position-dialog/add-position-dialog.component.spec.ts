// Red-phase contract tests (Story 23.1). The two assertions marked RED below
// are intentionally ACTIVE and FAIL against current production code — this is
// the TDD red phase: they encode the behavior Story 23.2 must implement, so
// `pnpm nx test dms-material` fails until then. Do not skip or weaken them;
// Story 23.2's first task confirms these failures, implements (1) a shared
// sanitizer that onQuantityInput and onPriceInput both route through with
// identical accept/reject behavior for the same raw input strings, and (2)
// takeUntilDestroyed teardown of the searchControl.valueChanges subscription,
// then re-runs this suite to confirm it goes green.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SymbolAutocompleteComponent } from '../../../shared/components/symbol-autocomplete/symbol-autocomplete.component';
import { AddPositionData } from './add-position-data.interface';
import { AddPositionDialogComponent } from './add-position-dialog.component';

// Mock selectUniverses to avoid SmartNgRX initialization (same pattern as the account-panel specs)
vi.mock('../../../store/universe/selectors/select-universes.function', () => ({
  selectUniverses: vi.fn().mockReturnValue([]),
}));

describe('AddPositionDialogComponent', () => {
  let component: AddPositionDialogComponent;
  let fixture: ComponentFixture<AddPositionDialogComponent>;
  let mockDialogRef: { close: ReturnType<typeof vi.fn> };
  const mockData: AddPositionData = { accountId: 'test-account' };

  beforeEach(async () => {
    mockDialogRef = { close: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [AddPositionDialogComponent],
      providers: [
        provideNativeDateAdapter(),
        { provide: MAT_DIALOG_DATA, useValue: mockData },
        { provide: MatDialogRef, useValue: mockDialogRef },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AddPositionDialogComponent);
    component = fixture.componentInstance;
  });

  function inputEvent(value: string): Event {
    return { target: { value } } as unknown as Event;
  }

  function getAutocomplete(): SymbolAutocompleteComponent {
    return (
      component as unknown as {
        symbolAutocomplete: SymbolAutocompleteComponent;
      }
    ).symbolAutocomplete;
  }

  // Baseline behavior — NOT skipped, so this file documents the stable current
  // contract. Assertions are deliberately loose (no pinning of the divergent
  // quantity-vs-price sanitization) so they remain true after Story 23.2
  // extracts the shared sanitizer and adds takeUntilDestroyed.

  it('creates a form with symbol, quantity, price and purchase_date controls', () => {
    expect(Object.keys(component.form.controls)).toHaveLength(4);
    expect(component.symbolControl).toBeDefined();
    expect(component.quantityControl).toBeDefined();
    expect(component.priceControl).toBeDefined();
    expect(component.purchaseDateControl).toBeDefined();
  });

  it('onQuantityInput strips non-digit characters from the input value', () => {
    component.onQuantityInput(inputEvent('12a3'));
    expect(component.quantityControl.value).toBe('123');
  });

  it('onPriceInput keeps a single decimal point and caps decimals at five places', () => {
    component.onPriceInput(inputEvent('1.234567'));
    expect(component.priceControl.value).toBe('1.23456');
  });

  it('syncs autocomplete free text into the symbol form control', () => {
    fixture.detectChanges(); // triggers ngAfterViewInit, which subscribes to valueChanges
    getAutocomplete().searchControl.setValue('TEST');
    expect(component.symbolControl.value).toBe('TEST');
  });

  it('onCancel closes the dialog with null', () => {
    component.onCancel();
    expect(mockDialogRef.close).toHaveBeenCalledWith(null);
  });

  // Red-phase assertions — RED against current code; intentionally active so the
  // suite fails until Story 23.2 implements the shared sanitizer + teardown.

  it('routes quantity and price inputs through one shared sanitizer (identical accept/reject for the same raw input)', () => {
    const inputs = ['abc', '-5', '', '3.14'];
    for (const raw of inputs) {
      component.onQuantityInput(inputEvent(raw));
      const quantityResult = component.quantityControl.value;

      component.onPriceInput(inputEvent(raw));
      const priceResult = component.priceControl.value;

      expect(
        priceResult,
        `raw input ${JSON.stringify(raw)}: quantity=${JSON.stringify(quantityResult)}, price=${JSON.stringify(priceResult)}`,
      ).toBe(quantityResult);
    }
  });

  it('tears down the searchControl.valueChanges subscription when destroyed (takeUntilDestroyed)', () => {
    fixture.detectChanges(); // triggers ngAfterViewInit, which subscribes to valueChanges
    const autocomplete = getAutocomplete();
    const setValueSpy = vi.spyOn(component.symbolControl, 'setValue');

    // Emissions before destroy are delivered...
    autocomplete.searchControl.setValue('AAA');
    expect(setValueSpy).toHaveBeenCalledWith('AAA');

    fixture.destroy();
    setValueSpy.mockClear();

    // ...but no emission is delivered after the component is destroyed.
    autocomplete.searchControl.setValue('BBB');
    expect(setValueSpy).not.toHaveBeenCalled();
  });
});
