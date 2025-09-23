import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { MessageService } from 'primeng/api';
import { of, throwError } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';

import type { Account } from '../../store/accounts/account.interface';
import type { Trade } from '../../store/trades/trade.interface';
import { calculateTradeTotals } from './account-data-calculator.function';
import { UniverseDataService } from './universe-data.service';
import { GlobalUniverseComponent } from './global-universe.component';
import { UniverseSyncService } from '../../shared/services/universe-sync.service';
import { UpdateUniverseSettingsService } from '../../universe-settings/update-universe.service';
import { GlobalLoadingService } from '../../shared/services/global-loading.service';

// Mock the selector functions
const {
  mockSelectAccountChildren,
  mockSelectUniverses,
  mockSelectAccounts,
  mockSelectUniverse,
  mockSelectTopEntities,
  mockSelectRiskGroup,
} = vi.hoisted(() => ({
  mockSelectAccountChildren: vi.fn(),
  mockSelectUniverses: vi.fn(),
  mockSelectAccounts: vi.fn(() => []),
  mockSelectUniverse: vi.fn(() => []),
  mockSelectTopEntities: vi.fn(() => ({})),
  mockSelectRiskGroup: vi.fn(() => []),
}));

vi.mock(
  '../../store/trades/selectors/select-account-children.function',
  () => ({
    selectAccountChildren: mockSelectAccountChildren,
  })
);

vi.mock('../../store/universe/selectors/select-universes.function', () => ({
  selectUniverses: mockSelectUniverses,
}));

vi.mock('../../store/accounts/selectors/select-accounts.function', () => ({
  selectAccounts: mockSelectAccounts,
}));

vi.mock('./universe.selector', () => ({
  selectUniverse: mockSelectUniverse,
}));

vi.mock('../../store/top/selectors/select-top-entities.function', () => ({
  selectTopEntities: mockSelectTopEntities,
}));

vi.mock('../../store/risk-group/selectors/select-risk-group.function', () => ({
  selectRiskGroup: mockSelectRiskGroup,
}));

