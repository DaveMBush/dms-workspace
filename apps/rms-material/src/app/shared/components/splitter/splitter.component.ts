import { CdkDrag, CdkDragMove } from '@angular/cdk/drag-drop';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';

@Component({
  selector: 'rms-splitter',
  imports: [CdkDrag],
  templateUrl: './splitter.html',
  styleUrl: './splitter.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SplitterComponent {
  stateKey = input<string>('splitter-state');
  initialLeftWidth = input<number>(20);

  leftWidth = signal(20);
  readonly widthChange = output<number>();
  private initialized = false;

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- Computed signal requires arrow function for lexical this binding
  currentLeftWidth$ = computed(() => this.leftWidth());

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- Computed signal requires arrow function for lexical this binding
  currentRightWidth$ = computed(() => 100 - this.leftWidth());

  constructor() {
    const context = this;
    effect(function initializeWidth() {
      if (!context.initialized) {
        const stored = context.loadState();
        if (stored !== null) {
          context.leftWidth.set(stored);
        } else {
          context.leftWidth.set(context.initialLeftWidth());
        }
        context.initialized = true;
      }
    });

    effect(function persistWidth() {
      if (context.initialized) {
        context.saveState(context.leftWidth());
        context.widthChange.emit(context.leftWidth());
      }
    });
  }

  onDragMove(event: CdkDragMove, container: HTMLElement): void {
    const containerRect = container.getBoundingClientRect();
    const newLeftWidth =
      ((event.pointerPosition.x - containerRect.left) / containerRect.width) *
      100;
    const clampedWidth = Math.max(10, Math.min(50, newLeftWidth));
    this.leftWidth.set(clampedWidth);
  }

  private loadState(): number | null {
    try {
      const stored = localStorage.getItem(this.stateKey());
      if (stored === null || stored === '') {
        return null;
      }
      const parsed = parseFloat(stored);
      return isNaN(parsed) ? null : parsed;
    } catch {
      return null;
    }
  }

  private saveState(width: number): void {
    try {
      localStorage.setItem(this.stateKey(), width.toString());
    } catch {
      // Silently fail if localStorage unavailable
    }
  }
}
