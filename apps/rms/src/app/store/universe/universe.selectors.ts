import { createSmartSignal, getTopChildRows } from '@smarttools/smart-signals';
import { Top } from '../top/top.interface';
import { Universe } from './universe.interface';
import { selectTopEntities } from '../top/top.selectors';

export const selectUniverseEntity = createSmartSignal<Universe>(
  'app',
  'universes'
);

export const selectTopUniverses = createSmartSignal(selectTopEntities, [
  {
    childFeature: 'app',
    childEntity: 'universe',
    parentField: 'universe',
    parentFeature: 'app',
    parentEntity: 'top',
    childSelector: selectUniverseEntity,
  },
]);

export const selectUniverses = getTopChildRows<Top, Universe>(
  selectTopUniverses,
  'universe'
);
