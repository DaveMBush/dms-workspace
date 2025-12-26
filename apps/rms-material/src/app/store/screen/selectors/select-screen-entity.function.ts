import { createSmartSignal } from '@smarttools/smart-signals';

import { Screen } from '../screen.interface';

export const selectScreenEntity = createSmartSignal<Screen>('app', 'screens');
