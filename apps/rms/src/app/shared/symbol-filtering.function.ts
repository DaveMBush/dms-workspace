/* eslint-disable @smarttools/one-exported-item-per-file -- Utility file with related symbol filtering functions */

import { computed, Signal } from '@angular/core';

import { selectUniverses } from '../store/universe/selectors/select-universes.function';

export interface SymbolOption {
  label: string;
  value: string;
  expired: boolean;
}

/**
 * Creates a computed signal for filtered symbols based on a filter query and selected symbol
 */
export function createFilteredSymbolsSignal(
  filterSignal: Signal<string>,
  selectedSymbolIdSignal: Signal<string>
): Signal<SymbolOption[]> {
  return computed(function filteredSymbolsComputedFn() {
    const symbols = selectUniverses();
    const returnedSymbols: SymbolOption[] = [];
    const selectedId = selectedSymbolIdSignal();
    let selectedSymbol: SymbolOption | undefined;

    for (let i = 0; i < symbols.length; i++) {
      const symbol = symbols[i];
      const entry: SymbolOption = {
        label: symbol.symbol,
        value: symbol.id,
        expired: symbol.expired,
      };
      if (symbol.id === selectedId) {
        selectedSymbol = entry;
      }
      returnedSymbols.push(entry);
    }

    const query = filterSignal().toLowerCase();
    let filtered = returnedSymbols.filter(function symbolFilter(
      r: SymbolOption
    ): boolean {
      return r.label.toLowerCase().includes(query);
    });

    // Ensure the selected symbol is always present
    if (
      selectedSymbol &&
      !filtered.some(function symbolValueFilter(r: SymbolOption): boolean {
        return r.value === selectedSymbol.value;
      })
    ) {
      filtered = [selectedSymbol, ...filtered];
    }

    return filtered;
  });
}

/**
 * Creates a computed signal for checking if the selected symbol is expired
 */
export function createSelectedSymbolExpiredSignal(
  selectedSymbolIdSignal: Signal<string>
): Signal<boolean> {
  return computed(function selectedSymbolExpiredComputedFn() {
    const symbols = selectUniverses();
    for (let i = 0; i < symbols.length; i++) {
      if (symbols[i].id === selectedSymbolIdSignal()) {
        return symbols[i].expired;
      }
    }
    return false;
  });
}
