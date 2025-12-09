import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { FilterOption } from './filter-option.interface';
import { SymbolFilterHeaderComponent } from './symbol-filter-header.component';

describe('SymbolFilterHeaderComponent', () => {
  let component: SymbolFilterHeaderComponent;
  let fixture: ComponentFixture<SymbolFilterHeaderComponent>;

  const mockOptions: FilterOption[] = [
    { value: 'A', label: 'Option A' },
    { value: 'B', label: 'Option B' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SymbolFilterHeaderComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(SymbolFilterHeaderComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('options', mockOptions);
  });

  it('should render mat-select', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('mat-select')).toBeTruthy();
  });

  it('should display label', () => {
    fixture.componentRef.setInput('label', 'Test Filter');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Test Filter');
  });

  it('should emit null for All option', () => {
    const spy = vi.spyOn(component.filterChange, 'emit');
    component.onSelectionChange(null);
    expect(spy).toHaveBeenCalledWith(null);
  });

  it('should emit selected value', () => {
    const spy = vi.spyOn(component.filterChange, 'emit');
    component.onSelectionChange('A');
    expect(spy).toHaveBeenCalledWith('A');
  });
});
