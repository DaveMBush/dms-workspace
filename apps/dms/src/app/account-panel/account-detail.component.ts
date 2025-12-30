import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterModule,
} from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { filter, Subscription } from 'rxjs';

import { DivDepModalComponent } from './div-dep-modal/div-dep-modal.component';
import { NewPositionComponent } from './new-position/new-position.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'dms-account-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TooltipModule,
    ButtonModule,
    DialogModule,
    NewPositionComponent,
    DivDepModalComponent,
  ],
  templateUrl: './account-detail.component.html',
  styleUrls: ['./account-detail.component.scss'],
})
export class AccountDetailComponent implements OnInit, OnDestroy {
  showNewPositionDialog = false;
  showNewDivDepDialog = false;
  router = inject(Router);
  route = inject(ActivatedRoute);

  private routeSubscription?: Subscription;
  private currentUrl$ = signal<string>('');

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
  isOpenPositionsRoute$ = computed(() => {
    const currentUrl = this.currentUrl$();
    const accountId = this.accountId;
    return currentUrl.endsWith(`/account/${accountId}/open`);
  });

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
  isDivDepRoute$ = computed(() => {
    const currentUrl = this.currentUrl$();
    const accountId = this.accountId;
    return currentUrl.endsWith(`/account/${accountId}/div-dep`);
  });

  get accountId(): string | null {
    return this.route.snapshot.paramMap.get('accountId');
  }

  ngOnInit(): void {
    this.routeSubscription = this.router.events
      .pipe(
        filter(function isNavigationEnd(event): event is NavigationEnd {
          return event instanceof NavigationEnd;
        })
      )
      // eslint-disable-next-line @smarttools/no-anonymous-functions -- preserves this context
      .subscribe(() => {
        this.currentUrl$.set(this.router.url);
      });

    // Set initial URL
    this.currentUrl$.set(this.router.url);
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
  }

  openNewPositionDialog(): void {
    this.showNewPositionDialog = true;
  }

  openNewDivDepDialog(): void {
    this.showNewDivDepDialog = true;
  }

  closeNewPositionDialog(): void {
    this.showNewPositionDialog = false;
  }

  closeNewDivDepDialog(): void {
    this.showNewDivDepDialog = false;
  }
}
