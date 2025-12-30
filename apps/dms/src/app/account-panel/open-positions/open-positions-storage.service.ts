import { BasePositionsStorageService } from '../../shared/base-positions-storage.service';

export class OpenPositionsStorageService extends BasePositionsStorageService {
  protected getFiltersStorageKey(): string {
    return 'open-positions-filters';
  }

  protected getSortStorageKey(): string {
    return 'open-positions-sort';
  }
}
