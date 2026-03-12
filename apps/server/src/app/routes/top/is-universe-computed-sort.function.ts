const UNIVERSE_COMPUTED_SORT_FIELDS = new Set([
  'yield_percent',
  'avg_purchase_yield_percent',
  'most_recent_sell_date',
]);

export function isUniverseComputedSort(field: string): boolean {
  return UNIVERSE_COMPUTED_SORT_FIELDS.has(field);
}
