/**
 * CUSIP pattern: 6 alphanumeric issuer chars + 2 alphanumeric issue chars + 1 check digit.
 * CUSIPs always contain at least one digit (unlike pure-letter ticker symbols).
 */
const CUSIP_PATTERN = /^[A-Z0-9]{9}$/;

/**
 * Checks whether a symbol string looks like a CUSIP identifier rather than a ticker symbol.
 * CUSIPs are exactly 9 alphanumeric characters and contain at least one digit.
 */
export function isCusip(symbol: string): boolean {
  return CUSIP_PATTERN.test(symbol) && /\d/.test(symbol);
}
