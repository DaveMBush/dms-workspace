import { RowProxyDelete } from '@smarttools/smart-signals';

import { Universe } from '../../store/universe/universe.interface';

/**
 * Locates a universe row in the SmartNgRX ArrayProxy by ID and calls its
 * RowProxy `delete()` method.  The proxy returned by index access has the
 * `delete()` method; plain `EnrichedUniverse` copies do not.
 *
 * @param rawUniverses The SmartNgRX universe ArrayProxy (from universeService.universes())
 * @param id The ID of the universe row to delete
 */
export function findAndDeleteUniverseRow(
  rawUniverses: Universe[],
  id: string
): void {
  const smartArr = rawUniverses as unknown as {
    getIdAtIndex?(i: number): string | undefined;
  };
  if (typeof smartArr.getIdAtIndex !== 'function') {
    return;
  }
  for (let i = 0; i < rawUniverses.length; i++) {
    if (smartArr.getIdAtIndex(i) === id) {
      (rawUniverses[i] as unknown as RowProxyDelete).delete?.();
      return;
    }
  }
}
