import { createSmartSignal } from '@smarttools/smart-signals';

import { DivDepositType } from '../div-deposit-type.interface';

export const selectDivDepositTypeEntity = createSmartSignal<DivDepositType>(
  'app',
  'divDepositTypes'
);
