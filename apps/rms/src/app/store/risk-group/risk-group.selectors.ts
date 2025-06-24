import { createSmartSignal, getTopChildRows } from '@smarttools/smart-signals';
import { Top } from '../top/top.interface';
import { RiskGroup } from './risk-group.interface';
import { selectTopEntities } from '../../store/top/top.selectors';

export const selectRiskGroupEntity = createSmartSignal<RiskGroup>(
  'app',
  'riskGroups'
);

export const selectTopRiskGroup = createSmartSignal(
  selectTopEntities, [
  {
    childFeature: 'app',
    childEntity: 'riskGroups',
    parentField: 'riskGroups',
    parentFeature: 'app',
    parentEntity: 'top',
    childSelector: selectRiskGroupEntity,
  },
]);

export const selectRiskGroup = getTopChildRows<Top, RiskGroup>(
  selectTopRiskGroup,
  'riskGroups'
);

