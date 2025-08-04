import { getTopChildRows } from '@smarttools/smart-signals';

import { Top } from '../../top/top.interface';
import { RiskGroup } from '../risk-group.interface';
import { selectTopRiskGroup } from './select-top-risk-group.function';

export const selectRiskGroup = getTopChildRows<Top, RiskGroup>(
  selectTopRiskGroup,
  'riskGroups'
);
