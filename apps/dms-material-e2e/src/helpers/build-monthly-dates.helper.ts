export function buildMonthlyDates(totalMonths: number): Date[] {
  const dates: Date[] = [];
  const now = new Date();
  for (let offset = totalMonths - 1; offset >= 0; offset--) {
    const d = new Date(now);
    d.setDate(1);
    d.setMonth(d.getMonth() - offset);
    dates.push(d);
  }
  return dates;
}
