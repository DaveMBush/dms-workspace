import { createSmartSignal } from '@smarttools/smart-signals';

import { RiskGroup } from '../risk-group.interface';

export const selectRiskGroupEntity = createSmartSignal<RiskGroup>(
  'app',
  'riskGroups'
);
