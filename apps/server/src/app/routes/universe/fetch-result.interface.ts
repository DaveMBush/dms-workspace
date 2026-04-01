import type { UniverseRecord } from './universe-record.interface';

export interface FetchResult {
  record: UniverseRecord;
  fetchFailed: boolean;
}
