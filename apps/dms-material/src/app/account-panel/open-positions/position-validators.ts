/* eslint-disable @smarttools/one-exported-item-per-file -- utility functions grouped together */
export function isValidDate(dateString: string): boolean {
  const dateRegex = /^(\d{4})-(\d{2})-(\d{2})$/;
  const match = dateRegex.exec(dateString);
  if (!match) {
    return false;
  }
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() + 1 === month &&
    date.getDate() === day
  );
}

export function isValidNumber(value: number): boolean {
  return Number.isFinite(value);
}

export function isPositive(value: number): boolean {
  return value > 0;
}

export function isTradeClosed(trade: {
  sell_date?: string | null | undefined;
  sell?: number | undefined;
}): boolean {
  const hasSellDate =
    typeof trade.sell_date === 'string' && trade.sell_date.trim() !== '';
  const hasPositiveSell =
    typeof trade.sell === 'number' &&
    Number.isFinite(trade.sell) &&
    trade.sell > 0;
  return hasSellDate && hasPositiveSell;
}
