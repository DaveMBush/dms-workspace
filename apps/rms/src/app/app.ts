import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { RouterModule } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';

import { GlobalLoadingService } from './shared/services/global-loading.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterModule, ToastModule, ProgressSpinnerModule],
  providers: [MessageService],
  selector: 'rms-root',
  templateUrl: './app.html',
})
export class App {
  private globalLoading = inject(GlobalLoadingService);

  // Computed signals for template
  // eslint-disable-next-line @smarttools/no-anonymous-functions -- Computed signal requires arrow function for proper this binding
  isLoading = computed(() => this.globalLoading.isLoading());
  // eslint-disable-next-line @smarttools/no-anonymous-functions -- Computed signal requires arrow function for proper this binding
  loadingMessage = computed(() => this.globalLoading.message());
}
