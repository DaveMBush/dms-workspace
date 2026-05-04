import { computed, inject, Injectable, Signal, signal } from '@angular/core';
import { RowProxyDelete, SmartArray } from '@smarttools/smart-signals';

import { Account } from '../../store/accounts/account.interface';
import { currentAccountSignalStore } from '../../store/current-account/current-account.signal-store';
import { selectCurrentAccountSignal } from '../../store/current-account/select-current-account.signal';
import { selectDivDepositTypes } from '../../store/div-deposit-types/selectors/select-div-deposit-types.function';
import { DivDeposit } from '../../store/div-deposits/div-deposit.interface';

interface DividendRow {
  id: string;
  date: Date;
  amount: number;
  accountId: string;
  divDepositTypeId: string;
  universeId: string | null;
  symbol: string;
  type: string;
  isLoading?: boolean;
}

/**
 * Scrolling regression history (Epics 29, 31, 44, 60, 64, 87):
 * See base-table.component.ts for full history.
 * Story 87.2 fix: placeholder symbol changed from '' to '\u2026' so that
 * SmartNgRX in-flight loading rows are visually distinct (ellipsis) rather
 * than blank, matching the Universe screen pattern from Story 76.3.
 * A blank symbol causes the blank-cell regression guard in
 * scrolling-regression-87.spec.ts to fail.
 */
function buildPlaceholderDividendRow(id: string): DividendRow {
  return {
    id,
    date: new Date(),
    amount: 0,
    accountId: '',
    divDepositTypeId: '',
    universeId: null,
    symbol: '\u2026',
    type: '',
    isLoading: true,
  };
}

function buildLoadedDividendRow(
  d: DivDeposit,
  typeNamesMap: Map<string, string>
): DividendRow {
  return {
    id: d.id,
    date: d.date,
    amount: d.amount,
    accountId: d.accountId,
    divDepositTypeId: d.divDepositTypeId,
    universeId: d.universeId,
    symbol: d.symbol ?? '',
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
    const typesList = selectDivDepositTypes();
    const typeNamesMap = new Map<string, string>();
    for (let ti = 0; ti < typesList.length; ti++) {
      typeNamesMap.set(typesList[ti].id, typesList[ti].name);
    }

    const result = new Array<DividendRow>(totalLength);

    for (let i = 0; i < totalLength; i++) {
      const d = divDepositsArray[i];
      if (d === undefined || typeof d === 'string') {
        result[i] = buildPlaceholderDividendRow(`placeholder-${String(i)}`);
        continue;
      }
      result[i] = buildLoadedDividendRow(d, typeNamesMap);
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
          symbol: null,
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
