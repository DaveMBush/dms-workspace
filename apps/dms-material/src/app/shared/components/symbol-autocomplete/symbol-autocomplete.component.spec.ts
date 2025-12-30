import { SymbolOption } from './symbol-option.interface';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SymbolAutocompleteComponent } from './symbol-autocomplete.component';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('SymbolAutocompleteComponent', () => {
  let component: SymbolAutocompleteComponent;
  let fixture: ComponentFixture<SymbolAutocompleteComponent>;
  let mockSearchFn: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    mockSearchFn = vi.fn().mockResolvedValue([
      { symbol: 'AAPL', name: 'Apple Inc.' },
      { symbol: 'AMZN', name: 'Amazon.com Inc.' },
    ]);

    await TestBed.configureTestingModule({
      imports: [SymbolAutocompleteComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SymbolAutocompleteComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('searchFn', mockSearchFn);
  });

  it('should render input field', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('input')).toBeTruthy();
  });

  it('should not search below min length', () => {
    fixture.detectChanges();
    component.searchControl.setValue('A');
    // Should not call search function because length is below minLength (2)
    expect(mockSearchFn).not.toHaveBeenCalled();
  });

  it('should have searchControl', () => {
    fixture.detectChanges();
    expect(component.searchControl).toBeDefined();
    expect(component.searchControl.value).toBeFalsy();
  });

  it('should emit selected option', () => {
    const spy = vi.spyOn(component.symbolSelected, 'emit');
    const option: SymbolOption = { symbol: 'AAPL', name: 'Apple' };
    component.onOptionSelected(option);
    expect(spy).toHaveBeenCalledWith(option);
  });

  it('should display symbol in displayFn', () => {
    expect(component.displayFn({ symbol: 'AAPL', name: 'Apple' })).toBe('AAPL');
  });

  it('should handle string input in displayFn', () => {
    expect(component.displayFn('test')).toBe('test');
  });

  it('should reset control and options', () => {
    component.filteredOptions.set([{ symbol: 'A', name: 'Test' }]);
    component.searchControl.setValue('test');
    component.reset();
    expect(component.searchControl.value).toBeFalsy();
    expect(component.filteredOptions().length).toBe(0);
  });

  it('should initialize with correct default values', () => {
    fixture.detectChanges();
    expect(component.label()).toBe('Symbol');
    expect(component.placeholder()).toBe('Search for a symbol...');
    expect(component.minLength()).toBe(2);
    expect(component.forceSelection()).toBe(true);
    expect(component.isLoading()).toBe(false);
    expect(component.filteredOptions().length).toBe(0);
  });

  it('should have filteredOptions signal', () => {
    fixture.detectChanges();
    expect(component.filteredOptions()).toEqual([]);
  });

  it('should have isLoading signal', () => {
    fixture.detectChanges();
    expect(component.isLoading()).toBe(false);
  });

  it('should display empty string when option is null', () => {
    expect(component.displayFn(null as any)).toBe('');
  });
});
