import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EditableDateCellComponent } from './editable-date-cell.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatNativeDateModule } from '@angular/material/core';

describe('EditableDateCellComponent', () => {
  let component: EditableDateCellComponent;
  let fixture: ComponentFixture<EditableDateCellComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        EditableDateCellComponent,
        NoopAnimationsModule,
        MatNativeDateModule,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EditableDateCellComponent);
    component = fixture.componentInstance;
    // use timezone-agnostic constructor to avoid UTC/local date shifts in CI
    fixture.componentRef.setInput('value', new Date(2024, 0, 15));
  });

  it('should display formatted date', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('01/15/2024');
  });

  it('should enter edit mode on click', () => {
    fixture.detectChanges();
    component.startEdit();
    expect(component.isEditing()).toBe(true);
  });

  it('should emit new date on change', () => {
    const spy = vi.spyOn(component.valueChange, 'emit');
    const newDate = new Date(2024, 1, 20);
    component.startEdit();
    component.onDateChange(newDate);
    component.onPickerClosed();
    expect(spy).toHaveBeenCalledWith(newDate);
  });

  it('should not emit if date unchanged', () => {
    const spy = vi.spyOn(component.valueChange, 'emit');
    component.startEdit();
    component.onPickerClosed();
    expect(spy).not.toHaveBeenCalled();
  });

  it('should use custom date format', () => {
    fixture.componentRef.setInput('dateFormat', 'yyyy-MM-dd');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('2024-01-15');
  });
});
