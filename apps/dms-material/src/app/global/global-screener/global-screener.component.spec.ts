import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Sort } from '@angular/material/sort';
import { of } from 'rxjs';

import { NotificationService } from '../../shared/services/notification.service';
import { GlobalLoadingService } from '../../shared/services/global-loading.service';
import { SortFilterStateService } from '../../shared/services/sort-filter-state.service';
import { Screen } from '../../store/screen/screen.interface';
import { GlobalScreenerComponent } from './global-screener.component';
import { ScreenerService } from './services/screener.service';

// Mock SmartNgRX selectors
vi.mock('../../store/screen/selectors/select-screen.function', () => ({
  selectScreen: vi.fn().mockReturnValue([]),
}));

describe('GlobalScreenerComponent', () => {
  let component: GlobalScreenerComponent;
  let fixture: ComponentFixture<GlobalScreenerComponent>;
  let mockNotification: {
    success: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    info: ReturnType<typeof vi.fn>;
    show: ReturnType<typeof vi.fn>;
  };
  let mockGlobalLoading: {
    show: ReturnType<typeof vi.fn>;
    hide: ReturnType<typeof vi.fn>;
  };
  let mockScreenerService: {
    refresh: ReturnType<typeof vi.fn>;
    loading: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockNotification = {
      success: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      show: vi.fn(),
    };
    mockGlobalLoading = {
      show: vi.fn(),
      hide: vi.fn(),
    };
    mockScreenerService = {
      refresh: vi.fn().mockReturnValue(of(null)),
      loading: vi.fn().mockReturnValue(false),
      error: vi.fn().mockReturnValue(null),
    };

    await TestBed.configureTestingModule({
      imports: [GlobalScreenerComponent],
      providers: [
        { provide: NotificationService, useValue: mockNotification },
        { provide: GlobalLoadingService, useValue: mockGlobalLoading },
        { provide: ScreenerService, useValue: mockScreenerService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GlobalScreenerComponent);
    component = fixture.componentInstance;
  });

  describe('initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should define columns for screener', () => {
      expect(component.columns.length).toBeGreaterThan(0);
      const symbolCol = component.columns.find(function findSymbol(c) {
        return c.field === 'symbol';
      });
      expect(symbolCol).toBeTruthy();
    });

    it('should have symbol column', () => {
      const symbolCol = component.columns.find(function findSymbol(c) {
        return c.field === 'symbol';
      });
      expect(symbolCol).toBeDefined();
      expect(symbolCol?.header).toBe('Symbol');
    });

    it('should have risk_group column', () => {
      const col = component.columns.find(function findRiskGroup(c) {
        return c.field === 'risk_group';
      });
      expect(col).toBeDefined();
      expect(col?.header).toBe('Risk Group');
    });

    it('should initialize riskGroupFilter to null', () => {
      expect(component.riskGroupFilter$()).toBeNull();
    });
  });

  describe('riskGroups', () => {
    it('should have risk groups defined', () => {
      expect(component.riskGroups.length).toBeGreaterThan(0);
    });

    it('should include Equities', () => {
      const equities = component.riskGroups.find(function findEquities(rg) {
        return rg.value === 'Equities';
      });
      expect(equities).toBeDefined();
    });

    it('should include Income', () => {
      const income = component.riskGroups.find(function findIncome(rg) {
        return rg.value === 'Income';
      });
      expect(income).toBeDefined();
    });

    it('should include Tax Free Income', () => {
      const taxFree = component.riskGroups.find(function findTaxFree(rg) {
        return rg.value === 'Tax Free Income';
      });
      expect(taxFree).toBeDefined();
    });
  });

  describe('refresh', () => {
    it('should call screener service refresh', () => {
      component.onRefresh();
      expect(mockScreenerService.refresh).toHaveBeenCalled();
    });

    it('should show notification on successful refresh', () => {
      component.onRefresh();
      expect(mockNotification.show).toHaveBeenCalledWith(
        'Screener data refreshed successfully'
      );
    });
  });

  describe('filtering', () => {
    it('should update riskGroupFilter signal', () => {
      component.onRiskGroupFilterChange('Equities');
      expect(component.riskGroupFilter$()).toBe('Equities');
    });

    it('should allow clearing riskGroupFilter', () => {
      component.onRiskGroupFilterChange('Equities');
      component.onRiskGroupFilterChange(null);
      expect(component.riskGroupFilter$()).toBeNull();
    });
  });

  describe('sorting', () => {
    it('should handle sort change event', () => {
      const sort: Sort = { active: 'risk_group', direction: 'desc' };
      // Sorting is now handled automatically by BaseTableComponent
      // onSortChange is just a placeholder method
      expect(() => component.onSortChange(sort)).not.toThrow();
    });
  });

  describe('getCefConnectUrl', () => {
    it('should return correct cefconnect URL for symbol', () => {
      const url = component.getCefConnectUrl('TEST');
      expect(url).toBe('https://www.cefconnect.com/fund/TEST');
    });
  });

  describe('SmartNgRX Integration', () => {
    beforeEach(() => {
      // Reset the mock before each test
      vi.clearAllMocks();
    });

    it('should display data from screenerService.screens()', () => {
      const mockScreens: Screen[] = [
        {
          id: '1',
          symbol: 'TEST',
          risk_group: 'Equities',
        },
      ];

      mockScreenerService.screens = vi.fn().mockReturnValue(mockScreens);

      fixture.detectChanges();

      const filteredData = component.filteredData$();
      expect(filteredData).toEqual(mockScreens);
    });

    it('should filter by Equities risk group', () => {
      const mockScreens: Screen[] = [
        {
          id: '1',
          symbol: 'A',
          risk_group: 'Equities',
        },
        {
          id: '2',
          symbol: 'B',
          risk_group: 'Income',
        },
      ];

      mockScreenerService.screens = vi.fn().mockReturnValue(mockScreens);

      component.riskGroupFilter$.set('Equities');
      const filtered = component.filteredData$();

      expect(filtered.length).toBe(1);
      expect(filtered[0].symbol).toBe('A');
      expect(filtered[0].risk_group).toBe('Equities');
    });

    it('should filter by Income risk group', () => {
      const mockScreens: Screen[] = [
        {
          id: '1',
          symbol: 'A',
          risk_group: 'Equities',
        },
        {
          id: '2',
          symbol: 'B',
          risk_group: 'Income',
        },
      ];

      mockScreenerService.screens = vi.fn().mockReturnValue(mockScreens);

      component.riskGroupFilter$.set('Income');
      const filtered = component.filteredData$();

      expect(filtered.length).toBe(1);
      expect(filtered[0].symbol).toBe('B');
      expect(filtered[0].risk_group).toBe('Income');
    });

    it('should filter by Tax Free Income risk group', () => {
      const mockScreens: Screen[] = [
        {
          id: '1',
          symbol: 'A',
          risk_group: 'Equities',
        },
        {
          id: '2',
          symbol: 'B',
          risk_group: 'Tax Free Income',
        },
      ];

      mockScreenerService.screens = vi.fn().mockReturnValue(mockScreens);

      component.riskGroupFilter$.set('Tax Free Income');
      const filtered = component.filteredData$();

      expect(filtered.length).toBe(1);
      expect(filtered[0].symbol).toBe('B');
      expect(filtered[0].risk_group).toBe('Tax Free Income');
    });

    it('should return all screens when risk group filter is null', () => {
      const mockScreens: Screen[] = [
        {
          id: '1',
          symbol: 'A',
          risk_group: 'Equities',
        },
        {
          id: '2',
          symbol: 'B',
          risk_group: 'Income',
        },
      ];

      mockScreenerService.screens = vi.fn().mockReturnValue(mockScreens);

      component.riskGroupFilter$.set(null);
      const filtered = component.filteredData$();

      expect(filtered.length).toBe(2);
    });

    it('should return empty array when no screens match filter', () => {
      const mockScreens: Screen[] = [
        {
          id: '1',
          symbol: 'A',
          risk_group: 'Equities',
        },
      ];

      mockScreenerService.screens = vi.fn().mockReturnValue(mockScreens);

      component.riskGroupFilter$.set('Income');
      const filtered = component.filteredData$();

      expect(filtered.length).toBe(0);
    });

    it('should filter data reactively when risk group changes', () => {
      const mockScreens: Screen[] = [
        {
          id: '1',
          symbol: 'A',
          risk_group: 'Equities',
        },
        {
          id: '2',
          symbol: 'B',
          risk_group: 'Income',
        },
      ];

      mockScreenerService.screens = vi.fn().mockReturnValue(mockScreens);

      // Initially no filter
      let filtered = component.filteredData$();
      expect(filtered.length).toBe(2);

      // Apply filter
      component.riskGroupFilter$.set('Equities');
      filtered = component.filteredData$();
      expect(filtered.length).toBe(1);
      expect(filtered[0].risk_group).toBe('Equities');

      // Change filter
      component.riskGroupFilter$.set('Income');
      filtered = component.filteredData$();
      expect(filtered.length).toBe(1);
      expect(filtered[0].risk_group).toBe('Income');

      // Clear filter
      component.riskGroupFilter$.set(null);
      filtered = component.filteredData$();
      expect(filtered.length).toBe(2);
    });
  });
});

