import { createSmartSignal } from '@smarttools/smart-signals';

import { selectTopEntities } from '../../top/selectors/select-top-entities.function';
import { selectScreenEntity } from './select-screen-entity.function';

export const selectTopScreen = createSmartSignal(selectTopEntities, [
  {
    childFeature: 'app',
    childEntity: 'screens',
    parentField: 'screens',
    parentFeature: 'app',
    parentEntity: 'top',
    childSelector: selectScreenEntity,
  },
]);
