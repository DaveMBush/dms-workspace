import { BasePositionsStorageService } from '../../shared/base-positions-storage.service';

export class SoldPositionsStorageService extends BasePositionsStorageService {
  protected getFiltersStorageKey(): string {
    return 'sold-positions-filters';
  }

  protected getSortStorageKey(): string {
    return 'sold-positions-sort';
  }
}
