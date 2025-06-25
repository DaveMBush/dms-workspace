import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TabViewModule } from 'primeng/tabview';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-account-detail',
  standalone: true,
  imports: [CommonModule, TabViewModule, RouterModule],
  templateUrl: './account-detail.component.html',
})
export class AccountDetailComponent {
  constructor(public router: Router, public route: ActivatedRoute) {}
}
