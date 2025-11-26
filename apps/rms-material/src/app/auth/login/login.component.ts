import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'rms-login',
  templateUrl: './login.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {}
