import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';

import { SummaryService } from '../../global/services/summary.service';
import { currentAccountSignalStore } from '../../store/current-account/current-account.signal-store';
import { SummaryComponent } from './summary.component';

// Mock the entire selectTrades module to avoid SmartNgRX initialization
vi.mock('../../store/trades/selectors/select-trades.function', () => ({
  selectTrades: vi.fn().mockReturnValue([]),
}));

// Mock selectAccounts to avoid SmartNgRX initialization from currentAccountSignalStore
vi.mock('../../store/accounts/selectors/select-accounts.function', () => ({
  selectAccounts: vi.fn().mockReturnValue([]),
}));

// Mock selectAccountChildren to avoid SmartNgRX initialization
vi.mock(
  '../../store/trades/selectors/select-account-children.function',
  () => ({
    selectAccountChildren: vi.fn().mockReturnValue({ entities: {} }),
  })
);

describe('SummaryComponent', () => {
  let component: SummaryComponent;
  let fixture: ComponentFixture<SummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SummaryComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SummaryComponent);
    component = fixture.componentInstance;
  });

  it('should compute allocation data', () => {
    fixture.detectChanges();
    const data = component.allocationData;
    expect(data.labels).toBeDefined();
    expect(data.datasets.length).toBeGreaterThan(0);
  });

  it('should compute performance data', () => {
    fixture.detectChanges();
    const data = component.performanceData;
    expect(data.labels).toBeDefined();
    expect(data.datasets.length).toBeGreaterThan(0);
  });

  it('should compute total value', () => {
    fixture.detectChanges();
    expect(component.totalValue).toBeDefined();
  });

  it('should compute total gain', () => {
    fixture.detectChanges();
    expect(component.totalGain).toBeDefined();
  });

  it('should compute gain percent', () => {
    fixture.detectChanges();
    expect(component.gainPercent).toBeDefined();
  });

  it('should render summary display components', () => {
    fixture.detectChanges();
    const charts = fixture.nativeElement.querySelectorAll(
      'dms-summary-display'
    );
    expect(charts.length).toBeGreaterThan(0);
  });
});

