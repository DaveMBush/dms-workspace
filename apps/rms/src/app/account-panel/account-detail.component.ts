import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TabViewModule } from 'primeng/tabview';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { TooltipModule } from 'primeng/tooltip';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-account-detail',
  standalone: true,
  imports: [CommonModule, TabViewModule, RouterModule, TooltipModule, ButtonModule],
  templateUrl: './account-detail.component.html',
  styleUrls: ['./account-detail.component.scss']
})
export class AccountDetailComponent {
  constructor(public router: Router, public route: ActivatedRoute) {}

  get accountId(): string | null {
    return this.route.snapshot.paramMap.get('accountId');
  }
}
