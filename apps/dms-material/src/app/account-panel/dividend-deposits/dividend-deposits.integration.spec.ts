import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { EnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { castTo, FacadeBase, facadeRegistry, rootInjector } from '@smarttools/smart-core';
import { provideSmartFeatureSignalEntities, provideSmartNgRX } from '@smarttools/smart-signals';
import { beforeAll, describe, expect, it } from 'vitest';

// NOTE: NO static imports of any selector module that calls createSmartSignal.
// Those run facadeRegistry.register(feature, entity) at import time, before the
// facade constructor is registered by provideSmartFeatureSignalEntities' bootstrap
// microtask. We import them dynamically AFTER bootstrap + microtask flush instead.

import { Account } from '../../store/accounts/account.interface';
import { DivDeposit } from '../../store/div-deposits/div-deposit.interface';
// Type-only: the VALUE import of DividendDepositsComponentService reaches
// createSmartSignal('app','top') at module load (via currentAccountSignalStore),
// which runs before bootstrap registers the facade and crashes collection. We
// dynamic-import it in beforeAll after bootstrap instead. `import type` is erased
// at runtime, so it does not trigger that registration.
import type { DividendDepositsComponentService } from './dividend-deposits-component.service';

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
 * Story 4.1 AC#2 + AC#3 — post-add divDeposits state integrity against a REAL
 * SmartNgRX store (bootstrap pattern copied from add-position.integration.spec.ts).
 *
 * This is a SEPARATE file on purpose: dividend-deposits-component.service.spec.ts
 * carries module-level vi.mock() calls for selectCurrentAccountSignal and
 * selectDivDepositTypes that would prevent the real store from bootstrapping in
 * the same file. The existing unit spec stays unskipped and green; this file holds
 * the red-phase (it.skip) assertions that Story 4.2 will unskip, confirm failing,
 * then fix until green.
 */
describe('DividendDepositsComponentService divDeposits state integrity (Story 4.1 AC#2)', () => {
  let service: DividendDepositsComponentService;
  let accountsFacade: AccountsFacade;
  // Captured in beforeAll after bootstrap (see note on the type-only import above).
  let currentAccountStore: { setCurrentAccountId(id: string): void };

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

    // Import AFTER bootstrap: both modules reach createSmartSignal('app','top') and
    // would crash collection if imported statically at module load (before the facade
    // constructor is registered). See the type-only import note above.
    const { DividendDepositsComponentService } = await import(
      './dividend-deposits-component.service'
    );
    const { currentAccountSignalStore } = await import(
      '../../store/current-account/current-account.signal-store'
    );

    service = TestBed.inject(DividendDepositsComponentService);
    currentAccountStore = currentAccountSignalStore;
    accountsFacade = castTo<AccountsFacade>(facadeRegistry.register('app', 'accounts'));
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

  /** Read the stored divDeposits virtual array for an account back from the facade. */
  function readDivDeposits(id: string): { startIndex?: number; indexes: string[]; length: number } {
    const after = accountsFacade.entityState.entityMap()[id];
    return after.divDeposits as unknown as { startIndex?: number; indexes: string[]; length: number };
  }

  /** Point the service's currentAccount at the seeded account. */
  function setCurrent(id: string): void {
    currentAccountStore.setCurrentAccountId(id);
  }

  // RED PHASE (Story 4.1 AC#4): skipped until SmartArray.add()/addToStore preserves
  // startIndex on the parent virtual array. Unskipped, this fails with:
  //   AssertionError: expected 'undefined' to be 'number'
  it.skip('keeps divDeposits.startIndex a number after SmartArray.add() persists the new deposit', async () => {
    seedCounter += 1;
    const accountId = `acc-div-integrity-${seedCounter}`;
    seedAccount(accountId);
    setCurrent(accountId);

    service.addDivDeposit({ divDepositTypeId: 'type-1' });
    await flushMicrotasks();

    const va = readDivDeposits(accountId);
    expect(typeof va.startIndex).toBe('number');
  });

  // RED PHASE (Story 4.1 AC#4): skipped per story — part of the same state-integrity
  // block; kept red alongside the startIndex assertion until the fix lands.
  it.skip('appends the hardcoded deposit id "new" to divDeposits.indexes', async () => {
    seedCounter += 1;
    const accountId = `acc-div-integrity-${seedCounter}`;
    seedAccount(accountId);
    setCurrent(accountId);

    service.addDivDeposit({ divDepositTypeId: 'type-1' });
    await flushMicrotasks();

    const va = readDivDeposits(accountId);
    expect(Array.isArray(va.indexes)).toBe(true);
    expect(va.indexes).toContain('new');
  });

  // RED PHASE (Story 4.1 AC#4): skipped per story — part of the same state-integrity
  // block; kept red alongside the startIndex assertion until the fix lands.
  it.skip('increments divDeposits.length by exactly one', async () => {
    seedCounter += 1;
    const accountId = `acc-div-integrity-${seedCounter}`;
    seedAccount(accountId);
    setCurrent(accountId);
    const priorLength = readDivDeposits(accountId).length;

    service.addDivDeposit({ divDepositTypeId: 'type-1' });
    await flushMicrotasks();

    const va = readDivDeposits(accountId);
    expect(va.length).toBe(priorLength + 1);
  });

  // RED PHASE (Story 4.1 AC#3): navigation-simulation / no-throw assertion for the
  // div-deposit path. After the add, re-evaluate the computed signal that reads the
  // virtual array (DividendDepositsComponentService.dividends()) and iterate every
  // index — each access must return a row object or string placeholder id and never
  // throw on an undefined/missing startIndex. This is the navigation crash Dave
  // reports: adding a deposit then navigating away re-evaluates this computed signal.
  it.skip('re-evaluating dividends() after addDivDeposit does not throw for any index', async () => {
    seedCounter += 1;
    const accountId = `acc-div-integrity-${seedCounter}`;
    seedAccount(accountId);
    setCurrent(accountId);

    service.addDivDeposit({ divDepositTypeId: 'type-1' });
    await flushMicrotasks();

    // Re-evaluate the computed signal that reads the virtual array (navigation).
    let rows: unknown[] = [];
    expect(() => {
      rows = service.dividends() as unknown[];
    }).not.toThrow();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      // Each access returns a row object or a string placeholder id — never throws.
      expect(row !== undefined && typeof row === 'object').toBe(true);
    }
  });
});
