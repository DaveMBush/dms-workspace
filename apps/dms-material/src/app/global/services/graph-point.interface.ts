/**
 * Graph data point from /api/summary/graph endpoint.
 */
export interface GraphPoint {
  month: string;
  deposits: number;
  dividends: number;
  capitalGains: number;
}
