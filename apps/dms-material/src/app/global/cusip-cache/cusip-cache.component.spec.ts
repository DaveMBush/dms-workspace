import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { of, Subject } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ConfirmDialogService } from '../../shared/services/confirm-dialog.service';
import { NotificationService } from '../../shared/services/notification.service';
import { CusipCacheAdminService } from './cusip-cache-admin.service';
import { CusipCacheComponent } from './cusip-cache.component';
import { CusipCacheDialogResult } from './cusip-cache-dialog-result.interface';

describe('CusipCacheComponent', function describeComponent() {
  let component: CusipCacheComponent;
  let fixture: ComponentFixture<CusipCacheComponent>;
  let adminService: CusipCacheAdminService;
  let notificationService: NotificationService;

  beforeEach(async function setup() {
    await TestBed.configureTestingModule({
      imports: [CusipCacheComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(CusipCacheComponent);
    component = fixture.componentInstance;
    adminService = TestBed.inject(CusipCacheAdminService);
    notificationService = TestBed.inject(NotificationService);
  });

  it('should create', function shouldCreate() {
    expect(component).toBeTruthy();
  });

  it('should define displayed columns', function shouldHaveColumns() {
    expect(component.displayedColumns).toContain('cusip');
    expect(component.displayedColumns).toContain('symbol');
    expect(component.displayedColumns).toContain('source');
    expect(component.displayedColumns).toContain('actions');
  });

  it('should define audit columns', function shouldHaveAuditColumns() {
    expect(component.auditColumns).toContain('createdAt');
    expect(component.auditColumns).toContain('action');
    expect(component.auditColumns).toContain('source');
  });

  it('should initialize with empty search', function shouldHaveEmptySearch() {
    expect(component.searchType()).toBe('cusip');
    expect(component.searchValue()).toBe('');
  });

  describe('ngOnInit', function describeInit() {
    it('should fetch stats and audit log', function shouldFetchOnInit() {
      const fetchStatsSpy = vi.spyOn(adminService, 'fetchStats');
      const fetchAuditSpy = vi.spyOn(adminService, 'fetchAuditLog');

      component.ngOnInit();

      expect(fetchStatsSpy).toHaveBeenCalled();
      expect(fetchAuditSpy).toHaveBeenCalled();
    });
  });

  describe('onRefresh', function describeRefresh() {
    it('should re-fetch stats and audit log', function shouldRefresh() {
      const fetchStatsSpy = vi.spyOn(adminService, 'fetchStats');
      const fetchAuditSpy = vi.spyOn(adminService, 'fetchAuditLog');

      component.onRefresh();

      expect(fetchStatsSpy).toHaveBeenCalled();
      expect(fetchAuditSpy).toHaveBeenCalled();
    });
  });

  describe('onSearch', function describeSearch() {
    it('should not search with empty value', function shouldNotSearchEmpty() {
      const searchSpy = vi.spyOn(adminService, 'search');
      component.searchValue.set('');

      component.onSearch();

      expect(searchSpy).not.toHaveBeenCalled();
    });

    it('should search by cusip', function shouldSearchByCusip() {
      const searchSpy = vi.spyOn(adminService, 'search');
      component.searchType.set('cusip');
      component.searchValue.set('037833100');

      component.onSearch();

      expect(searchSpy).toHaveBeenCalledWith('037833100');
    });

    it('should search by symbol', function shouldSearchBySymbol() {
      const searchSpy = vi.spyOn(adminService, 'search');
      component.searchType.set('symbol');
      component.searchValue.set('AAPL');

      component.onSearch();

      expect(searchSpy).toHaveBeenCalledWith(undefined, 'AAPL');
    });

    it('should trim whitespace', function shouldTrimSearch() {
      const searchSpy = vi.spyOn(adminService, 'search');
      component.searchType.set('cusip');
      component.searchValue.set('  037833100  ');

      component.onSearch();

      expect(searchSpy).toHaveBeenCalledWith('037833100');
    });
  });

  describe('onClearSearch', function describeClearSearch() {
    it('should clear value and results', function shouldClear() {
      const clearSpy = vi.spyOn(adminService, 'clearSearch');
      component.searchValue.set('test');

      component.onClearSearch();

      expect(component.searchValue()).toBe('');
      expect(clearSpy).toHaveBeenCalled();
    });
  });

  describe('onAddMapping', function describeAddMapping() {
    let dialogClosedSubject: Subject<CusipCacheDialogResult | undefined>;
    let mockDialogRef: Partial<MatDialogRef<unknown>>;
    let mockDialog: Partial<MatDialog>;

    beforeEach(function setupDialog() {
      dialogClosedSubject = new Subject<CusipCacheDialogResult | undefined>();
      mockDialogRef = {
        afterClosed: vi
          .fn()
          .mockReturnValue(dialogClosedSubject.asObservable()),
      };
      mockDialog = {
        open: vi.fn().mockReturnValue(mockDialogRef),
      };

      Object.defineProperty(component, 'dialog', {
        get: function getDialog() {
          return mockDialog;
        },
        configurable: true,
      });
    });

    it('should open dialog', function shouldOpenDialog() {
      component.onAddMapping();
      expect(mockDialog.open).toHaveBeenCalled();
    });

    it('should add mapping on dialog close with result', function shouldAdd() {
      const addSpy = vi.spyOn(adminService, 'addMapping').mockReturnValue(
        of({
          id: '1',
          cusip: '037833100',
          symbol: 'AAPL',
          source: 'THIRTEENF',
          resolvedAt: null,
          lastUsedAt: null,
          createdAt: '2025-01-01',
          updatedAt: '2025-01-01',
        })
      );
      const notifySpy = vi.spyOn(notificationService, 'success');
      const fetchStatsSpy = vi.spyOn(adminService, 'fetchStats');

      component.onAddMapping();
      dialogClosedSubject.next({
        cusip: '037833100',
        symbol: 'AAPL',
        source: 'THIRTEENF',
        reason: 'test',
      });

      expect(addSpy).toHaveBeenCalledWith(
        '037833100',
        'AAPL',
        'THIRTEENF',
        'test'
      );
      expect(notifySpy).toHaveBeenCalledWith('Mapping added successfully');
      expect(fetchStatsSpy).toHaveBeenCalled();
    });

    it('should not add when dialog cancelled', function shouldNotAdd() {
      const addSpy = vi.spyOn(adminService, 'addMapping');

      component.onAddMapping();
      dialogClosedSubject.next(undefined);

      expect(addSpy).not.toHaveBeenCalled();
    });
  });

  describe('onEditMapping', function describeEditMapping() {
    let dialogClosedSubject: Subject<CusipCacheDialogResult | undefined>;
    let mockDialogRef: Partial<MatDialogRef<unknown>>;
    let mockDialog: Partial<MatDialog>;

    const mockEntry = {
      id: '1',
      cusip: '037833100',
      symbol: 'AAPL',
      source: 'THIRTEENF',
      resolvedAt: null,
      lastUsedAt: null,
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
    };

    beforeEach(function setupDialog() {
      dialogClosedSubject = new Subject<CusipCacheDialogResult | undefined>();
      mockDialogRef = {
        afterClosed: vi
          .fn()
          .mockReturnValue(dialogClosedSubject.asObservable()),
      };
      mockDialog = {
        open: vi.fn().mockReturnValue(mockDialogRef),
      };

      Object.defineProperty(component, 'dialog', {
        get: function getDialog() {
          return mockDialog;
        },
        configurable: true,
      });
    });

    it('should open dialog with entry data', function shouldOpenWithData() {
      component.onEditMapping(mockEntry);
      expect(mockDialog.open).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ data: mockEntry })
      );
    });

    it('should update mapping on dialog close', function shouldUpdate() {
      const addSpy = vi.spyOn(adminService, 'addMapping').mockReturnValue(
        of({
          id: '1',
          cusip: '037833100',
          symbol: 'AAPL2',
          source: 'THIRTEENF',
          resolvedAt: null,
          lastUsedAt: null,
          createdAt: '2025-01-01',
          updatedAt: '2025-01-01',
        })
      );
      const notifySpy = vi.spyOn(notificationService, 'success');

      component.onEditMapping(mockEntry);
      dialogClosedSubject.next({
        cusip: '037833100',
        symbol: 'AAPL2',
        source: 'THIRTEENF',
        reason: 'corrected',
      });

      expect(addSpy).toHaveBeenCalledWith(
        '037833100',
        'AAPL2',
        'THIRTEENF',
        'corrected'
      );
      expect(notifySpy).toHaveBeenCalledWith('Mapping updated successfully');
    });

    it('should refresh search if active', function shouldRefreshSearch() {
      vi.spyOn(adminService, 'addMapping').mockReturnValue(
        of({
          id: '1',
          cusip: '037833100',
          symbol: 'AAPL2',
          source: 'THIRTEENF',
          resolvedAt: null,
          lastUsedAt: null,
          createdAt: '2025-01-01',
          updatedAt: '2025-01-01',
        })
      );
      const searchSpy = vi.spyOn(adminService, 'search');
      component.searchValue.set('037833100');
      component.searchType.set('cusip');

      component.onEditMapping(mockEntry);
      dialogClosedSubject.next({
        cusip: '037833100',
        symbol: 'AAPL2',
        source: 'THIRTEENF',
        reason: '',
      });

      expect(searchSpy).toHaveBeenCalled();
    });
  });

  describe('onDeleteMapping', function describeDeleteMapping() {
    const mockEntry = {
      id: '1',
      cusip: '037833100',
      symbol: 'AAPL',
      source: 'THIRTEENF',
      resolvedAt: null,
      lastUsedAt: null,
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
    };

    it('should call confirm dialog', function shouldConfirm() {
      const confirmSubject = new Subject<boolean>();
      const confirmSpy = vi
        .spyOn(TestBed.inject(ConfirmDialogService), 'confirm')
        .mockReturnValue(confirmSubject.asObservable());

      component.onDeleteMapping(mockEntry);

      expect(confirmSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Delete Cache Entry',
        })
      );
    });

    it('should delete on confirm', function shouldDelete() {
      const confirmSubject = new Subject<boolean>();
      vi.spyOn(TestBed.inject(ConfirmDialogService), 'confirm').mockReturnValue(
        confirmSubject.asObservable()
      );
      const deleteSpy = vi
        .spyOn(adminService, 'deleteMapping')
        .mockReturnValue(of({}));
      const notifySpy = vi.spyOn(notificationService, 'success');

      component.onDeleteMapping(mockEntry);
      confirmSubject.next(true);

      expect(deleteSpy).toHaveBeenCalledWith('1');
      expect(notifySpy).toHaveBeenCalledWith('Cache entry deleted');
    });

    it('should not delete on cancel', function shouldNotDelete() {
      const confirmSubject = new Subject<boolean>();
      vi.spyOn(TestBed.inject(ConfirmDialogService), 'confirm').mockReturnValue(
        confirmSubject.asObservable()
      );
      const deleteSpy = vi.spyOn(adminService, 'deleteMapping');

      component.onDeleteMapping(mockEntry);
      confirmSubject.next(false);

      expect(deleteSpy).not.toHaveBeenCalled();
    });

    it('should re-run search after delete when search is active', function shouldReSearch() {
      const confirmSubject = new Subject<boolean>();
      vi.spyOn(TestBed.inject(ConfirmDialogService), 'confirm').mockReturnValue(
        confirmSubject.asObservable()
      );
      vi.spyOn(adminService, 'deleteMapping').mockReturnValue(of({}));
      const searchSpy = vi.spyOn(adminService, 'search');
      component.searchValue.set('037833100');
      component.searchType.set('cusip');

      component.onDeleteMapping(mockEntry);
      confirmSubject.next(true);

      expect(searchSpy).toHaveBeenCalled();
    });
  });
});
