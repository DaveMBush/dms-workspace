const CUSIP_PATTERN = /^[A-Za-z0-9]{9}$/;

function isValidCusip(cusip: string): boolean {
  return CUSIP_PATTERN.test(cusip);
}

function isNonEmptySymbol(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidSource(source: string | undefined): boolean {
  return (
    source === undefined || source === 'THIRTEENF' || source === 'YAHOO_FINANCE'
  );
}

export const cusipCacheValidators = {
  isValidCusip,
  isNonEmptySymbol,
  isValidSource,
};
