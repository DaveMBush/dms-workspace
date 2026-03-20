import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterModule],
  selector: 'dms-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
  host: { class: 'flex flex-col h-full overflow-hidden' },
})
export class AppComponent {
  protected title = 'dms-material';
}
