import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Sort } from '@angular/material/sort';
import { of } from 'rxjs';

import { NotificationService } from '../../shared/services/notification.service';
import { GlobalLoadingService } from '../../shared/services/global-loading.service';
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
    updateScreener: ReturnType<typeof vi.fn>;
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
      updateScreener: vi.fn(),
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

    it('should have has_volitility column', () => {
      const col = component.columns.find(function findHasVolatility(c) {
        return c.field === 'has_volitility';
      });
      expect(col).toBeDefined();
      expect(col?.header).toBe('Has Volatility');
    });

    it('should have objectives_understood column', () => {
      const col = component.columns.find(function findObjectives(c) {
        return c.field === 'objectives_understood';
      });
      expect(col).toBeDefined();
      expect(col?.header).toBe('Objectives Understood');
    });

    it('should have graph_higher_before_2008 column', () => {
      const col = component.columns.find(function findGraph(c) {
        return c.field === 'graph_higher_before_2008';
      });
      expect(col).toBeDefined();
      expect(col?.header).toBe('Graph Higher Before 2008');
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

  describe('cell editing', () => {
    it('should emit cell edit event with correct data for has_volitility', () => {
      const row = {
        id: '1',
        symbol: 'TST',
        has_volitility: false,
      } as Screen;
      const spy = vi.spyOn(component.cellEdit, 'emit');
      component.onCellEdit(row, 'has_volitility', true);
      expect(spy).toHaveBeenCalledWith({
        row,
        field: 'has_volitility',
        value: true,
      });
    });

    it('should call updateScreener for has_volitility', () => {
      const row = {
        id: '1',
        symbol: 'TST',
        has_volitility: false,
      } as Screen;
      component.onCellEdit(row, 'has_volitility', true);
      expect(mockScreenerService.updateScreener).toHaveBeenCalledWith(
        '1',
        'has_volitility',
        true
      );
    });

    it('should emit cell edit event for objectives_understood', () => {
      const row = {
        id: '1',
        symbol: 'TST',
        objectives_understood: false,
      } as Screen;
      const spy = vi.spyOn(component.cellEdit, 'emit');
      component.onCellEdit(row, 'objectives_understood', true);
      expect(spy).toHaveBeenCalledWith({
        row,
        field: 'objectives_understood',
        value: true,
      });
    });

    it('should call updateScreener for objectives_understood', () => {
      const row = {
        id: '1',
        symbol: 'TST',
        objectives_understood: false,
      } as Screen;
      component.onCellEdit(row, 'objectives_understood', true);
      expect(mockScreenerService.updateScreener).toHaveBeenCalledWith(
        '1',
        'objectives_understood',
        true
      );
    });

    it('should emit cell edit event for graph_higher_before_2008', () => {
      const row = {
        id: '1',
        symbol: 'TST',
        graph_higher_before_2008: false,
      } as Screen;
      const spy = vi.spyOn(component.cellEdit, 'emit');
      component.onCellEdit(row, 'graph_higher_before_2008', true);
      expect(spy).toHaveBeenCalledWith({
        row,
        field: 'graph_higher_before_2008',
        value: true,
      });
    });

    it('should call updateScreener for graph_higher_before_2008', () => {
      const row = {
        id: '1',
        symbol: 'TST',
        graph_higher_before_2008: false,
      } as Screen;
      component.onCellEdit(row, 'graph_higher_before_2008', true);
      expect(mockScreenerService.updateScreener).toHaveBeenCalledWith(
        '1',
        'graph_higher_before_2008',
        true
      );
    });

    it('should not call updateScreener for non-boolean fields', () => {
      const row = {
        id: '1',
        symbol: 'TST',
      } as Screen;
      component.onCellEdit(row, 'symbol', 'NEW');
      expect(mockScreenerService.updateScreener).not.toHaveBeenCalled();
    });
  });

  describe('getCefConnectUrl', () => {
    it('should return correct cefconnect URL for symbol', () => {
      const url = component.getCefConnectUrl('TEST');
      expect(url).toBe('https://www.cefconnect.com/fund/TEST');
    });
  });
});
