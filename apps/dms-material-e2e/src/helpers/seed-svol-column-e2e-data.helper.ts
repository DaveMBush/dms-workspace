import { seedVolatilityColumnE2eData } from './seed-volatility-column-base.helper';
import type { SeederResultBase } from './seeder-result-base.types';

interface SvolColumnSeederResult extends SeederResultBase {
  symbol: string;
}

export async function seedSvolColumnE2eData(): Promise<SvolColumnSeederResult> {
  return seedVolatilityColumnE2eData('E2ESVOL', 'E2E-SVOL-Acct-');
}
