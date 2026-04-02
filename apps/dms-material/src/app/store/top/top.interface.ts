import { PartialArrayDefinition } from '@smarttools/smart-signals';

import { Screen } from '../screen/screen.interface';

export interface Top {
  id: string;
  accounts: string[];
  riskGroups: string[];
  universes: PartialArrayDefinition | string[];
  divDepositTypes: string[];
  holidays: Date[];
  screens: Screen[];
}
