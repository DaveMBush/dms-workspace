import { selectUniverses } from '../../store/universe/selectors/select-universes.function';

/**
 * Finds universe ID by symbol
 */
export function findUniverseIdBySymbol(symbol: string): string | undefined {
  const universes = selectUniverses();
  for (let i = 0; i < universes.length; i++) {
    if (universes[i].symbol === symbol) {
      return universes[i].id;
    }
  }
  return undefined;
}
