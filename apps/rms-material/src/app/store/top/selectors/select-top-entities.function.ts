import { createSmartSignal } from '@smarttools/smart-signals';

import { Top } from '../top.interface';

export const selectTopEntities = createSmartSignal<Top>('app', 'top');
