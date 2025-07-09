import { createSmartSignal, getTopChildRows } from '@smarttools/smart-signals';
import { Top } from '../top/top.interface';
import { DivDepositType } from './div-deposit-type.interface';
import { selectTopEntities } from '../../store/top/top.selectors';

export const selectDivDepositTypeEntity = createSmartSignal<DivDepositType>(
  'app',
  'divDepositTypes'
);

export const selectTopDivDepositTypes = createSmartSignal(
  selectTopEntities, [
  {
    childFeature: 'app',
    childEntity: 'divDepositTypes',
    parentField: 'divDepositTypes',
    parentFeature: 'app',
    parentEntity: 'top',
    childSelector: selectDivDepositTypeEntity,
  },
]);

export const selectDivDepositTypes = getTopChildRows<Top, DivDepositType>(
  selectTopDivDepositTypes,
  'divDepositTypes'
);
