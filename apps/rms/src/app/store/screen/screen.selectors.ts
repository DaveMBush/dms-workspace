import { createSmartSignal, getTopChildRows } from '@smarttools/smart-signals';

import { selectTopEntities } from '../../store/top/top.selectors';
import { Top } from '../top/top.interface';
import { Screen } from './screen.interface';

export const selectScreenEntity = createSmartSignal<Screen>(
  'app',
  'screens'
);

export const selectTopScreen = createSmartSignal(
  selectTopEntities, [
    {
      childFeature: 'app',
      childEntity: 'screens',
      parentField: 'screens',
      parentFeature: 'app',
      parentEntity: 'top',
      childSelector: selectScreenEntity,
    },
  ]
);

export const selectScreen = getTopChildRows<Top, Screen>(
  selectTopScreen,
  'screens'
);
