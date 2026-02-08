import { Universe } from '../../store/universe/universe.interface';

export interface EnrichedUniverse extends Universe {
  // eslint-disable-next-line @typescript-eslint/naming-convention -- matches database schema
  risk_group: string;
}
