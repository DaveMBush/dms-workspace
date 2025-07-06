import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DivDeposit } from '../../store/div-deposits/div-deposit.interface';

@Component({
  selector: 'app-dividend-deposits',
  imports: [CommonModule, TableModule, ButtonModule],
  templateUrl: './dividend-deposits.html',
  styleUrl: './dividend-deposits.scss',
})
export class DividendDeposits {
  deposits: DivDeposit[] = [
    {
      id: '1',
      date: new Date('2024-07-01'),
      amount: 100.25,
      accountId: 'acc1',
      divDepositTypeId: 'type1',
    },
    {
      id: '2',
      date: new Date('2024-07-15'),
      amount: 50.5,
      accountId: 'acc1',
      divDepositTypeId: 'type2',
    },
  ];

  deleteDeposit(row: DivDeposit) {
    this.deposits = this.deposits.filter(d => d.id !== row.id);
  }
}
