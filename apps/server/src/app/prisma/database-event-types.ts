/* eslint-disable @smarttools/one-exported-item-per-file -- Related database event types */

export interface QueryEvent {
  query: string;
  params: string;
  duration: number;
  target: string;
}

export interface LogEvent {
  message: string;
  target?: string;
}

export interface ClientWithEvents {
  $on(eventType: 'query', callback: (e: QueryEvent) => void): void;
  $on(
    eventType: 'error' | 'info' | 'warn',
    callback: (e: LogEvent) => void
  ): void;
}