describe('Integration Tests - End-to-End Data Flow', () => {
  let service: UniverseDataService;

  const ACCOUNT_ID = 'test-account-1';
  const ACCOUNT_2_ID = 'test-account-2';
  const UNIVERSE_AAPL_ID = 'universe-aapl';
  const UNIVERSE_MSFT_ID = 'universe-msft';
  const AAPL_SYMBOL = 'AAPL';
  const MSFT_SYMBOL = 'MSFT';

  beforeEach(() => {
    vi.clearAllMocks();
    service = new UniverseDataService();
  });

  describe('complete end-to-end data flow', () => {
    test('calculates from trades through universe data to final yield display', () => {
      // Setup mock universes
      mockSelectUniverses.mockReturnValue([
        {
          id: UNIVERSE_AAPL_ID,
          symbol: AAPL_SYMBOL,
          distribution: 0.25,
          distributions_per_year: 4,
          last_price: 150.0,
        },
        {
          id: UNIVERSE_MSFT_ID,
          symbol: MSFT_SYMBOL,
          distribution: 0.5,
          distributions_per_year: 4,
          last_price: 200.0,
        },
      ]);

      // Setup mock account data with trades
      mockSelectAccountChildren.mockReturnValue({
        entities: {
          [ACCOUNT_ID]: {
            id: ACCOUNT_ID,
            name: 'Test Account',
            trades: [
              {
                id: 'trade-1',
                universeId: UNIVERSE_AAPL_ID,
                accountId: ACCOUNT_ID,
                buy: 120.0,
                quantity: 100,
                sell_date: undefined,
              } as Trade,
              {
                id: 'trade-2',
                universeId: UNIVERSE_AAPL_ID,
                accountId: ACCOUNT_ID,
                buy: 130.0,
                quantity: 50,
                sell_date: undefined,
              } as Trade,
              {
                id: 'trade-3',
                universeId: UNIVERSE_MSFT_ID,
                accountId: ACCOUNT_ID,
                buy: 180.0,
                quantity: 40,
                sell_date: undefined,
              } as Trade,
            ],
          } as Partial<Account>,
        },
      });

      // Test complete flow for AAPL
      const aaplData = service.getAccountSpecificData(AAPL_SYMBOL, ACCOUNT_ID);

      // Verify position calculation
      expect(aaplData.position).toBe(18500); // (120*100 + 130*50)

      // Verify weighted average yield calculation
      // Weighted avg price: (120*100 + 130*50) / (100+50) = 18500/150 = 123.33
      // Expected yield: 100 * 4 * (0.25 / 123.33) = 0.81%
      expect(aaplData.avg_purchase_yield_percent).toBeCloseTo(0.81, 2);

      // Test complete flow for MSFT
      const msftData = service.getAccountSpecificData(MSFT_SYMBOL, ACCOUNT_ID);

      // Verify position calculation
      expect(msftData.position).toBe(7200); // (180*40)

      // Verify yield calculation
      // Expected yield: 100 * 4 * (0.5 / 180) = 1.11%
      expect(msftData.avg_purchase_yield_percent).toBeCloseTo(1.11, 2);
    });

    test('handles multi-account aggregation through calculateTradeTotals', () => {
      mockSelectUniverses.mockReturnValue([
        {
          id: UNIVERSE_AAPL_ID,
          symbol: AAPL_SYMBOL,
          distribution: 0.25,
          distributions_per_year: 4,
          last_price: 150.0,
        },
      ]);

      mockSelectAccountChildren.mockReturnValue({
        entities: {
          [ACCOUNT_ID]: {
            id: ACCOUNT_ID,
            trades: [
              {
                id: 'trade-1',
                universeId: UNIVERSE_AAPL_ID,
                accountId: ACCOUNT_ID,
                buy: 100.0,
                quantity: 100,
                sell_date: undefined,
              } as Trade,
            ],
          } as Partial<Account>,
          [ACCOUNT_2_ID]: {
            id: ACCOUNT_2_ID,
            trades: [
              {
                id: 'trade-2',
                universeId: UNIVERSE_AAPL_ID,
                accountId: ACCOUNT_2_ID,
                buy: 120.0,
                quantity: 50,
                sell_date: undefined,
              } as Trade,
            ],
          } as Partial<Account>,
        },
      });

      // Test the direct calculation method that aggregates across all accounts
      const { totalCost, totalQuantity } = calculateTradeTotals(
        UNIVERSE_AAPL_ID,
        'all'
      );

      // Verify the totals are calculated correctly across both accounts
      expect(totalCost).toBe(16000); // (100*100 + 120*50)
      expect(totalQuantity).toBe(150); // (100 + 50)

      // Calculate expected yield manually to verify the math
      const avgPrice = totalCost / totalQuantity; // 16000/150 = 106.67
      const expectedYield = 100 * 4 * (0.25 / avgPrice); // 100 * 4 * (0.25 / 106.67) = 0.94%
      expect(expectedYield).toBeCloseTo(0.94, 2);
    });

    test('integrates with filtering and sorting end-to-end', () => {
      const mockDisplayData = [
        {
          symbol: AAPL_SYMBOL,
          riskGroup: 'Growth',
          distribution: 0.25,
          distributions_per_year: 4,
          last_price: 150.0,
          most_recent_sell_date: null,
          most_recent_sell_price: null,
          ex_date: new Date('2024-03-15'),
          yield_percent: 0.667,
          avg_purchase_yield_percent: 8.33,
          expired: false,
          position: 1200.0,
        },
        {
          symbol: MSFT_SYMBOL,
          riskGroup: 'Conservative',
          distribution: 0.5,
          distributions_per_year: 4,
          last_price: 200.0,
          most_recent_sell_date: null,
          most_recent_sell_price: null,
          ex_date: new Date('2024-03-20'),
          yield_percent: 1.0,
          avg_purchase_yield_percent: 6.5,
          expired: false,
          position: 2000.0,
        },
      ];

      const filterParams = {
        rawData: mockDisplayData,
        sortCriteria: [{ field: 'avg_purchase_yield_percent', order: -1 }], // Descending
        minYield: null,
        selectedAccount: ACCOUNT_ID,
        symbolFilter: '',
        riskGroupFilter: null,
        expiredFilter: null,
      };

      const result = service.filterAndSortUniverses(filterParams);

      // Should be sorted by avg_purchase_yield_percent descending
      expect(result[0].symbol).toBe(AAPL_SYMBOL); // 8.33% yield
      expect(result[1].symbol).toBe(MSFT_SYMBOL); // 6.5% yield
    });
  });

  describe('edge cases and error handling', () => {
    test('handles empty trade arrays gracefully', () => {
      mockSelectUniverses.mockReturnValue([
        {
          id: UNIVERSE_AAPL_ID,
          symbol: AAPL_SYMBOL,
          distribution: 0.25,
          distributions_per_year: 4,
          last_price: 150.0,
        },
      ]);

      mockSelectAccountChildren.mockReturnValue({
        entities: {
          [ACCOUNT_ID]: {
            id: ACCOUNT_ID,
            trades: [], // Empty trades
          } as Partial<Account>,
        },
      });

      const result = service.getAccountSpecificData(AAPL_SYMBOL, ACCOUNT_ID);

      expect(result.position).toBe(0);
      expect(result.avg_purchase_yield_percent).toBe(0);
    });

    test('handles missing universe data', () => {
      mockSelectUniverses.mockReturnValue([]); // No universes
      mockSelectAccountChildren.mockReturnValue({ entities: {} });

      const result = service.getAccountSpecificData('NONEXISTENT', ACCOUNT_ID);

      expect(result.position).toBe(0);
      expect(result.avg_purchase_yield_percent).toBe(0);
    });

    test('handles account switching scenarios', () => {
      mockSelectUniverses.mockReturnValue([
        {
          id: UNIVERSE_AAPL_ID,
          symbol: AAPL_SYMBOL,
          distribution: 0.25,
          distributions_per_year: 4,
          last_price: 150.0,
        },
      ]);

      mockSelectAccountChildren.mockReturnValue({
        entities: {
          [ACCOUNT_ID]: {
            id: ACCOUNT_ID,
            trades: [
              {
                id: 'trade-1',
                universeId: UNIVERSE_AAPL_ID,
                accountId: ACCOUNT_ID,
                buy: 100.0,
                quantity: 100,
                sell_date: undefined,
              } as Trade,
            ],
          } as Partial<Account>,
          [ACCOUNT_2_ID]: {
            id: ACCOUNT_2_ID,
            trades: [
              {
                id: 'trade-2',
                universeId: UNIVERSE_AAPL_ID,
                accountId: ACCOUNT_2_ID,
                buy: 200.0,
                quantity: 50,
                sell_date: undefined,
              } as Trade,
            ],
          } as Partial<Account>,
        },
      });

      // Test first account
      const account1Data = service.getAccountSpecificData(
        AAPL_SYMBOL,
        ACCOUNT_ID
      );
      expect(account1Data.avg_purchase_yield_percent).toBeCloseTo(1.0, 1); // 100 * 4 * (0.25 / 100)

      // Test second account
      const account2Data = service.getAccountSpecificData(
        AAPL_SYMBOL,
        ACCOUNT_2_ID
      );
      expect(account2Data.avg_purchase_yield_percent).toBeCloseTo(0.5, 1); // 100 * 4 * (0.25 / 200)
    });
  });
});

