import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterModule, ToastModule],
  providers: [MessageService],
  selector: 'rms-root',
  templateUrl: './app.html',
})
export class App {}
