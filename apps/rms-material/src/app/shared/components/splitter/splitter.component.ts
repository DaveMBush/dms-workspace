import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

@Component({
  selector: 'rms-splitter',
  imports: [],
  templateUrl: './splitter.html',
  styleUrl: './splitter.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SplitterComponent {
  private destroyRef = inject(DestroyRef);
  container = viewChild<ElementRef<HTMLElement>>('container');

  stateKey = input<string>('splitter-state');
  initialLeftWidth = input<number>(20);

  leftWidthPixels = signal(0);
  readonly widthChange = output<number>();
  private initialized = false;
  private isDragging = false;

  constructor() {
    const context = this;
    effect(function initializeWidth() {
      if (!context.initialized) {
        const containerEl = context.container();
        if (containerEl) {
          const containerWidth =
            containerEl.nativeElement.getBoundingClientRect().width;
          const storedPercent = context.loadState();
          const percent =
            storedPercent !== null ? storedPercent : context.initialLeftWidth();
          const pixels = (percent / 100) * containerWidth;
          context.leftWidthPixels.set(pixels);
          context.initialized = true;
        }
      }
    });

    effect(function persistWidth() {
      if (context.initialized) {
        const containerEl = context.container();
        if (containerEl) {
          const containerWidth =
            containerEl.nativeElement.getBoundingClientRect().width;
          const percentage =
            (context.leftWidthPixels() / containerWidth) * 100;
          context.saveState(percentage);
          context.widthChange.emit(percentage);
        }
      }
    });

    effect(function updateCssVariable() {
      const containerEl = context.container();
      if (containerEl) {
        containerEl.nativeElement.style.setProperty(
          '--left-width-px',
          `${context.leftWidthPixels()}px`
        );
      }
    });
  }

  onMouseDown(event: MouseEvent): void {
    event.preventDefault();
    this.isDragging = true;

    const context = this;
    function onMouseMove(e: MouseEvent): void {
      if (!context.isDragging) {
        return;
      }

      const containerEl = context.container();
      if (containerEl) {
        const containerRect =
          containerEl.nativeElement.getBoundingClientRect();
        const mouseX = e.clientX - containerRect.left;

        const minWidth = containerRect.width * 0.1;
        const maxWidth = containerRect.width * 0.5;
        const clampedWidth = Math.max(minWidth, Math.min(maxWidth, mouseX));

        context.leftWidthPixels.set(clampedWidth);
      }
    }

    function onMouseUp(): void {
      context.isDragging = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    this.destroyRef.onDestroy(function cleanupListeners() {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    });
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
