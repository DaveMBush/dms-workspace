export interface Summary {
  deposits: number;
  dividends: number;
  capitalGains: number;
  equities: number;
  income: number;
  // eslint-disable-next-line @typescript-eslint/naming-convention -- mapping to server
  tax_free_income: number;
}
