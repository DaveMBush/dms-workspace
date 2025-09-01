import { createSmartSignal } from '@smarttools/smart-signals';

import { selectTopEntities } from '../../top/selectors/select-top-entities.function';
import { selectRiskGroupEntity } from './select-risk-group-entity.function';

export const selectTopRiskGroup = createSmartSignal(selectTopEntities, [
  {
    childFeature: 'app',
    childEntity: 'riskGroups',
    parentField: 'riskGroups',
    parentFeature: 'app',
    parentEntity: 'top',
    childSelector: selectRiskGroupEntity,
  },
]);
