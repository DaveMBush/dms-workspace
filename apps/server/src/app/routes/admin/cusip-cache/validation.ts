const CUSIP_PATTERN = /^[A-Za-z0-9]{9}$/;

export function isValidCusip(cusip: string): boolean {
  return CUSIP_PATTERN.test(cusip);
}
