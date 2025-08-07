import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, inject, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationEnd,Router } from '@angular/router';
import { ListboxModule } from 'primeng/listbox';
import { ToolbarModule } from 'primeng/toolbar';
import { filter, Subscription } from 'rxjs';

@Component({
  selector: 'rms-global',
  standalone: true,
  imports: [CommonModule, ToolbarModule, ListboxModule, FormsModule],
  templateUrl: './global.component.html',
  styleUrl: './global.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GlobalComponent implements OnInit, OnDestroy {
  @Input() selectedId: string | null = null;
  @Output() readonly selectedIdChange = new EventEmitter<{id: string, name: string}>();
  private router = inject(Router);
  private routeSubscription?: Subscription;
  globals = [
    { id: 'universe', name: 'Universe' },
    { id: 'screener', name: 'Screener' },
  ];

  ngOnInit(): void {
    // Set initial selection based on current route
    this.updateSelectionFromRoute(this.router.url);

    // Listen for route changes
    const self = this;
    this.routeSubscription = this.router.events
      .pipe(filter(function filterNavigationEnd(event) {
        return event instanceof NavigationEnd;
      }))
      .subscribe(function routeChangeSubscription() {
        self.updateSelectionFromRoute(self.router.url);
      });
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
  }

  protected onSelect(e: {id: string, name: string}): void {
    this.selectedIdChange.emit(e);
    void this.router.navigate([`/global/${e.id}`]);
  }

  private updateSelectionFromRoute(url: string): void {
    const globalMatch = /\/global\/([^/]+)/.exec(url);
    const globalId = globalMatch?.[1];

    if (globalId !== undefined && globalId !== '') {
      // Update the parent component's selectedId through the output
      this.selectedIdChange.emit({ id: globalId, name: globalId });
    } else {
      // Clear selection if not on a global route
      this.selectedIdChange.emit({ id: '', name: '' });
    }
  }
}
