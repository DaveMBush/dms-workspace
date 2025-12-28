import { createSmartSignal } from '@smarttools/smart-signals';

import { selectTopEntities } from '../../top/selectors/select-top-entities.function';
import { selectUniverseEntity } from './select-universe-entity.function';

export const selectTopUniverses = createSmartSignal(selectTopEntities, [
  {
    childFeature: 'app',
    childEntity: 'universes',
    parentField: 'universes',
    parentFeature: 'app',
    parentEntity: 'top',
    childSelector: selectUniverseEntity,
  },
]);
