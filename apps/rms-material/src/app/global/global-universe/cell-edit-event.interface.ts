import { Universe } from '../../store/universe/universe.interface';

export interface CellEditEvent {
  row: Universe;
  field: string;
  value: unknown;
}