describe('GlobalScreenerComponent - Filter State Restoration', () => {
  let mockLoadFilterState: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    mockLoadFilterState = vi.fn().mockReturnValue(null);

    await TestBed.configureTestingModule({
      imports: [GlobalScreenerComponent],
      providers: [
        {
          provide: SortFilterStateService,
          useValue: {
            loadFilterState: mockLoadFilterState,
            saveFilterState: vi.fn(),
            clearFilterState: vi.fn(),
            saveSortState: vi.fn(),
            clearSortState: vi.fn(),
          },
        },
        {
          provide: ScreenerService,
          useValue: {
            refresh: vi.fn().mockReturnValue(of(null)),
            error: vi.fn().mockReturnValue(null),
            screens: vi.fn().mockReturnValue([]),
          },
        },
        {
          provide: NotificationService,
          useValue: { show: vi.fn() },
        },
      ],
    }).compileComponents();
  });

  it('should restore risk group filter from saved state', () => {
    mockLoadFilterState.mockReturnValue({ risk_group: 'Income' });
    const fixture = TestBed.createComponent(GlobalScreenerComponent);
    const component = fixture.componentInstance;

    expect(component.riskGroupFilter$()).toBe('Income');
  });

  it('should default to null when no saved filter state exists', () => {
    mockLoadFilterState.mockReturnValue(null);
    const fixture = TestBed.createComponent(GlobalScreenerComponent);
    const component = fixture.componentInstance;

    expect(component.riskGroupFilter$()).toBeNull();
  });

  it('should silently ignore unknown filter keys', () => {
    mockLoadFilterState.mockReturnValue({ unknown_key: 'test' });
    const fixture = TestBed.createComponent(GlobalScreenerComponent);
    const component = fixture.componentInstance;

    expect(component.riskGroupFilter$()).toBeNull();
  });
});
