import { provideHttpClientTesting } from '@angular/common/http/testing';
import { EnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  castTo,
  FacadeBase,
  facadeRegistry,
  rootInjector,
} from '@smarttools/smart-core';
import {
  provideSmartFeatureSignalEntities,
  provideSmartNgRX,
} from '@smarttools/smart-signals';
import { beforeAll, describe, expect, it } from 'vitest';
import { accountEffectsServiceToken } from '../../store/accounts/account-effect-service-token';
import { AccountEffectsService } from '../../store/accounts/account-effect.service';
import { Account } from '../../store/accounts/account.interface';
import { accountsDefinition } from '../../store/accounts/accounts-definition.const';

interface AccountsFacade extends FacadeBase<Account> {
  entityState: {
    ids(): string[];
    entityMap(): Record<string, Account>;
  };
}

async function flushMicrotasks(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Regression test for the real crash site: smart-signals
 * processLoadByIndexesSuccess — `updatedField.indexes[index + array.startIndex]`.
 * When a loadByIndexes HTTP response is undefined (e.g. an empty buffered index
 * range after a virtual-array mutation), this previously threw:
 *   TypeError: Cannot read properties of undefined (reading 'startIndex')
 * The library now guards the undefined response and preserves the existing field.
 */
describe('smart-signals loadByIndexesSuccess startIndex crash', () => {
  let accountsFacade: AccountsFacade;

  beforeAll(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideSmartNgRX(),
        provideHttpClientTesting(),
        {
          provide: accountEffectsServiceToken,
          useClass: AccountEffectsService,
        },
        provideSmartFeatureSignalEntities('app', [accountsDefinition]),
      ],
    }).compileComponents();

    const envInjector = TestBed.inject(EnvironmentInjector);
    rootInjector.set(envInjector);
    await flushMicrotasks();

    accountsFacade = castTo<AccountsFacade>(
      facadeRegistry.register('app', 'accounts'),
    );
  });

  function seedAccount(id: string): Account {
    const acc: Account = {
      id,
      name: 'Repro',
      openTrades: { startIndex: 0, indexes: ['t1'], length: 1 },
      soldTrades: { startIndex: 0, indexes: [], length: 0 },
      divDeposits: { startIndex: 0, indexes: [], length: 0 },
    };
    accountsFacade.storeRows([acc]);
    return acc;
  }

  it('does not throw and preserves the field when array is undefined', () => {
    const acc = seedAccount('acc-repro');
    expect(() => {
      accountsFacade.loadByIndexesSuccess(acc.id, 'openTrades', undefined);
    }).not.toThrow();
    // The existing virtual-array contents are preserved.
    const stored = accountsFacade.entityState.entityMap()[acc.id];
    expect(stored.openTrades.indexes).toEqual(['t1']);
    expect(stored.openTrades).toHaveLength(1);
  });

  it('applies the response when it has a valid startIndex', () => {
    const acc = seedAccount('acc-repro2');
    accountsFacade.loadByIndexesSuccess(acc.id, 'openTrades', {
      startIndex: 0,
      indexes: ['t9'],
      length: 1,
    });
    const stored = accountsFacade.entityState.entityMap()[acc.id];
    expect(stored.openTrades.indexes).toEqual(['t9']);
    expect(stored.openTrades).toHaveLength(1);
  });
});
