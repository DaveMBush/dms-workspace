/**
 * Compares two values for sort ordering.
 * Null/undefined values sort before all others.
 * Strings are compared with localeCompare; numbers compared numerically.
 */
export function compareValues(aVal: unknown, bVal: unknown): number {
  const aNull = aVal === null || aVal === undefined;
  const bNull = bVal === null || bVal === undefined;
  if (aNull) {
    return bNull ? 0 : -1;
  }
  if (bNull) {
    return 1;
  }
  if (typeof aVal === 'string' && typeof bVal === 'string') {
    return aVal.localeCompare(bVal);
  }
  const a = aVal as number;
  const b = bVal as number;
  if (a < b) {
    return -1;
  }
  return a > b ? 1 : 0;
}
