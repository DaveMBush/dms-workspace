import { Component } from '@angular/core';
import { ToolbarModule } from 'primeng/toolbar';
import { TableModule } from 'primeng/table';
import { selectUniverse } from './universe.selector';

@Component({
  selector: 'app-global-universe',
  standalone: true,
  imports: [ToolbarModule, TableModule],
  templateUrl: './global-universe.component.html',
  styleUrls: ['./global-universe.component.scss'],
})
export class GlobalUniverseComponent {
  public readonly universe$ = selectUniverse;
}
