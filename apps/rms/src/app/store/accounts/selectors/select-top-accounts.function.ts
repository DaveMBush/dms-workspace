import { createSmartSignal } from '@smarttools/smart-signals';

import { selectTopEntities } from '../../top/selectors/select-top-entities.function';
import { selectAccountsEntity } from './select-accounts-entity.function';

export const selectTopAccounts = createSmartSignal(selectTopEntities, [
  {
    childFeature: 'app',
    childEntity: 'accounts',
    parentField: 'accounts',
    parentFeature: 'app',
    parentEntity: 'top',
    childSelector: selectAccountsEntity,
  },
]);
