import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EditableCellComponent } from './editable-cell.component';

describe('EditableCellComponent', () => {
  let component: EditableCellComponent;
  let fixture: ComponentFixture<EditableCellComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditableCellComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EditableCellComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('value', 100);
  });

  it('should display value in non-edit mode', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.display-value')).toBeTruthy();
  });

  it('should enter edit mode on click', () => {
    fixture.detectChanges();
    component.startEdit();
    expect(component.isEditing$()).toBe(true);
    fixture.detectChanges();
  });

  it('should show input in edit mode', () => {
    component.startEdit();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('input')).toBeTruthy();
  });

  it('should save value on saveEdit', () => {
    const spy = vi.spyOn(component.valueChange, 'emit');
    component.startEdit();
    component.onValueChange(200);
    component.saveEdit();
    expect(spy).toHaveBeenCalledWith(200);
  });

  it('should not emit if value unchanged', () => {
    const spy = vi.spyOn(component.valueChange, 'emit');
    component.startEdit();
    component.saveEdit();
    expect(spy).not.toHaveBeenCalled();
  });

  it('should cancel edit without emitting', () => {
    const spy = vi.spyOn(component.valueChange, 'emit');
    component.startEdit();
    component.onValueChange(200);
    component.cancelEdit();
    expect(spy).not.toHaveBeenCalled();
    expect(component.isEditing$()).toBe(false);
  });

  it('should format as currency when format is currency', () => {
    fixture.componentRef.setInput('format', 'currency');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('$');
  });

  it('should allow save after cancel without losing data', () => {
    const spy = vi.spyOn(component.valueChange, 'emit');

    // First edit cycle - cancel
    component.startEdit();
    component.onValueChange(200);
    component.cancelEdit();
    expect(spy).not.toHaveBeenCalled();

    // Second edit cycle - save should work
    component.startEdit();
    component.onValueChange(300);
    component.saveEdit();
    expect(spy).toHaveBeenCalledWith(300);
    expect(component.isEditing$()).toBe(false);
  });
});
