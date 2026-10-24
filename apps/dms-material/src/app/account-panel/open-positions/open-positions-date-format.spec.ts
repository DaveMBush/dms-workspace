import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { OpenPosition } from '../../store/trades/open-position.interface';
import { tradeEffectsServiceToken } from '../../store/trades/trade-effect-service-token';
import { Trade } from '../../store/trades/trade.interface';
import { OpenPositionsComponentService } from './open-positions-component.service';
import { OpenPositionsComponent } from './open-positions.component';

// Mock the entire selectOpenTrades module to avoid SmartNgRX initialization.
const { mockSelectTradesFunc } = vi.hoisted(() => {
  const mockAdd = vi.fn();
  const mockSelect = vi.fn().mockReturnValue([]);
  // Make the return value also have an .add() method for SmartNgRX proxy pattern.
  mockSelect.mockReturnValue(Object.assign([], { add: mockAdd }));
  return { mockSelectTradesFunc: mockSelect };
});
vi.mock('../../store/trades/selectors/select-trades.function', () => ({
  selectOpenTrades: mockSelectTradesFunc,
}));

// Mock selectSoldTrades to avoid SmartNgRX initialization.
vi.mock('../../store/trades/selectors/select-sold-trades.function', () => ({
  selectSoldTrades: vi.fn().mockReturnValue([]),
}));

// Mock selectOpenTradeEntity to avoid SmartNgRX initialization.
vi.mock(
  '../../store/trades/selectors/select-open-trade-entity.function',
  () => ({
    selectOpenTradeEntity: vi.fn().mockReturnValue([]),
  }),
);

// Mock selectSoldTradeEntity to avoid SmartNgRX initialization.
vi.mock(
  '../../store/trades/selectors/select-sold-trade-entity.function',
  () => ({
    selectSoldTradeEntity: vi.fn().mockReturnValue([]),
  }),
);

// Mock selectUniverses to avoid SmartNgRX initialization from AddPositionDialogComponent.
vi.mock('../../store/universe/selectors/select-universes.function', () => ({
  selectUniverses: vi.fn().mockReturnValue([]),
}));

// Mock selectTopEntities to avoid SmartNgRX initialization.
vi.mock('../../store/top/selectors/select-top-entities.function', () => ({
  selectTopEntities: vi.fn().mockReturnValue([]),
}));

// Mock selectAccountsEntity to avoid SmartNgRX initialization.
vi.mock(
  '../../store/accounts/selectors/select-accounts-entity.function',
  () => ({
    selectAccountsEntity: vi.fn().mockReturnValue([]),
  }),
);

// Mock selectAccounts to avoid SmartNgRX initialization.
vi.mock('../../store/accounts/selectors/select-accounts.function', () => ({
  selectAccounts: vi.fn().mockReturnValue([]),
}));

// Mock selectDivDepositEntity to avoid SmartNgRX initialization.
vi.mock('../../store/div-deposits/div-deposits.selectors', () => ({
  selectDivDepositEntity: vi.fn().mockReturnValue([]),
}));

// TDD RED Phase: Story 9.1 - consistent MM/DD/YYYY date format in tables (AC #2).
// This sibling spec renders OpenPositionsComponent with a row whose exDate is set and
// asserts the Ex-Date cell text matches the MM/DD/YYYY pattern. The open-positions custom
// #cellTemplate currently renders date columns through the locale-dependent 'shortDate'
// format (open-positions.component.html:101), which under en-US yields M/d/yy (e.g.
// "1/15/26") — NOT zero-padded MM/DD/YYYY. Story 9.2 replaces that with an explicit
// 'MM/dd/yyyy' format; this test is the contract it must satisfy. It is marked it.skip so
// CI stays green until then (AC #3). No production code changes in this story.
describe('OpenPositionsComponent - Ex-Date MM/DD/YYYY rendering', () => {
  let fixture: ComponentFixture<OpenPositionsComponent>;

  beforeEach(async () => {
    // Seed one open position with a known exDate. Per the OpenPosition interface,
    // exDate is `string | null`, so we supply an ISO date string; the DatePipe parses it
    // and formats it through whatever format the template specifies.
    const row: OpenPosition = {
      id: 'pos-1',
      symbol: 'AAPL',
      exDate: '2026-01-15',
      buy: 150,
      buyDate: new Date(2026, 0, 1),
      quantity: 100,
      expectedYield: 7.5,
      sell: 0,
      daysHeld: 14,
      targetGain: 10,
      targetSell: 165,
      lastPrice: 152,
      unrealizedGainPercent: 1.33,
      unrealizedGain: 2,
    };

    const mockSelectOpenPositions = signal<OpenPosition[]>([row]);

    await TestBed.configureTestingModule({
      imports: [OpenPositionsComponent],
      providers: [
        provideRouter([]),
        {
          provide: OpenPositionsComponentService,
          useValue: {
            trades: signal<Trade[]>([]),
            selectOpenPositions: mockSelectOpenPositions,
            deleteOpenPosition: vi.fn(),
            visibleRange: signal<{ start: number; end: number }>({
              start: 0,
              end: 50,
            }),
          },
        },
        {
          provide: tradeEffectsServiceToken,
          useValue: {
            update: vi.fn().mockReturnValue(of([])),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OpenPositionsComponent);

    // jsdom has no layout engine, so the cdk-virtual-scroll-viewport inside dms-base-table
    // reports a zero clientHeight and CDK renders no body rows. Give it a real height (as in
    // base-table-date-format.spec.ts) before change detection so *matRowDef body rows are
    // created for these assertions. The viewport host is static, so it exists immediately
    // after createComponent.
    const viewportEl = fixture.nativeElement.querySelector(
      'cdk-virtual-scroll-viewport',
    );
    Object.defineProperty(viewportEl, 'clientHeight', {
      configurable: true,
      value: 570,
    });

    // Render the table and wait one animation frame so CDK virtual scroll delivers its
    // rendered range and commits *matRowDef body rows to the DOM.
    fixture.detectChanges();
    await new Promise((resolve) => requestAnimationFrame(() => resolve()));
    fixture.detectChanges();
  });

  afterEach(() => {
    // Destroy the fixture so its CDK virtual scroll viewport is torn down and does not leak
    // async init state into later describes in this file.
    fixture.destroy();
  });

  // Placeholder active test to keep vitest from failing on an otherwise all-skipped
  // suite (TDD RED phase convention, see file-upload-validation.spec.ts). The real
  // assertion below is disabled until Story 9.2 lands the 'MM/dd/yyyy' format change.
  it('should have TDD RED phase tests defined', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  // Task 2.1 (AC #2) - the Ex-Date cell renders through Angular's DatePipe with an explicit
  // 'MM/dd/yyyy' format, not the locale-dependent 'shortDate'. In en-US shortDate is "M/d/yy"
  // (e.g. "1/15/26"), which does NOT match zero-padded MM/DD/YYYY; after Story 9.2 it must
  // render as e.g. "01/15/2026". We assert the format pattern (not a fixed day) so the
  // contract holds regardless of the test environment's timezone. Skipped until then (AC #3).
  // eslint-disable-next-line vitest/no-disabled-tests -- BLOCKED: intentionally disabled TDD RED phase test; Story 9.2 removes the skip, confirms red, then implements until green
  it.skip('should render the Ex-Date cell with the MM/DD/YYYY format', () => {
    const exDateCell = fixture.nativeElement.querySelector(
      '.dms-body-cell[data-column="exDate"]',
    );
    expect(
      exDateCell,
      'expected a rendered body cell for column "exDate"',
    ).toBeTruthy();
    expect(exDateCell.textContent?.trim()).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });
});
