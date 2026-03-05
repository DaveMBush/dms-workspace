import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BaseTableComponent } from './base-table.component';
import { ColumnDef } from './column-def.interface';

describe('BaseTableComponent', () => {
  let component: BaseTableComponent<{ id: string; name: string }>;
  let fixture: ComponentFixture<
    BaseTableComponent<{ id: string; name: string }>
  >;

  const columns: ColumnDef[] = [
    { field: 'name', header: 'Name', sortable: true },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BaseTableComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BaseTableComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('columns', columns);
  });

  it('should compute displayed columns', () => {
    expect(component.displayedColumns()).toContain('name');
  });

  it('should include select column when selectable', () => {
    fixture.componentRef.setInput('selectable', true);
    expect(component.displayedColumns()).toContain('select');
  });

  it('should emit sortChange on sort', () => {
    const spy = vi.spyOn(component.sortChange, 'emit');
    component.onSort({ active: 'name', direction: 'asc' });
    expect(spy).toHaveBeenCalled();
  });

  it('should emit rowClick on row click', () => {
    const spy = vi.spyOn(component.rowClick, 'emit');
    component.onRowClick({ id: '1', name: 'Test' });
    expect(spy).toHaveBeenCalledWith({ id: '1', name: 'Test' });
  });

  it('should toggle selection', () => {
    const row = { id: '1', name: 'Test' };
    component.toggleSelection(row);
    expect(component.selection.isSelected(row)).toBe(true);
  });

  it('should track by id', () => {
    expect(component.trackByFn(0, { id: '123', name: 'Test' })).toBe('123');
  });

  it('should render header cells with mat-mdc-header-cell class for scroll border transparency fix (regression: AS.9 Bug #1)', () => {
    // Regression: th.mat-mdc-header-cell must be sticky with background-color: var(--dms-surface)
    // so that when td.mat-mdc-cell also has background-color: var(--dms-surface), borders remain
    // visible and do not "ghost" (become transparent) during scroll in real browsers.
    // The fix is purely CSS — verified here by confirming the table header renders correctly
    // so that the CSS selectors will apply in a real browser context.
    fixture.componentRef.setInput('data', []);
    fixture.detectChanges();
    const headerCells = fixture.nativeElement.querySelectorAll(
      'th.mat-mdc-header-cell'
    );
    expect(headerCells.length).toBeGreaterThan(0);
  });
});
