/**
 * Summary data from /api/summary endpoint.
 */
export interface Summary {
  deposits: number;
  dividends: number;
  capitalGains: number;
  equities: number;
  income: number;
  // eslint-disable-next-line @typescript-eslint/naming-convention -- API response field name
  tax_free_income: number;
}
