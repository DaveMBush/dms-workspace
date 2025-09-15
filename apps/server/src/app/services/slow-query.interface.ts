export interface SlowQuery {
  query: string;
  duration: number;
  timestamp: Date;
  params?: unknown[];
}
