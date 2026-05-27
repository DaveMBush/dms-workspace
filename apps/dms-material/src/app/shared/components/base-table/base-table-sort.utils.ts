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
  return compareNumbers(aVal, bVal);
}

function compareNumbers(a: unknown, b: unknown): number {
  const numA = Number(a);
  const numB = Number(b);
  if (Number.isNaN(numA) || Number.isNaN(numB)) {
    return 0;
  }
  if (numA < numB) {
    return -1;
  }
  return numA > numB ? 1 : 0;
}
