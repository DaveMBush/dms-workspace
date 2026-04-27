import { seedVolatilityColumnE2eData } from './seed-volatility-column-base.helper';
import type { SeederResultBase } from './seeder-result-base.types';

interface VolColumnSeederResult extends SeederResultBase {
  symbol: string;
}

export async function seedVolColumnE2eData(): Promise<VolColumnSeederResult> {
  return seedVolatilityColumnE2eData('E2EVOL', 'E2E-VOL-Acct-');
}
