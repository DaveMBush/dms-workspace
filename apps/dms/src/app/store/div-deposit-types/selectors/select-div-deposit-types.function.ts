import { getTopChildRows } from '@smarttools/smart-signals';

import { Top } from '../../top/top.interface';
import { DivDepositType } from '../div-deposit-type.interface';
import { selectTopDivDepositTypes } from './select-top-div-deposit-types.function';

export const selectDivDepositTypes = getTopChildRows<Top, DivDepositType>(
  selectTopDivDepositTypes,
  'divDepositTypes'
);
