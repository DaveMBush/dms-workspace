import { Universe } from '../../store/universe/universe.interface';

export function calculateYieldPercent(row: Universe): number {
  if (!row.last_price || row.last_price === 0) {
    return 0;
  }
  return (row.distribution * row.distributions_per_year * 100) / row.last_price;
}
