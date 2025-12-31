import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  Signal,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SmartArray } from '@smarttools/smart-signals';
import { ButtonModule } from 'primeng/button';
import { ListboxModule } from 'primeng/listbox';
import { ToolbarModule } from 'primeng/toolbar';

import { BaseRouteComponent } from '../shared/base-route-component';
import { NodeEditorComponent } from '../shared/components/edit/node-editor.component';
import { Account as AccountInterface } from '../store/accounts/account.interface';
import { selectAccounts } from '../store/accounts/selectors/select-accounts.function';
import { selectTopEntities } from '../store/top/selectors/select-top-entities.function';
import { Top } from '../store/top/top.interface';
import { AccountComponentService } from './account-component.service';

@Component({
  imports: [
    ButtonModule,
    FormsModule,
    NodeEditorComponent,
    ListboxModule,
    ToolbarModule,
  ],
  templateUrl: './account.html',
  styleUrl: './account.scss',
  selector: 'dms-account',
  encapsulation: ViewEncapsulation.Emulated,
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [AccountComponentService],
})
export class Account extends BaseRouteComponent implements OnInit, OnDestroy {
  private accountService = inject(AccountComponentService);
  accounts$ = selectAccounts as Signal<
    AccountInterface[] & SmartArray<Top, AccountInterface>
  >;

  top = selectTopEntities().entities;

  override ngOnInit(): void {
    this.accountService.init(this);
    super.ngOnInit();
  }

  override ngOnDestroy(): void {
    super.ngOnDestroy();
  }

  // Convert SmartArray to regular array for PrimeNG compatibility
  // eslint-disable-next-line @smarttools/no-anonymous-functions -- Computed signals require arrow functions for proper this binding
  accountsArray$ = computed(() => {
    const accounts = this.accounts$();
    return [...accounts] as AccountInterface[];
  });

  addingNode = '';
  editingNode = '';
  editingContent = '';

  updateSelectionFromRoute(url: string): void {
    const accountMatch = /\/account\/([^/]+)/.exec(url);
    const accountId = accountMatch?.[1];

    if (accountId !== undefined && accountId !== '') {
      this.selectedAccountId$.set(accountId);
    } else {
      // Clear selection if not on an account route
      this.selectedAccountId$.set(null);
    }
  }

  protected addAccount(): void {
    this.accountService.addAccount();
  }

  protected editAccount(item: AccountInterface): void {
    this.accountService.editAccount(item);
  }

  protected deleteAccount(item: AccountInterface): void {
    this.accountService.deleteAccount(item);
  }

  protected cancelEdit(item: AccountInterface): void {
    this.accountService.cancelEdit(item);
  }

  protected saveEdit(item: AccountInterface): void {
    this.accountService.saveEdit(item);
  }

  selectedAccountId$ = signal<string | null>(null);

  protected onAccountSelect(account: AccountInterface): void {
    this.selectedAccountId$.set(account.id);
    void this.router.navigate(['/account', account.id]);
  }
}
