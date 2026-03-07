import { CusipCacheSource } from './cusip-cache-source.type';

export interface CusipCacheDialogResult {
  cusip: string;
  symbol: string;
  source: CusipCacheSource;
  reason: string;
}
