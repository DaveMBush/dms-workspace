import { getTopChildRows } from '@smarttools/smart-signals';

import { Top } from '../../top/top.interface';
import { Universe } from '../universe.interface';
import { selectTopUniverses } from './select-top-universes.function';

export const selectUniverses = getTopChildRows<Top, Universe>(
  selectTopUniverses,
  'universes'
);
