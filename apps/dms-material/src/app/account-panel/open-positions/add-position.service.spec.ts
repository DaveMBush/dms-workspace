import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { EnvironmentInjector, signal, Signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { castTo, FacadeBase, facadeRegistry, rootInjector } from '@smarttools/smart-core';
import { provideSmartFeatureSignalEntities, provideSmartNgRX } from '@smarttools/smart-signals';
import { beforeAll, describe, expect, it, vi } from 'vitest';

// NOTE: This is a UNIT test. It mocks the SmartNgRX trades proxy (see
// createMockTradesSignal below) and does NOT bootstrap the real store. The
// end-to-end "real SmartNgRX store" coverage lives in add-position.integration.spec.ts,
// which bootstraps provideSmartFeatureSignalEntities('app', [...]) once per file.

import { Account } from '../../store/accounts/account.interface';
import { CurrentAccount } from '../../store/current-account/current-account.interface';
import { Trade } from '../../store/trades/trade.interface';
import { AddPositionDialogResult } from './add-position-dialog-result.interface';
import { AddPositionService } from './add-position.service';

// Effect service modules are safe to import statically: they extend EffectService
// and inject HttpClient, but do NOT call createSmartSignal (only selectors do).
import { AccountEffectsService } from '../../store/accounts/account-effect.service';
import { accountEffectsServiceToken } from '../../store/accounts/account-effect-service-token';
import { TradeEffectsService } from '../../store/trades/trade-effect.service';
import { tradeEffectsServiceToken } from '../../store/trades/trade-effect-service-token';
import { TopEffectsService } from '../../store/top/top-effect.service';
import { topEffectsServiceToken } from '../../store/top/top-effect-service-token';
import { UniverseEffectsService } from '../../store/universe/universe-effect.service';
import { universeEffectsServiceToken } from '../../store/universe/universe-effect-service-token';
import { ScreenEffectsService } from '../../store/screen/screen-effect.service';
import { screenEffectsServiceToken } from '../../store/screen/screen-effect-service-token';
import { DivDepositsEffectsService } from '../../store/div-deposits/div-deposits-effect.service';
import { divDepositsEffectsServiceToken } from '../../store/div-deposits/div-deposits-effect-service-token';
import { DivDepositTypesEffectsService } from '../../store/div-deposit-types/div-deposit-types-effect.service';
import { divDepositTypesEffectsServiceToken } from '../../store/div-deposit-types/div-deposit-types-effect-service-token';
import { RiskGroupEffectsService } from '../../store/risk-group/risk-group-effect.service';
import { riskGroupEffectsServiceToken } from '../../store/risk-group/risk-group-effect-service-token';

// Entity definitions (safe to import statically: only interfaces + tokens).
import { accountsDefinition } from '../../store/accounts/accounts-definition.const';
import { openTradesDefinition } from '../../store/trades/open-trades-definition.const';
import { soldTradesDefinition } from '../../store/trades/sold-trades-definition.const';
import { divDepositDefinition } from '../../store/div-deposits/div-deposit-definition.const';
import { divDepositTypesDefinition } from '../../store/div-deposit-types/div-deposit-types-definition.const';
import { riskGroupDefinition } from '../../store/risk-group/risk-group-definition.const';
import { screenDefinition } from '../../store/screen/screen-definition.const';
import { topDefinition } from '../../store/top/top-definition.const';
import { universeDefinition } from '../../store/universe/universe-definition.const';

interface AccountsFacade extends FacadeBase<Account> {
  entityState: {
    ids(): string[];
    entityMap(): Record<string, Account>;
  };
}

async function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

// Mock of the SmartNgRX proxy array that `trades()` resolves to. The service
// casts it to SmartArray and calls `.add(tradeData, currentAccount)`.
function createMockTradesSignal(): {
  signal: Signal<Trade[]>;
  add: ReturnType<typeof vi.fn>;
} {
  const add = vi.fn();
  return { signal: signal({ add } as unknown as Trade[]), add };
}

// A fully-populated dialog result that passes validation.
function createValidResult(
  overrides: Partial<AddPositionDialogResult> = {},
): AddPositionDialogResult {
  return {
    symbol: 'PDI',
    universeId: 'universe-1',
    quantity: 10,
    price: 55.5,
    purchase_date: '2024-01-15',
    ...overrides,
  };
}

const validAccountId = 'acc-1';

describe('AddPositionService', () => {
  let service: AddPositionService;
  let currentAccount: Signal<CurrentAccount>;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AddPositionService);
    currentAccount = signal<CurrentAccount>({ id: validAccountId });
  });

  describe('message signals (initial state)', () => {
    it('exposes an empty error message initially', () => {
      expect(service.getErrorMessage()()).toBe('');
    });

    it('exposes an empty success message initially', () => {
      expect(service.getSuccessMessage()()).toBe('');
    });
  });

  describe('clearMessages', () => {
    it('resets both messages to empty after a failed add', () => {
      const { signal: trades } = createMockTradesSignal();
      const handler = service.createDialogCloseHandler(
        trades,
        currentAccount,
        validAccountId,
      );

      // Trigger the validation error path.
      handler({ ...createValidResult(), universeId: '' });
      expect(service.getErrorMessage()()).toBe('All fields are required');

      service.clearMessages();
      expect(service.getErrorMessage()()).toBe('');
      expect(service.getSuccessMessage()()).toBe('');
    });
  });

  describe('createDialogCloseHandler', () => {
    it('returns a function', () => {
      const { signal: trades } = createMockTradesSignal();
      const handler = service.createDialogCloseHandler(
        trades,
        currentAccount,
        validAccountId,
      );
      expect(typeof handler).toBe('function');
    });

    it('does nothing when the dialog result is null', () => {
      const { signal: trades, add } = createMockTradesSignal();
      const handler = service.createDialogCloseHandler(
        trades,
        currentAccount,
        validAccountId,
      );

      handler(null);

      expect(add).not.toHaveBeenCalled();
      expect(service.getErrorMessage()()).toBe('');
      expect(service.getSuccessMessage()()).toBe('');
    });

    describe('validation', () => {
      const invalidCases: Array<{
        label: string;
        result: AddPositionDialogResult;
      }> = [
        {
          label: 'missing universeId',
          result: createValidResult({ universeId: undefined }),
        },
        {
          label: 'empty universeId',
          result: createValidResult({ universeId: '' }),
        },
        {
          label: 'undefined quantity',
          result: createValidResult({ quantity: undefined }),
        },
        {
          label: 'undefined price',
          result: createValidResult({ price: undefined }),
        },
        {
          label: 'missing purchase_date',
          result: createValidResult({ purchase_date: undefined }),
        },
        {
          label: 'empty purchase_date',
          result: createValidResult({ purchase_date: '' }),
        },
      ];

      it.each(invalidCases)(
        'rejects $label with "All fields are required"',
        ({ result }) => {
          const { signal: trades, add } = createMockTradesSignal();
          const handler = service.createDialogCloseHandler(
            trades,
            currentAccount,
            validAccountId,
          );

          handler(result);

          expect(service.getErrorMessage()()).toBe('All fields are required');
          expect(service.getSuccessMessage()()).toBe('');
          expect(add).not.toHaveBeenCalled();
        },
      );

      it.each([null, ''])('rejects when accountId is %p', (accountId) => {
        const { signal: trades, add } = createMockTradesSignal();
        const handler = service.createDialogCloseHandler(
          trades,
          currentAccount,
          accountId,
        );

        handler(createValidResult());

        expect(service.getErrorMessage()()).toBe('All fields are required');
        expect(add).not.toHaveBeenCalled();
      });
    });

    describe('successful add', () => {
      it('adds the transformed trade and sets a success message', () => {
        const { signal: trades, add } = createMockTradesSignal();
        const handler = service.createDialogCloseHandler(
          trades,
          currentAccount,
          validAccountId,
        );

        handler(createValidResult());

        expect(add).toHaveBeenCalledTimes(1);
        expect(add).toHaveBeenCalledWith(
          {
            id: 'new',
            universeId: 'universe-1',
            symbol: 'PDI',
            quantity: 10,
            buy: 55.5,
            buy_date: '2024-01-15',
            sell: 0,
            accountId: validAccountId,
            expected_dollars: 0,
            last_dollars_unrealized_gain_percent: 0,
            unrealized_gain_dollars: 0,
            target_gain: 0,
            target_sell: 0,
            last_price: 0,
          },
          { id: validAccountId },
        );
        expect(service.getSuccessMessage()()).toBe(
          'Position added successfully',
        );
        expect(service.getErrorMessage()()).toBe('');
      });

      it('defaults symbol to an empty string when not provided', () => {
        const { signal: trades, add } = createMockTradesSignal();
        const handler = service.createDialogCloseHandler(
          trades,
          currentAccount,
          validAccountId,
        );

        handler(createValidResult({ symbol: undefined }));

        expect(add).toHaveBeenCalledTimes(1);
        const tradeData = add.mock.calls[0][0] as Trade;
        expect(tradeData.symbol).toBe('');
      });

      it('clears the success message after 3 seconds', () => {
        vi.useFakeTimers();
        try {
          const { signal: trades } = createMockTradesSignal();
          const handler = service.createDialogCloseHandler(
            trades,
            currentAccount,
            validAccountId,
          );

          handler(createValidResult());
          expect(service.getSuccessMessage()()).toBe(
            'Position added successfully',
          );

          vi.advanceTimersByTime(2999);
          expect(service.getSuccessMessage()()).toBe(
            'Position added successfully',
          );

          vi.advanceTimersByTime(1);
          expect(service.getSuccessMessage()()).toBe('');
        } finally {
          vi.useRealTimers();
        }
      });
    });

    describe('error handling', () => {
      it('sets an error message when the proxy add throws', () => {
        const { signal: trades, add } = createMockTradesSignal();
        add.mockImplementation(function throwOnAdd(): void {
          throw new Error('boom');
        });
        const handler = service.createDialogCloseHandler(
          trades,
          currentAccount,
          validAccountId,
        );

        handler(createValidResult());

        expect(service.getErrorMessage()()).toBe(
          'Failed to add position: boom',
        );
        expect(service.getSuccessMessage()()).toBe('');
      });
    });
  });
});

