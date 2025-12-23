import { DivDeposit } from '../../store/div-deposits/div-deposit.interface';

export interface DivDepModalData {
  mode: 'add' | 'edit';
  dividend?: DivDeposit & {
    symbol?: string;
    exDate?: Date;
    payDate?: Date;
    shares?: number;
    type?: string;
  };
}
