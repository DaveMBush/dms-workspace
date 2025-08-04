import { getTopChildRows } from '@smarttools/smart-signals';

import { Top } from '../../top/top.interface';
import { Screen } from '../screen.interface';
import { selectTopScreen } from './select-top-screen.function';

export const selectScreen = getTopChildRows<Top, Screen>(
  selectTopScreen,
  'screens'
);
