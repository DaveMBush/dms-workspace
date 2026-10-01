import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { EnvironmentInjector, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { castTo, FacadeBase, facadeRegistry, rootInjector } from '@smarttools/smart-core';
import { provideSmartFeatureSignalEntities, provideSmartNgRX } from '@smarttools/smart-signals';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

// NOTE: NO static imports of any selector module that calls createSmartSignal.
// Those run facadeRegistry.register(feature, entity) at import time, before the
// facade constructor is registered by provideSmartFeatureSignalEntities' bootstrap
// microtask. We import them dynamically AFTER bootstrap + microtask flush instead.

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

/**
 * Integration test for the add-position flow. Unlike add-position.service.spec.ts
 * (which mocks the trades signal), this drives AddPositionService through a REAL
 * SmartNgRX store: it bootstraps the actual entity definitions + effect services,
 * seeds an account row with an empty openTrades virtual array, and verifies that
 * calling the dialog-close handler actually appends the new trade to the accounts
 * facade's stored virtual array via smart-core's addToStore.
 *
 * The store is bootstrapped ONCE (beforeAll) because provideSmartFeatureSignalEntities
 * registers into module-level registries that persist across tests in a file; re-running
 * it per test throws "Entity already registered". Each test uses its own account id for
 * isolation instead of clearing the shared store.
 */
describe('AddPositionService (real SmartNgRX store)', () => {
  let service: AddPositionService;
  let accountsFacade: AccountsFacade;

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

  // The AddPositionService is a singleton shared across tests (bootstrapped once) and
  // does not reset its own messages between calls, so clear them before each test.
  beforeEach(() => {
    service.clearMessages();
  });

  /** Seed a fresh account with empty child virtual arrays and return its id. */
  function seedAccount(id: string): Account {
    const acc: Account = {
      id,
      name: `Test ${id}`,
      openTrades: { startIndex: 0, indexes: [], length: 0 },
      soldTrades: { startIndex: 0, indexes: [], length: 0 },
      divDeposits: { startIndex: 0, indexes: [], length: 0 },
    };
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

  it('appends the new trade to the account openTrades virtual array via SmartArray.add()', async () => {
    const accountId = 'acc-add';
    seedAccount(accountId);
    const { handler } = await wireHandler(accountId);

    // Sanity: the underlying proxy is a real SmartArray with an add method.
    const { selectAccountChildren } = await import(
      '../../store/trades/selectors/select-account-children.function'
    );
    const proxy = selectAccountChildren().entities[accountId]!.openTrades as unknown as {
      add?: unknown;
      length: number;
    };
    expect(typeof proxy.add).toBe('function');
    expect(proxy).toHaveLength(0);

    handler({
      symbol: 'PDI',
      universeId: 'universe-1',
      quantity: 10,
      price: 55.5,
      purchase_date: '2024-01-15',
    });
    await flushMicrotasks();

    // Success message set synchronously by the service.
    expect(service.getSuccessMessage()()).toBe('Position added successfully');
    expect(service.getErrorMessage()()).toBe('');

    // The trade row was appended to the stored virtual array via smart-core's addToStore.
    const va = readOpenTrades(accountId);
    expect(va.indexes).toContain('new');
    expect(va).toHaveLength(1);
  });

  it('does not append a row when validation fails', async () => {
    const accountId = 'acc-invalid';
    seedAccount(accountId);
    const { handler } = await wireHandler(accountId);

    // Missing universeId -> validation fails.
    handler({ symbol: 'PDI', universeId: '', quantity: 10, price: 55.5, purchase_date: '2024-01-15' });
    await flushMicrotasks();

    expect(service.getErrorMessage()()).toBe('All fields are required');
    expect(service.getSuccessMessage()()).toBe('');

    const va = readOpenTrades(accountId);
    expect(va.indexes).not.toContain('new');
    expect(va).toHaveLength(0);
  });

  it('does nothing when the dialog result is null', async () => {
    const accountId = 'acc-null';
    seedAccount(accountId);
    const { handler } = await wireHandler(accountId);

    handler(null);
    await flushMicrotasks();

    expect(service.getErrorMessage()()).toBe('');
    expect(service.getSuccessMessage()()).toBe('');

    const va = readOpenTrades(accountId);
    expect(va.indexes).not.toContain('new');
    expect(va).toHaveLength(0);
  });
});
