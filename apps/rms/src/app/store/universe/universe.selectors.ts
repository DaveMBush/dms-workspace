import { createSmartSignal, getTopChildRows } from '@smarttools/smart-signals';

import { Top } from '../top/top.interface';
import { selectTopEntities } from '../top/top.selectors';
import { Universe } from './universe.interface';

export const selectUniverseEntity = createSmartSignal<Universe>(
  'app',
  'universes'
);

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

export const selectUniverses = getTopChildRows<Top, Universe>(
  selectTopUniverses,
  'universes'
);
