import { Universe } from '../../store/universe/universe.interface';

function handleNullValues(
  aVal: unknown,
  bVal: unknown,
  multiplier: number
): number | null {
  if (aVal === null || aVal === undefined) {
    return 1 * multiplier;
  }
  if (bVal === null || bVal === undefined) {
    return -1 * multiplier;
  }
  return null;
}

function compareStrings(a: string, b: string, multiplier: number): number {
  return a.localeCompare(b) * multiplier;
}

function compareNumbers(a: number, b: number, multiplier: number): number {
  return (a - b) * multiplier;
}

function compareDates(a: Date, b: Date, multiplier: number): number {
  return (a.getTime() - b.getTime()) * multiplier;
}

function compareValues(
  aVal: unknown,
  bVal: unknown,
  multiplier: number
): number {
  const nullResult = handleNullValues(aVal, bVal, multiplier);
  if (nullResult !== null) {
    return nullResult;
  }

  if (typeof aVal === 'string' && typeof bVal === 'string') {
    return compareStrings(aVal, bVal, multiplier);
  }
  if (typeof aVal === 'number' && typeof bVal === 'number') {
    return compareNumbers(aVal, bVal, multiplier);
  }
  if (aVal instanceof Date && bVal instanceof Date) {
    return compareDates(aVal, bVal, multiplier);
  }

  return 0;
}

export function sortUniverses(
  data: Universe[],
  field: string,
  direction: '' | 'asc' | 'desc'
): Universe[] {
  if (!field || direction === '') {
    return data;
  }

  const multiplier = direction === 'asc' ? 1 : -1;
  return [...data].sort(function compareRows(a, b) {
    const aVal = a[field as keyof Universe];
    const bVal = b[field as keyof Universe];
    return compareValues(aVal, bVal, multiplier);
  });
}
