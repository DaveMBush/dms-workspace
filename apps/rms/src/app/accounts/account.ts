import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  Signal,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ListboxModule } from 'primeng/listbox';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { selectAccounts } from './store/accounts/account.selectors';
import { selectTopEntities } from '../store/top/top.selectors';
import { SmartArray } from '@smarttools/smart-signals';
import { Top } from '../store/top/top.interface';
import { Account as AccountInterface } from './store/accounts/account.interface';
import { NodeEditorComponent } from '../shared/components/edit/node-editor.component';
import { FormsModule } from '@angular/forms';
import { AccountComponentService } from './account-component.service';
import { Router } from '@angular/router';

@Component({
  imports: [CommonModule, ButtonModule, FormsModule, NodeEditorComponent, ListboxModule, ToolbarModule],
  templateUrl: './account.html',
  styleUrl: './account.scss',
  selector: 'app-account',
  encapsulation: ViewEncapsulation.Emulated,
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [AccountComponentService],
})
export class Account {
  private accountService = inject(AccountComponentService);
  private router = inject(Router);
  accounts$ = selectAccounts as Signal<SmartArray<Top, AccountInterface> & AccountInterface[]>;
  top = selectTopEntities().entities;

  ngOnInit(): void {
    this.accountService.init(this);
  }

  accountsArray$ = computed(() => {
    var accounts = this.accounts$() as SmartArray<Top, AccountInterface>;
    var accountsArray = [] as AccountInterface[];
    for (var i = 0; i < accounts.length; i++) {
      accountsArray.push(accounts[i] as AccountInterface);
    }
    return accountsArray;
  });

  addingNode = '';
  editingNode = '';
  editingContent = '';

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

  onAccountSelect(account: AccountInterface): void {
    this.router.navigate(['/account', account.id]);
  }
}
