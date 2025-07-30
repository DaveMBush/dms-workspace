import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
OnInit,
  Signal,
  ViewEncapsulation, } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SmartArray } from '@smarttools/smart-signals';
import { ButtonModule } from 'primeng/button';
import { ListboxModule } from 'primeng/listbox';
import { ToolbarModule } from 'primeng/toolbar';

import { NodeEditorComponent } from '../shared/components/edit/node-editor.component';
import { Account as AccountInterface } from '../store/accounts/account.interface';
import { selectAccounts } from '../store/accounts/account.selectors';
import { Top } from '../store/top/top.interface';
import { selectTopEntities } from '../store/top/top.selectors';
import { AccountComponentService } from './account-component.service';

@Component({
  imports: [CommonModule, ButtonModule, FormsModule, NodeEditorComponent, ListboxModule, ToolbarModule],
  templateUrl: './account.html',
  styleUrl: './account.scss',
  selector: 'app-account',
  encapsulation: ViewEncapsulation.Emulated,
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [AccountComponentService],
})
export class Account implements OnInit {
  private accountService = inject(AccountComponentService);
  private router = inject(Router);
  accounts$ = selectAccounts as Signal<AccountInterface[] & SmartArray<Top, AccountInterface>>;
  top = selectTopEntities().entities;

  ngOnInit(): void {
    this.accountService.init(this);
  }

  accountsArray$ = computed(() => {
    const accounts = this.accounts$() as SmartArray<Top, AccountInterface>;
    const accountsArray = [] as AccountInterface[];
    for (let i = 0; i < accounts.length; i++) {
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
