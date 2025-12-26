import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { VirtualTableDataSource } from './virtual-table-data-source';

describe('VirtualTableDataSource', () => {
  let dataSource: VirtualTableDataSource<{ id: string; name: string }>;
  let mockLoadFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    mockLoadFn = vi.fn().mockReturnValue(of({ data: [], total: 0 }));
    dataSource = new VirtualTableDataSource(mockLoadFn);
  });

  afterEach(() => {
    dataSource.disconnect();
  });

  it('should call loadFn on loadInitialData', () => {
    dataSource.loadInitialData();
    expect(mockLoadFn).toHaveBeenCalledWith({ first: 0, rows: 50 });
  });

  it('should emit loading state', () => {
    return new Promise<void>((resolve) => {
      mockLoadFn.mockReturnValue(
        of({ data: [{ id: '1', name: 'Test' }], total: 1 })
      );
      dataSource.loadingObservable.subscribe((loading) => {
        if (!loading) {
          resolve();
        }
      });
      dataSource.loadInitialData();
    });
  });

  it('should cache loaded data', () => {
    mockLoadFn.mockReturnValue(
      of({ data: [{ id: '1', name: 'Test' }], total: 10 })
    );
    dataSource.loadInitialData();
    expect(dataSource.getData().length).toBe(1);
  });

  it('should return total records', () => {
    mockLoadFn.mockReturnValue(of({ data: [], total: 100 }));
    dataSource.loadInitialData();
    expect(dataSource.getTotalRecords()).toBe(100);
  });

  it('should update single row', () => {
    mockLoadFn.mockReturnValue(
      of({ data: [{ id: '1', name: 'Test' }], total: 1 })
    );
    dataSource.loadInitialData();
    dataSource.updateRow(0, { id: '1', name: 'Updated' });
    expect(dataSource.getData()[0].name).toBe('Updated');
  });
});
