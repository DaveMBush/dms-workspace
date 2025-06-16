import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ListboxModule } from 'primeng/listbox';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { selectAccounts, selectAccountsEntity } from '../store/accounts/account.selectors';

@Component({
  imports: [CommonModule, ButtonModule, ListboxModule, ToolbarModule],
  templateUrl: './account.html',
  styleUrl: './account.scss',
  selector: 'app-account',
  encapsulation: ViewEncapsulation.Emulated,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Account {
  protected accounts = selectAccounts().map((account) => account.name);
}
