import { PartialArrayDefinition } from './partial-array-definition.interface';

export interface Top {
  id: string;
  accounts: string[];
  universes: PartialArrayDefinition;
  riskGroups: string[];
  divDepositTypes: string[];
  holidays: Date[];
  screens: string[];
}
