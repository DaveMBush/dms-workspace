import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterModule],
  selector: 'dms-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class AppComponent {
  protected title = 'dms-material';
}
