import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { filter, Subscription } from 'rxjs';

import { currentAccountSignalStore } from '../store/current-account/current-account.signal-store';
import { selectCurrentAccountSignal } from '../store/current-account/select-current-account.signal';
import { Trade } from '../store/trades/trade.interface';
import { DivDepModal } from './div-dep-modal/div-dep-modal.component';
import { AddPositionService } from './open-positions/add-position.service';
import { AddPositionDialogComponent } from './open-positions/add-position-dialog/add-position-dialog.component';

@Component({
  selector: 'dms-account-panel',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './account-panel.component.html',
  styleUrl: './account-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountPanelComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private dialog = inject(MatDialog);
  private currentAccountStore = inject(currentAccountSignalStore);
  private addPositionService = inject(AddPositionService);

  private routeSubscription?: Subscription;
  private routeParamsSubscription?: Subscription;
  private currentUrl$ = signal<string>('');

  errorMessage$ = this.addPositionService.getErrorMessage();
  successMessage$ = this.addPositionService.getSuccessMessage();

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

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
  buttonTooltip$ = computed(() => {
    if (this.isOpenPositionsRoute$()) {
      return 'Add Open Position';
    }
    if (this.isDivDepRoute$()) {
      return 'Add Dividend Deposit';
    }
    return 'Add';
  });

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
  showAddButton$ = computed(() => {
    return this.isOpenPositionsRoute$() || this.isDivDepRoute$();
  });

  get accountId(): string | null {
    return this.route.snapshot.paramMap.get('accountId');
  }

  ngOnInit(): void {
    // Subscribe to route params to update current account store
    const component = this;
    this.routeParamsSubscription = this.route.params.subscribe(
      function handleRouteParams(params: Record<string, string>) {
        const accountId = params['accountId'];
        if (typeof accountId === 'string') {
          component.currentAccountStore.setCurrentAccountId(accountId);
        }
      }
    );

    this.routeSubscription = this.router.events
      .pipe(
        filter(function isNavigationEnd(event): event is NavigationEnd {
          return event instanceof NavigationEnd;
        })
      )
      .subscribe(function handleNavigation() {
        component.currentUrl$.set(component.router.url);
      });

    // Set initial URL
    this.currentUrl$.set(this.router.url);
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
    this.routeParamsSubscription?.unsubscribe();
  }

  onAddClick(): void {
    if (this.isOpenPositionsRoute$()) {
      this.onAddPosition();
    } else if (this.isDivDepRoute$()) {
      this.onAddDividend();
    }
  }

  private onAddPosition(): void {
    const currentAccount = selectCurrentAccountSignal(this.currentAccountStore);
    const trades = computed(function getTrades() {
      return currentAccount().trades as Trade[];
    });

    const dialogRef = this.dialog.open(AddPositionDialogComponent, {
      width: '500px',
      disableClose: true,
      data: { accountId: this.accountId },
    });

    const handler = this.addPositionService.createDialogCloseHandler(
      trades,
      currentAccount,
      this.accountId
    );

    dialogRef.afterClosed().subscribe(handler);
  }

  private onAddDividend(): void {
    const dialogRef = this.dialog.open(DivDepModal, {
      width: '500px',
      disableClose: true,
      data: { mode: 'add' },
    });

    dialogRef.afterClosed().subscribe(function onClose(result: unknown) {
      if (result !== null && result !== undefined) {
        // In real implementation, this would save via SmartNgRX
        // and the table would auto-refresh via signals
      }
    });
  }
}
