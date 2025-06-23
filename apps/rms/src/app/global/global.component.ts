import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToolbarModule } from 'primeng/toolbar';
import { ListboxModule } from 'primeng/listbox';

@Component({
  selector: 'app-global',
  standalone: true,
  imports: [CommonModule, ToolbarModule, ListboxModule],
  templateUrl: './global.component.html',
  styleUrl: './global.component.scss',
})
export class GlobalComponent {
  globals = [
    { id: 'universe', name: 'Universe' },
  ];
}
