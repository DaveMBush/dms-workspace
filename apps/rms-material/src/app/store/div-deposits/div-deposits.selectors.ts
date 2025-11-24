import { createSmartSignal } from '@smarttools/smart-signals';

import { DivDeposit } from './div-deposit.interface';

export const selectDivDepositEntity = createSmartSignal<DivDeposit>(
  'app',
  'divDeposits'
);