// Story 4.1 AC#1 — post-add openTrades state integrity against a REAL SmartNgRX
// store (bootstrap pattern copied from add-position.integration.spec.ts). This is
// a SEPARATE top-level describe on purpose: the first block's beforeEach calls
// TestBed.configureTestingModule({}) and would clobber the real-store bootstrap.
describe('AddPositionService openTrades state integrity (Story 4.1 AC#1)', () => {
  let service: AddPositionService;
  let accountsFacade: AccountsFacade;

  // Unique account id per test so tests never share a row in the shared store.
  let seedCounter = 0;

  beforeAll(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideSmartNgRX(),
        provideHttpClient(),
        provideHttpClientTesting(),
        // Effect services resolved from root injector by provideSmartFeatureSignalEntities.
        { provide: accountEffectsServiceToken, useClass: AccountEffectsService },
        { provide: tradeEffectsServiceToken, useClass: TradeEffectsService },
        { provide: topEffectsServiceToken, useClass: TopEffectsService },
        { provide: universeEffectsServiceToken, useClass: UniverseEffectsService },
        { provide: screenEffectsServiceToken, useClass: ScreenEffectsService },
        { provide: divDepositsEffectsServiceToken, useClass: DivDepositsEffectsService },
        { provide: divDepositTypesEffectsServiceToken, useClass: DivDepositTypesEffectsService },
        { provide: riskGroupEffectsServiceToken, useClass: RiskGroupEffectsService },
        // Register the entity definitions (mirrors app.routes.ts). This schedules
        // the facade-registration microtask for each entity at bootstrap.
        provideSmartFeatureSignalEntities('app', [
          topDefinition,
          accountsDefinition,
          universeDefinition,
          screenDefinition,
          riskGroupDefinition,
          openTradesDefinition,
          soldTradesDefinition,
          divDepositDefinition,
          divDepositTypesDefinition,
        ]),
      ],
    }).compileComponents();

    // Set the root injector (normally done by provideSmartNgRX's APP_INITIALIZER,
    // which does not auto-run in TestBed). This flushes the queued effect-service
    // registrations into serviceRegistry.
    const envInjector = TestBed.inject(EnvironmentInjector);
    rootInjector.set(envInjector);

    // Flush the facade-registration microtask from provideSmartFeatureSignalEntities.
    await flushMicrotasks();

    service = TestBed.inject(AddPositionService);
    accountsFacade = castTo<AccountsFacade>(facadeRegistry.register('app', 'accounts'));
  });

  beforeEach(() => {
    // The AddPositionService is a singleton shared across tests and does not reset
    // its own messages between calls, so clear them before each test.
    service.clearMessages();
  });

  /** Seed a fresh account with empty child virtual arrays and return its id. */
  function seedAccount(id: string): Account {
    const acc = {
      id,
      name: `Test ${id}`,
      openTrades: { startIndex: 0, indexes: [], length: 0 },
      soldTrades: { startIndex: 0, indexes: [], length: 0 },
      divDeposits: { startIndex: 0, indexes: [], length: 0 },
    } as unknown as Account;
    accountsFacade.upsertRow(acc);
    return acc;
  }

  /** Read the stored openTrades virtual array for an account back from the facade. */
  function readOpenTrades(id: string): { startIndex?: number; indexes: string[]; length: number } {
    const after = accountsFacade.entityState.entityMap()[id];
    return after.openTrades as unknown as { startIndex?: number; indexes: string[]; length: number };
  }

  /**
   * Build the exact wiring OpenPositionsComponent uses (account-panel.component.ts):
   * a signal that resolves to the account's real openTrades SmartArray proxy, plus a
   * currentAccount signal reading the seeded row back through the real selector.
   */
  async function wireHandler(id: string): Promise<{
    handler(result: AddPositionDialogResult | null): void;
  }> {
    const { selectAccountChildren } = await import(
      '../../store/trades/selectors/select-account-children.function'
    );
    const accountsState = selectAccountChildren();
    const acc = accountsState.entities[id] as unknown as Account;
    // The service calls trades() — it expects a Signal, not the raw proxy.
    const tradesSignal = signal(acc.openTrades as Trade[]);
    const currentAccountSignal = signal<CurrentAccount>({ id });
    return { handler: service.createDialogCloseHandler(tradesSignal, currentAccountSignal, id) };
  }

  // RED PHASE (Story 4.1 AC#4): skipped until the service preserves startIndex
  // through SmartArray.add()/addToStore. Unskipped, this fails with:
  //   AssertionError: expected 'undefined' to be 'number'
  it.skip('keeps startIndex a number after SmartArray.add() persists the new trade', async () => {
    seedCounter += 1;
    const accountId = `acc-integrity-${seedCounter}`;
    seedAccount(accountId);
    const { handler } = await wireHandler(accountId);

    handler({
      symbol: 'PDI',
      universeId: 'universe-1',
      quantity: 10,
      price: 55.5,
      purchase_date: '2024-01-15',
    });
    await flushMicrotasks();

    const va = readOpenTrades(accountId);
    expect(typeof va.startIndex).toBe('number');
  });

  // RED PHASE (Story 4.1 AC#4): skipped per story — part of the same state-integrity
  // block; kept red alongside the startIndex assertion until the fix lands.
  it.skip('appends the hardcoded trade id "new" to openTrades.indexes', async () => {
    seedCounter += 1;
    const accountId = `acc-integrity-${seedCounter}`;
    seedAccount(accountId);
    const { handler } = await wireHandler(accountId);

    handler({
      symbol: 'PDI',
      universeId: 'universe-1',
      quantity: 10,
      price: 55.5,
      purchase_date: '2024-01-15',
    });
    await flushMicrotasks();

    const va = readOpenTrades(accountId);
    expect(Array.isArray(va.indexes)).toBe(true);
    expect(va.indexes[va.indexes.length - 1]).toBe('new');
  });

  // RED PHASE (Story 4.1 AC#4): skipped per story — part of the same state-integrity
  // block; kept red alongside the startIndex assertion until the fix lands.
  it.skip('increments openTrades.length by exactly one', async () => {
    seedCounter += 1;
    const accountId = `acc-integrity-${seedCounter}`;
    seedAccount(accountId);
    const priorLength = readOpenTrades(accountId).length;
    const { handler } = await wireHandler(accountId);

    handler({
      symbol: 'PDI',
      universeId: 'universe-1',
      quantity: 10,
      price: 55.5,
      purchase_date: '2024-01-15',
    });
    await flushMicrotasks();

    const va = readOpenTrades(accountId);
    expect(va.length).toBe(priorLength + 1);
  });
});
