export function calculateDateRange(
  year: number,
  monthNum: number
): { start: Date; end: Date } {
  const sellDateStart = new Date(year, monthNum - 1, 1);
  const sellDateEnd = new Date(year, monthNum, 1);
  return { start: sellDateStart, end: sellDateEnd };
}
