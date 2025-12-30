/* eslint-disable @smarttools/one-exported-item-per-file -- Related position operation functions */

import { ElementRef } from '@angular/core';

import { Trade } from '../store/trades/trade.interface';
import { selectUniverses } from '../store/universe/selectors/select-universes.function';
import { Universe } from '../store/universe/universe.interface';

export function findTradeForRow(
  trades: Trade[],
  rowId: string
): Trade | undefined {
  for (let i = 0; i < trades.length; i++) {
    if (trades[i].id === rowId) {
      return trades[i];
    }
  }
  return undefined;
}

export function findUniverseForSymbol(symbol: string): Universe | undefined {
  const universes = selectUniverses();
  for (let i = 0; i < universes.length; i++) {
    if (universes[i].symbol === symbol) {
      return universes[i];
    }
  }
  return undefined;
}

export function setScrollPosition(
  tableRef: () => ElementRef | undefined,
  scrollTopValue: number
): void {
  let scrollContainer = getScrollContainer(tableRef);
  if (scrollContainer) {
    scrollContainer.scrollTop = scrollTopValue;
  }
  setTimeout(function resetScrollPosition() {
    scrollContainer = getScrollContainer(tableRef);
    if (scrollContainer) {
      scrollContainer.scrollTop = scrollTopValue;
    }
  }, 200);
}

export function getScrollContainer(
  tableRef: () => ElementRef | undefined
): HTMLElement | null {
  const tableEl = tableRef()?.nativeElement as HTMLElement;
  return tableEl?.querySelector('.p-datatable-table-container');
}
