import { createSmartSignal } from '@smarttools/smart-signals';

import { Universe } from '../universe.interface';

export const selectUniverseEntity = createSmartSignal<Universe>(
  'app',
  'universes'
);
