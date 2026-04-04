import { computed, inject, Injectable, Signal, signal } from '@angular/core';
import { RowProxyDelete, SmartArray } from '@smarttools/smart-signals';

import { buildUniverseMap } from '../../shared/build-universe-map.function';
import { Account } from '../../store/accounts/account.interface';
import { currentAccountSignalStore } from '../../store/current-account/current-account.signal-store';
import { selectCurrentAccountSignal } from '../../store/current-account/select-current-account.signal';
import { selectDivDepositTypes } from '../../store/div-deposit-types/selectors/select-div-deposit-types.function';
import { DivDeposit } from '../../store/div-deposits/div-deposit.interface';
import { Universe } from '../../store/universe/universe.interface';

interface DividendRow {
  id: string;
  date: Date;
  amount: number;
  accountId: string;
  divDepositTypeId: string;
  universeId: string | null;
  symbol: string;
  type: string;
}

function buildPlaceholderDividendRow(id: string): DividendRow {
  return {
    id,
    date: new Date(),
    amount: 0,
    accountId: '',
    divDepositTypeId: '',
    universeId: null,
    symbol: '',
    type: '',
  };
}

function buildLoadedDividendRow(
  d: DivDeposit,
  universeMap: Map<string, Universe>,
  typeNamesMap: Map<string, string>
): DividendRow {
  return {
    id: d.id,
    date: d.date,
    amount: d.amount,
    accountId: d.accountId,
    divDepositTypeId: d.divDepositTypeId,
    universeId: d.universeId,
    symbol:
      d.universeId !== null ? universeMap.get(d.universeId)?.symbol ?? '' : '',
    type: typeNamesMap.get(d.divDepositTypeId) ?? '',
  };
}

@Injectable({ providedIn: 'root' })
export class DividendDepositsComponentService {
  private currentAccountStore = inject(currentAccountSignalStore);
  private currentAccount = selectCurrentAccountSignal(this.currentAccountStore);
  private errorMessage = signal<string>('');

  readonly selectedAccountId = signal<string>('');
  readonly visibleRange = signal<{ start: number; end: number }>({
    start: 0,
    end: 50,
  });

  getErrorMessage(): Signal<string> {
    return this.errorMessage.asReadonly();
  }

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- computed signal
  readonly dividends = computed(() => {
    const divDepositsArray = this.currentAccount().divDeposits as DivDeposit[];
    const totalLength = divDepositsArray.length;
    if (totalLength === 0) {
      return [];
    }
    const universeMap = buildUniverseMap();
    const typesList = selectDivDepositTypes();
    const typeNamesMap = new Map<string, string>();
    for (let ti = 0; ti < typesList.length; ti++) {
      typeNamesMap.set(typesList[ti].id, typesList[ti].name);
    }

    const smartArr = divDepositsArray as unknown as {
      getIdAtIndex?(i: number): string | undefined;
    };
    const isProxy = typeof smartArr.getIdAtIndex === 'function';

    const range = this.visibleRange();
    const visStart = Math.max(0, range.start - 20);
    const visEnd = Math.min(totalLength, range.end + 20);

    const result = new Array<DividendRow>(totalLength);

    for (let i = 0; i < totalLength; i++) {
      if (isProxy && !(i >= visStart && i < visEnd)) {
        result[i] = buildPlaceholderDividendRow(
          smartArr.getIdAtIndex!(i) ?? `placeholder-${String(i)}`
        );
        continue;
      }
      const d = divDepositsArray[i];
      if (d === undefined || typeof d === 'string') {
        result[i] = buildPlaceholderDividendRow(`placeholder-${String(i)}`);
        continue;
      }
      result[i] = buildLoadedDividendRow(d, universeMap, typeNamesMap);
    }
    return result;
  });

  addDivDeposit(dividend: Partial<DivDeposit>): void {
    if (
      dividend.divDepositTypeId === undefined ||
      dividend.divDepositTypeId.length === 0
    ) {
      this.errorMessage.set('divDepositTypeId is required');
      return;
    }
    const account = this.currentAccount();
    const divDepositsArray = account.divDeposits as SmartArray<
      Account,
      DivDeposit
    >;
    try {
      divDepositsArray.add!(
        {
          id: 'new',
          date: dividend.date ?? new Date(),
          amount: Number(dividend.amount ?? 0),
          accountId: account.id,
          divDepositTypeId: dividend.divDepositTypeId,
          universeId: dividend.universeId ?? null,
        },
        account
      );
    } catch (error: unknown) {
      const err = error as Error;
      this.errorMessage.set(`Failed to add dividend deposit: ${err.message}`);
    }
  }

  deleteDivDeposit(id: string): void {
    const account = this.currentAccount();
    const divDepositsArray = account.divDeposits as DivDeposit[] &
      SmartArray<Account, DivDeposit>;
    for (let i = 0; i < divDepositsArray.length; i++) {
      const item = divDepositsArray[i] as DivDeposit & RowProxyDelete;
      if (item.id !== id) {
        continue;
      }
      try {
        item.delete!();
      } catch (error: unknown) {
        const err = error as Error;
        this.errorMessage.set(
          `Failed to delete dividend deposit: ${err.message}`
        );
      }
      break;
    }
  }
}