describe('GlobalUniverseComponent Toast Notifications', () => {
  let component: GlobalUniverseComponent;
  let fixture: ComponentFixture<GlobalUniverseComponent>;
  let messageService: MessageService;
  let universeSyncService: UniverseSyncService;
  let updateUniverseService: UpdateUniverseSettingsService;
  let globalLoadingService: GlobalLoadingService;

  beforeEach(async () => {
    const universeSyncServiceSpy = {
      syncFromScreener: vi.fn(),
      isSyncing: vi.fn().mockReturnValue(false),
    };
    const globalLoadingServiceSpy = {
      show: vi.fn(),
      hide: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [GlobalUniverseComponent],
      providers: [
        provideHttpClient(),
        { provide: UniverseSyncService, useValue: universeSyncServiceSpy },
        { provide: GlobalLoadingService, useValue: globalLoadingServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GlobalUniverseComponent);
    component = fixture.componentInstance;
    // Get the MessageService from the component's own injector (viewProviders)
    messageService = fixture.debugElement.injector.get(MessageService);
    // Spy on the add method of the component's messageService instance
    vi.spyOn(component.messageService, 'add');
    universeSyncService = TestBed.inject(UniverseSyncService);
    // Get UpdateUniverseSettingsService from component's own injector too
    updateUniverseService = fixture.debugElement.injector.get(
      UpdateUniverseSettingsService
    );
    globalLoadingService = TestBed.inject(GlobalLoadingService);
  });

  describe('syncUniverse persistent toast notifications', () => {
    test('should show persistent success toast on successful universe sync', () => {
      const mockSummary = { inserted: 5, updated: 3, markedExpired: 1 };
      const syncFromScreenerSpy = vi.fn().mockReturnValue(of(mockSummary));
      universeSyncService.syncFromScreener = syncFromScreenerSpy;

      component.syncUniverse();

      // Wait for the observable to complete by checking if the spy was called
      expect(syncFromScreenerSpy).toHaveBeenCalled();

      // eslint-disable-next-line @typescript-eslint/unbound-method -- Test spy access
      expect(component.messageService.add).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'success',
          summary: 'Universe Updated',
          sticky: true,
        })
      );
    });

    test('should show persistent error toast on universe sync failure', () => {
      const syncFromScreenerSpy = vi
        .fn()
        .mockReturnValue(throwError(() => new Error('Sync failed')));
      universeSyncService.syncFromScreener = syncFromScreenerSpy;

      component.syncUniverse();

      // eslint-disable-next-line @typescript-eslint/unbound-method -- Test spy access
      expect(component.messageService.add).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'error',
          summary: 'Update Failed',
          sticky: true,
        })
      );
    });
  });

  describe('updateFields persistent toast notifications', () => {
    test('should show persistent success toast on successful fields update', () => {
      const updateFieldsSpy = vi.fn().mockReturnValue(of({}));
      // Spy on the component's own updateUniverseService instance
      vi.spyOn(updateUniverseService, 'updateFields').mockReturnValue(of({}));

      component.updateFields();

      // Verify that updateFields service method was called
      // eslint-disable-next-line @typescript-eslint/unbound-method -- Test spy access
      expect(updateUniverseService.updateFields).toHaveBeenCalled();

      // eslint-disable-next-line @typescript-eslint/unbound-method -- Test spy access
      expect(component.messageService.add).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'success',
          summary: 'Fields Updated',
          sticky: true,
        })
      );
    });

    test('should show persistent error toast on fields update failure', () => {
      // Spy on the component's own updateUniverseService instance
      vi.spyOn(updateUniverseService, 'updateFields').mockReturnValue(
        throwError(() => new Error('Update failed'))
      );

      component.updateFields();

      // eslint-disable-next-line @typescript-eslint/unbound-method -- Test spy access
      expect(component.messageService.add).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'error',
          summary: 'Update Failed',
          sticky: true,
        })
      );
    });
  });

  describe('persistent toast behavior verification', () => {
    test('should verify sticky property is set to true for all operation toasts', () => {
      // Test universe sync success
      vi.spyOn(universeSyncService, 'syncFromScreener').mockReturnValue(
        of({ inserted: 1, updated: 1, markedExpired: 1 })
      );
      component.syncUniverse();

      // Test universe sync error
      vi.spyOn(universeSyncService, 'syncFromScreener').mockReturnValue(
        throwError(() => new Error('Error'))
      );
      component.syncUniverse();

      // Test fields update success
      vi.spyOn(updateUniverseService, 'updateFields').mockReturnValue(of({}));
      component.updateFields();

      // Test fields update error
      vi.spyOn(updateUniverseService, 'updateFields').mockReturnValue(
        throwError(() => new Error('Error'))
      );
      component.updateFields();

      // Verify all toast calls include sticky: true
      const allCalls = (component.messageService.add as any).mock.calls;
      expect(allCalls.length).toBe(4);
      allCalls.forEach((call: any) => {
        expect(call[0]).toHaveProperty('sticky', true);
      });
    });
  });
});
