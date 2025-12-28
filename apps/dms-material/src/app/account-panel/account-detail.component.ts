import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterOutlet } from '@angular/router';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'rms-account-detail',
  imports: [RouterOutlet],
  templateUrl: './account-detail.component.html',
  styleUrl: './account-detail.component.scss',
})
export class AccountDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);

  accountId = signal<string>('');

  ngOnInit(): void {
    const context = this;
    this.route.parent?.paramMap.subscribe(function onParams(params) {
      context.accountId.set(params.get('accountId') ?? '');
    });
  }
}
