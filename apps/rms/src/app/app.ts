import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

@Component({
  imports: [RouterModule, ToastModule],
  providers: [MessageService],
  selector: 'app-root',
  template: `<p-toast position="bottom-left"></p-toast><router-outlet></router-outlet>`,
})
export class App {}
