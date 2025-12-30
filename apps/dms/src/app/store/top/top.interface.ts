import { Screen } from '../screen/screen.interface';

export interface Top {
  id: string;
  accounts: string[];
  riskGroups: string[];
  universes: string[];
  divDepositTypes: string[];
  holidays: Date[];
  screens: Screen[];
}
