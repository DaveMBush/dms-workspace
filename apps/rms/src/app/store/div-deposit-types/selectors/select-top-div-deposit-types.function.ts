import { createSmartSignal } from '@smarttools/smart-signals';

import { selectTopEntities } from '../../top/selectors/select-top-entities.function';
import { selectDivDepositTypeEntity } from './select-div-deposit-type-entity.function';

export const selectTopDivDepositTypes = createSmartSignal(selectTopEntities, [
  {
    childFeature: 'app',
    childEntity: 'divDepositTypes',
    parentField: 'divDepositTypes',
    parentFeature: 'app',
    parentEntity: 'top',
    childSelector: selectDivDepositTypeEntity,
  },
]);
