import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  Signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { SmartArray } from '@smarttools/smart-signals';

import { NodeEditorComponent } from '../shared/components/edit/node-editor.component';
import { Account as AccountInterface } from '../store/accounts/account.interface';
import { selectAccounts } from '../store/accounts/selectors/select-accounts.function';
import { selectTopEntities } from '../store/top/selectors/select-top-entities.function';
import { Top } from '../store/top/top.interface';
import { AccountComponentService } from './account-component.service';

@Component({
  selector: 'dms-account',
  imports: [
    RouterLink,
    RouterLinkActive,
    FormsModule,
    MatListModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    NodeEditorComponent,
  ],
  templateUrl: './account.html',
  styleUrl: './account.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [AccountComponentService],
})
export class Account implements OnInit {
  private accountService = inject(AccountComponentService);
  private router = inject(Router);

  accounts$ = selectAccounts as Signal<
    AccountInterface[] & SmartArray<Top, AccountInterface>
  >;

  top = selectTopEntities().entities;

  ngOnInit(): void {
    this.accountService.init(this);
  }

  // Convert SmartArray to regular array for Angular Material compatibility
  // eslint-disable-next-line @smarttools/no-anonymous-functions -- Computed signals require arrow functions for proper this binding
  accountsArray$ = computed(() => {
    const accounts = this.accounts$();
    return [...accounts] as AccountInterface[];
  });

  addingNode = '';
  editingContent = '';

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

  protected addAccount(): void {
    this.accountService.addAccount();
  }

  protected cancelEdit(item: AccountInterface): void {
    this.accountService.cancelEdit(item);
  }

  protected saveEdit(item: AccountInterface): void {
    this.accountService.saveEdit(item);
  }
}
