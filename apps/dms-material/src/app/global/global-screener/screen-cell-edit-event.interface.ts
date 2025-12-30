import { Screen } from '../../store/screen/screen.interface';

export interface ScreenCellEditEvent {
  row: Screen;
  field: string;
  value: unknown;
}
