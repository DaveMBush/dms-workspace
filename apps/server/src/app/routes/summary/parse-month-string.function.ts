export function parseMonthString(month: string): {
  year: number;
  monthNum: number;
} {
  const [yearStr, monthStr] = month.split('-');
  const year = parseInt(yearStr, 10);
  const monthNum = parseInt(monthStr, 10);
  return { year, monthNum };
}
