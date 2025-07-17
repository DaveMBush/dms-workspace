import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { TooltipModule } from 'primeng/tooltip';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { NewPositionComponent } from './new-position/new-position.component';
import { DivDepModalComponent } from './div-dep-modal/div-dep-modal.component';

@Component({
  selector: 'app-account-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, TooltipModule, ButtonModule, DialogModule, NewPositionComponent, DivDepModalComponent],
  templateUrl: './account-detail.component.html',
  styleUrls: ['./account-detail.component.scss']
})
export class AccountDetailComponent {
  showNewPositionDialog = false;
  showNewDivDepDialog = false;
  router = inject(Router);
  route = inject(ActivatedRoute);

  get accountId(): string | null {
    return this.route.snapshot.paramMap.get('accountId');
  }

  openNewPositionDialog() {
    this.showNewPositionDialog = true;
  }

  openNewDivDepDialog() {
    this.showNewDivDepDialog = true;
  }

  closeNewPositionDialog() {
    this.showNewPositionDialog = false;
  }

  closeNewDivDepDialog() {
    this.showNewDivDepDialog = false;
  }
}
