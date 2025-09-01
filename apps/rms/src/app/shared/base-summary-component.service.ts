/* eslint-disable @smarttools/one-exported-item-per-file -- Related summary utility functions */

import { computed, Signal, signal, WritableSignal } from '@angular/core';

interface Summary {
  deposits: number;
  dividends: number;
  capitalGains: number;
  equities: number;
  income: number;
  // eslint-disable-next-line @typescript-eslint/naming-convention -- matches server API
  tax_free_income: number;
}

interface Graph {
  month: string;
  deposits: number;
  dividends: number;
  capitalGains: number;
}

interface HttpResource<T> {
  value(): T | undefined;
  isLoading(): boolean;
}

export function createDefaultSummary(): Summary {
  return {
    deposits: 0,
    dividends: 0,
    capitalGains: 0,
    equities: 0,
    income: 0,
    tax_free_income: 0,
  };
}

export function createSummaryComputed(
  httpSummary: Signal<HttpResource<Summary>>
): Signal<Summary> {
  return computed(function summaryComputedFn(): Summary {
    const httpValue = httpSummary().value();
    // Return default value if new data is loading to prevent flash
    if (httpValue === undefined && httpSummary().isLoading()) {
      return createDefaultSummary();
    }
    return httpValue || createDefaultSummary();
  });
}

export function createGraphComputed(
  httpGraph: Signal<HttpResource<Graph[]>>
): Signal<Graph[]> {
  return computed(function graphComputedFn(): Graph[] {
    const httpValue = httpGraph().value();
    // Return empty array if new data is loading to prevent flash
    if (httpValue === undefined && httpGraph().isLoading()) {
      return [];
    }
    return httpValue || [];
  });
}

export function createSelectedMonthSignal(): WritableSignal<string | null> {
  return signal<string | null>(null);
}
