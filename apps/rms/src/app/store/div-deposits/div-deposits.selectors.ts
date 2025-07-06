import { createSmartSignal, getTopChildRows } from '@smarttools/smart-signals';
import { DivDeposit } from './div-deposit.interface';
import { selectAccountsEntity } from '../accounts/account.selectors';
import { computed } from '@angular/core';

export const selectDivDepositEntity = createSmartSignal<DivDeposit>(
  'app',
  'divDeposits'
);

export const selectAccountDivDeposit = createSmartSignal(
  selectAccountsEntity, [
  {
    childFeature: 'app',
    childEntity: 'divDeposits',
    parentField: 'divDeposits',
    parentFeature: 'app',
    parentEntity: 'accounts',
    childSelector: selectDivDepositEntity,
  },
]);
