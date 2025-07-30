import { selectHolidays } from "../top/top.selectors";

export function differenceInTradingDays(
  start: string,
  end: string
): number {
  const startDate = new Date(start);
  const endDate = new Date(end);
  let count = 0;
  const current = new Date(startDate);

  const holidays = selectHolidays();

  // Normalize holidays to a Set for fast lookup
  const holidaySet = new Set(holidays.map(d => new Date(d).toDateString()));

  while (current <= endDate) {
    const day = current.getDay();
    const isWeekend = day === 0 || day === 6;
    const isHoliday = holidaySet.has(current.toDateString());
    if (!isWeekend && !isHoliday) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
}
