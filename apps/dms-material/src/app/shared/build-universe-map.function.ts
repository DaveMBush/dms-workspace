import { computed } from '@angular/core';

import { selectUniverses } from '../store/universe/selectors/select-universes.function';
import { Universe } from '../store/universe/universe.interface';

export const buildUniverseMap = computed(function computeUniverseMap(): Map<
  string,
  Universe
> {
  const universes = selectUniverses();
  const universeMap = new Map<string, Universe>();

  // Use getIdAtIndex (available on SmartNgRX ArrayProxy) to check whether
  // an item is loaded before accessing it via index.  Accessing proxy[i]
  // for an unloaded item dispatches loadByIndexes, causing a bulk fetch.
  // getIdAtIndex() returns the stored ID string without triggering dispatch:
  // real UUIDs for loaded items, 'index-N' / 'indexNoOp-N' for unloaded ones.
  const smartArr = universes as unknown as {
    getIdAtIndex?(i: number): string | undefined;
  };
  const isProxy = typeof smartArr.getIdAtIndex === 'function';

  for (let j = 0; j < universes.length; j++) {
    // Use a sentinel 'loaded' for non-proxy arrays so they always pass the
    // startsWith('index') check below.
    const id = isProxy ? smartArr.getIdAtIndex!(j) : 'loaded';
    if (id === undefined || id.startsWith('index')) {
      continue;
    }
    const universe = universes[j];
    if (typeof universe === 'string' || universe.symbol.length === 0) {
      continue;
    }
    universeMap.set(universe.id, universe);
  }

  return universeMap;
});