// DISABLE TESTS FOR CI - Will be enabled in implementation story AU.4
// These tests verify that the summary screen properly integrates with
// account selection, refreshing data when the selected account changes.
describe.skip('SummaryComponent - Account Selection Integration', () => {
  let component: SummaryComponent;
  let fixture: ComponentFixture<SummaryComponent>;
  let mockSummaryService: {
    summary: WritableSignal<{
      deposits: number;
      dividends: number;
      capitalGains: number;
      equities: number;
      income: number;
      // eslint-disable-next-line @typescript-eslint/naming-convention -- matches Summary interface
      tax_free_income: number;
    }>;
    graph: WritableSignal<Array<{ date: string; value: number }>>;
    months: WritableSignal<Array<{ label: string; value: string }>>;
    accountMonths: WritableSignal<Array<{ label: string; value: string }>>;
    years: WritableSignal<number[]>;
    loading: WritableSignal<boolean>;
    error: WritableSignal<string | null>;
    fetchSummary: ReturnType<typeof vi.fn>;
    fetchGraph: ReturnType<typeof vi.fn>;
    fetchMonths: ReturnType<typeof vi.fn>;
    fetchYears: ReturnType<typeof vi.fn>;
    invalidateMonthsCache: ReturnType<typeof vi.fn>;
  };
  let mockCurrentAccountStore: {
    selectCurrentAccountId: WritableSignal<string>;
    setCurrentAccountId: ReturnType<typeof vi.fn>;
  };

  function createDefaultSummary(): {
    deposits: number;
    dividends: number;
    capitalGains: number;
    equities: number;
    income: number;
    // eslint-disable-next-line @typescript-eslint/naming-convention -- matches Summary interface
    tax_free_income: number;
  } {
    return {
      deposits: 0,
      dividends: 0,
      capitalGains: 0,
      equities: 0,
      income: 0,
      tax_free_income: 0,
    };
  }

  beforeEach(async () => {
    mockCurrentAccountStore = {
      selectCurrentAccountId: signal<string>(''),
      setCurrentAccountId: vi.fn(),
    };

    mockSummaryService = {
      summary: signal(createDefaultSummary()),
      graph: signal([]),
      months: signal([]),
      accountMonths: signal([]),
      years: signal([]),
      loading: signal(false),
      error: signal(null),
      fetchSummary: vi.fn(),
      fetchGraph: vi.fn(),
      fetchMonths: vi.fn(),
      fetchYears: vi.fn(),
      invalidateMonthsCache: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [SummaryComponent],
      providers: [
        { provide: SummaryService, useValue: mockSummaryService },
        {
          provide: currentAccountSignalStore,
          useValue: mockCurrentAccountStore,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SummaryComponent);
    component = fixture.componentInstance;
  });

  describe('subscribes to account selection changes', () => {
    it('should react when the selected account ID changes', () => {
      fixture.detectChanges();

      // Simulate account change via the store
      mockCurrentAccountStore.selectCurrentAccountId.set('acc-123');
      fixture.detectChanges();

      // Component should have triggered a data refresh for the new account
      expect(mockSummaryService.fetchSummary).toHaveBeenCalled();
    });

    it('should not fetch data when account ID is empty', () => {
      fixture.detectChanges();

      mockCurrentAccountStore.selectCurrentAccountId.set('');
      fixture.detectChanges();

      // No call should have been made with an empty account ID
      for (const call of mockSummaryService.fetchSummary.mock.calls) {
        expect(call[2]).not.toBe('');
      }
    });
  });

  describe('data refresh on account change', () => {
    it('should call fetchSummary with new account ID when account changes', () => {
      fixture.detectChanges();

      mockCurrentAccountStore.selectCurrentAccountId.set('acc-456');
      fixture.detectChanges();

      expect(mockSummaryService.fetchSummary).toHaveBeenCalledWith(
        expect.any(String),
        expect.anything(),
        'acc-456'
      );
    });

    it('should call fetchGraph with new account ID when account changes', () => {
      fixture.detectChanges();

      mockCurrentAccountStore.selectCurrentAccountId.set('acc-456');
      fixture.detectChanges();

      expect(mockSummaryService.fetchGraph).toHaveBeenCalledWith(
        expect.anything(),
        'acc-456',
        expect.anything()
      );
    });

    it('should call fetchMonths with new account ID when account changes', () => {
      fixture.detectChanges();

      mockCurrentAccountStore.selectCurrentAccountId.set('acc-456');
      fixture.detectChanges();

      expect(mockSummaryService.fetchMonths).toHaveBeenCalledWith(
        'acc-456',
        expect.anything()
      );
    });

    it('should refresh all data when switching between accounts', () => {
      fixture.detectChanges();

      // Switch to first account
      mockCurrentAccountStore.selectCurrentAccountId.set('acc-100');
      fixture.detectChanges();

      const callCountAfterFirst =
        mockSummaryService.fetchSummary.mock.calls.length;

      // Switch to second account
      mockCurrentAccountStore.selectCurrentAccountId.set('acc-200');
      fixture.detectChanges();

      // Should have additional calls for the second account
      expect(mockSummaryService.fetchSummary.mock.calls.length).toBeGreaterThan(
        callCountAfterFirst
      );
    });
  });

  describe('correct account ID passed to service calls', () => {
    it('should pass the current account ID to fetchSummary', () => {
      fixture.detectChanges();

      mockCurrentAccountStore.selectCurrentAccountId.set('acc-789');
      fixture.detectChanges();

      const lastCall =
        mockSummaryService.fetchSummary.mock.calls[
          mockSummaryService.fetchSummary.mock.calls.length - 1
        ];
      expect(lastCall[2]).toBe('acc-789');
    });

    it('should use updated account ID after rapid account switches', () => {
      fixture.detectChanges();

      // Rapid account switches
      mockCurrentAccountStore.selectCurrentAccountId.set('acc-1');
      mockCurrentAccountStore.selectCurrentAccountId.set('acc-2');
      mockCurrentAccountStore.selectCurrentAccountId.set('acc-3');
      fixture.detectChanges();

      // The most recent call should use the latest account ID
      const lastCall =
        mockSummaryService.fetchSummary.mock.calls[
          mockSummaryService.fetchSummary.mock.calls.length - 1
        ];
      expect(lastCall[2]).toBe('acc-3');
    });

    it('should pass account ID along with selected month', () => {
      fixture.detectChanges();

      mockCurrentAccountStore.selectCurrentAccountId.set('acc-555');
      fixture.detectChanges();

      // fetchSummary should receive both month and account ID
      expect(mockSummaryService.fetchSummary).toHaveBeenCalledWith(
        expect.stringMatching(/^\d{4}-\d{2}$/),
        expect.anything(),
        'acc-555'
      );
    });
  });

  describe('loading states during account switch', () => {
    it('should show loading state when account changes', () => {
      fixture.detectChanges();

      mockSummaryService.loading.set(true);
      mockCurrentAccountStore.selectCurrentAccountId.set('acc-new');
      fixture.detectChanges();

      // Component should reflect loading state
      expect(mockSummaryService.loading()).toBe(true);
    });

    it('should clear loading state after data loads for new account', () => {
      fixture.detectChanges();

      mockSummaryService.loading.set(true);
      mockCurrentAccountStore.selectCurrentAccountId.set('acc-new');
      fixture.detectChanges();

      // Simulate data load completing
      mockSummaryService.loading.set(false);
      mockSummaryService.summary.set({
        deposits: 50000,
        dividends: 1000,
        capitalGains: 2000,
        equities: 30000,
        income: 15000,
        tax_free_income: 10000,
      });
      fixture.detectChanges();

      expect(mockSummaryService.loading()).toBe(false);
      expect(mockSummaryService.summary().deposits).toBe(50000);
    });

    it('should handle error state during account switch', () => {
      fixture.detectChanges();

      mockCurrentAccountStore.selectCurrentAccountId.set('acc-bad');
      mockSummaryService.error.set('Failed to fetch summary');
      mockSummaryService.loading.set(false);
      fixture.detectChanges();

      expect(mockSummaryService.error()).toBe('Failed to fetch summary');
      expect(mockSummaryService.loading()).toBe(false);
    });

    it('should clear previous account data while loading new account', () => {
      // Set initial data for first account
      mockSummaryService.summary.set({
        deposits: 100000,
        dividends: 5000,
        capitalGains: 10000,
        equities: 60000,
        income: 30000,
        tax_free_income: 20000,
      });
      fixture.detectChanges();

      // Switch account - loading starts
      mockCurrentAccountStore.selectCurrentAccountId.set('acc-other');
      mockSummaryService.loading.set(true);
      fixture.detectChanges();

      // Should be in loading state while fetching new account data
      expect(mockSummaryService.loading()).toBe(true);
    });
  });

  describe('month selection with account context', () => {
    it('should pass account ID when month selection changes', () => {
      fixture.detectChanges();
      mockCurrentAccountStore.selectCurrentAccountId.set('acc-month-test');
      fixture.detectChanges();

      // Simulate month change
      component.selectedMonth.setValue('2025-06');
      fixture.detectChanges();

      // fetchSummary should be called with both month and account
      expect(mockSummaryService.fetchSummary).toHaveBeenCalledWith(
        '2025-06',
        expect.anything(),
        'acc-month-test'
      );
    });

    it('should fetch account-specific months list', () => {
      fixture.detectChanges();

      mockCurrentAccountStore.selectCurrentAccountId.set('acc-months');
      fixture.detectChanges();

      expect(mockSummaryService.fetchMonths).toHaveBeenCalledWith(
        'acc-months',
        expect.anything()
      );
    });
  });
});
