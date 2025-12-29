import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { Account as AccountInterface } from '../store/accounts/account.interface';
import { selectAccounts } from '../store/accounts/selectors/select-accounts.function';

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
  private router = inject(Router);
  accountsList = selectAccounts();

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
