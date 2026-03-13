export function parseYieldValue(value: string): number | null {
  if (!value || value.trim() === '') {
    return null;
  }
  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
}
