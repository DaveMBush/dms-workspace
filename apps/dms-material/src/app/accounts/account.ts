import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  Signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { SmartArray } from '@smarttools/smart-signals';

import { Account as AccountInterface } from '../store/accounts/account.interface';
import { selectAccounts } from '../store/accounts/selectors/select-accounts.function';
import { Top } from '../store/top/top.interface';

@Component({
  selector: 'dms-account',
  imports: [
    RouterLink,
    RouterLinkActive,
    MatListModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
  ],
  templateUrl: './account.html',
  styleUrl: './account.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Account {
  accounts$ = selectAccounts as Signal<
    AccountInterface[] & SmartArray<Top, AccountInterface>
  >;

  // Convert SmartArray to regular array for PrimeNG compatibility
  // eslint-disable-next-line @smarttools/no-anonymous-functions -- Computed signals require arrow functions for proper this binding
  accountsArray$ = computed(() => {
    const accounts = this.accounts$();
    return [...accounts] as AccountInterface[];
  });

  private router = inject(Router);

  onAccountSelect(account: AccountInterface): void {
    const context = this;
    void context.router
      .navigate(['/account', account.id])
      .catch(function handleNavigationError() {
        // Navigation errors are handled by router
      });
  }

  navigateToGlobal(path: string): void {
    const context = this;
    void context.router
      .navigate(['/global', path])
      .catch(function handleNavigationError() {
        // Navigation errors are handled by router
      });
  }
}
