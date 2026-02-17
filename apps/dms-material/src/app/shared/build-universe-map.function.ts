import { computed } from '@angular/core';

import { selectUniverses } from '../store/universe/selectors/select-universes.function';
import { Universe } from '../store/universe/universe.interface';

export const buildUniverseMap = computed(function computeUniverseMap(): Map<
  string,
  Universe
> {
  const universes = selectUniverses();
  const universeMap = new Map<string, Universe>();

  for (let j = 0; j < universes.length; j++) {
    const universe = universes[j];
    if (universe.symbol.length === 0) {
      continue;
    }
    universeMap.set(universe.id, universe);
  }

  return universeMap;
});
