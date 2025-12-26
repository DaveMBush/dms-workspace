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

import { DivDepModal } from './div-dep-modal/div-dep-modal.component';

@Component({
  selector: 'rms-account-panel',
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

  onAddClick(): void {
    if (this.isOpenPositionsRoute$()) {
      this.onAddPosition();
    } else if (this.isDivDepRoute$()) {
      this.onAddDividend();
    }
  }

  private onAddPosition(): void {
    // FUTURE: Implement add position dialog
  }

  private onAddDividend(): void {
    const dialogRef = this.dialog.open(DivDepModal, {
      width: '500px',
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
