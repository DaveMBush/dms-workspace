import { CollectionViewer, DataSource } from '@angular/cdk/collections';
import { BehaviorSubject, Observable, Subject, Subscription } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';

import { LazyLoadEvent } from './lazy-load-event.interface';

export class VirtualTableDataSource<T> extends DataSource<T> {
  private dataSubject = new BehaviorSubject<T[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private destroySubject = new Subject<void>();
  private subscription: Subscription | null = null;

  loadingObservable = this.loadingSubject.asObservable();

  private cachedData: T[] = [];
  private totalRecords = 0;
  private pageSize = 50;
  private loadThreshold = 10;

  constructor(
    private loadFn: (
      event: LazyLoadEvent
    ) => Observable<{ data: T[]; total: number }>
  ) {
    super();
  }

  connect(collectionViewer: CollectionViewer): Observable<T[]> {
    const context = this;

    this.subscription = collectionViewer.viewChange
      .pipe(debounceTime(100), takeUntil(this.destroySubject))
      .subscribe(function onViewChange(range) {
        context.checkAndLoadData(range.start, range.end);
      });

    return this.dataSubject.asObservable();
  }

  disconnect(): void {
    this.destroySubject.next();
    this.destroySubject.complete();
    this.dataSubject.complete();
    this.loadingSubject.complete();
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  loadInitialData(): void {
    this.cachedData = [];
    this.loadMoreData(0);
  }

  refresh(): void {
    this.cachedData = [];
    this.totalRecords = 0;
    this.loadMoreData(0);
  }

  updateRow(index: number, data: T): void {
    if (index >= 0 && index < this.cachedData.length) {
      this.cachedData[index] = data;
      this.dataSubject.next([...this.cachedData]);
    }
  }

  getData(): T[] {
    return this.cachedData;
  }

  getTotalRecords(): number {
    return this.totalRecords;
  }

  private checkAndLoadData(start: number, end: number): void {
    const loadedEnd = this.cachedData.length;

    if (
      end >= loadedEnd - this.loadThreshold &&
      loadedEnd < this.totalRecords
    ) {
      this.loadMoreData(loadedEnd);
    }
  }

  private loadMoreData(offset: number): void {
    let isLoadingNow = false;
    // eslint-disable-next-line @smarttools/rxjs/no-subject-value -- Need synchronous check to prevent duplicate loads
    if (this.loadingSubject.observed && this.loadingSubject.value) {
      isLoadingNow = true;
    }
    if (isLoadingNow) {
      return;
    }

    this.loadingSubject.next(true);

    const context = this;
    this.loadFn({ first: offset, rows: this.pageSize })
      .pipe(takeUntil(this.destroySubject))
      .subscribe({
        next: function onData(result) {
          context.cachedData = [...context.cachedData, ...result.data];
          context.totalRecords = result.total;
          context.dataSubject.next(context.cachedData);
          context.loadingSubject.next(false);
        },
        error: function onError() {
          context.loadingSubject.next(false);
        },
      });
  }
}
