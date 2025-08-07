import { ChangeDetectionStrategy,Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,imports: [RouterModule, ToastModule],
  providers: [MessageService],
  selector: 'rms-root',
  template: `<p-toast position="bottom-left"></p-toast><router-outlet></router-outlet>`,
})
export class App {}
