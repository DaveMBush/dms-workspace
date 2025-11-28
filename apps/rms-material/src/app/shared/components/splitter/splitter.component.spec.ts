import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SplitterComponent } from './splitter.component';

describe('SplitterComponent', () => {
  let component: SplitterComponent;
  let fixture: ComponentFixture<SplitterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SplitterComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(SplitterComponent);
    component = fixture.componentInstance;
  });

  it('should initialize leftWidthPixels signal', () => {
    expect(component.leftWidthPixels).toBeDefined();
    expect(typeof component.leftWidthPixels()).toBe('number');
  });

  it('should persist width to localStorage when width changes', async () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem');
    const containerEl = component.container();
    if (containerEl) {
      vi.spyOn(containerEl.nativeElement, 'getBoundingClientRect').mockReturnValue({
        width: 1000,
        left: 0,
        top: 0,
        bottom: 0,
        right: 1000,
        height: 500,
        x: 0,
        y: 0,
        toJSON: () => {
          // Empty method required by DOMRect interface
        },
      });
    }

    fixture.detectChanges();
    await fixture.whenStable();
    spy.mockClear(); // Clear initialization call
    component.leftWidthPixels.set(300);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(spy).toHaveBeenCalled();
  });

  describe('edge cases', () => {
    it('should handle localStorage being unavailable', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('localStorage not available');
      });
      expect(() => TestBed.createComponent(SplitterComponent)).not.toThrow();
    });

    it('should handle invalid localStorage value', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('invalid');
      expect(() => TestBed.createComponent(SplitterComponent)).not.toThrow();
    });

    it('should emit widthChange event on width change', async () => {
      const spy = vi.fn();
      component.widthChange.subscribe(spy);
      fixture.detectChanges();
      await fixture.whenStable();
      spy.mockClear(); // Clear initial emission
      component.leftWidthPixels.set(300);
      fixture.detectChanges();
      await fixture.whenStable();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('mouse drag resize', () => {
    it('should update CSS variable when leftWidthPixels changes', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      const container =
        fixture.nativeElement.querySelector('.splitter-container');
      component.leftWidthPixels.set(350);
      fixture.detectChanges();
      await fixture.whenStable();

      const cssVarValue = container.style.getPropertyValue('--left-width-px');
      expect(cssVarValue).toBe('350px');
    });

    it('should handle mousedown event', () => {
      fixture.detectChanges();

      const handle = fixture.nativeElement.querySelector('.splitter-handle');
      const mouseEvent = new MouseEvent('mousedown', {
        clientX: 300,
        clientY: 100,
      });

      expect(() => handle.dispatchEvent(mouseEvent)).not.toThrow();
    });

    it('should clamp width to minimum 10% during drag', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      // Mock container width
      const containerEl = component.container();
      if (containerEl) {
        vi.spyOn(
          containerEl.nativeElement,
          'getBoundingClientRect'
        ).mockReturnValue({
          left: 0,
          width: 1000,
          top: 0,
          bottom: 0,
          right: 1000,
          height: 500,
          x: 0,
          y: 0,
          toJSON: () => {
          // Empty method required by DOMRect interface
        },
        });
      }

      // Simulate drag to position that would be < 10%
      const handle = fixture.nativeElement.querySelector('.splitter-handle');
      const mouseDownEvent = new MouseEvent('mousedown', {
        clientX: 50,
        bubbles: true,
      });
      handle.dispatchEvent(mouseDownEvent);

      const mouseMoveEvent = new MouseEvent('mousemove', {
        clientX: 50,
        bubbles: true,
      });
      document.dispatchEvent(mouseMoveEvent);

      fixture.detectChanges();
      await fixture.whenStable();

      // Should clamp to 10% of 1000px = 100px
      expect(component.leftWidthPixels()).toBe(100);

      const mouseUpEvent = new MouseEvent('mouseup', { bubbles: true });
      document.dispatchEvent(mouseUpEvent);
    });

    it('should clamp width to maximum 50% during drag', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      const containerEl = component.container();
      if (containerEl) {
        vi.spyOn(
          containerEl.nativeElement,
          'getBoundingClientRect'
        ).mockReturnValue({
          left: 0,
          width: 1000,
          top: 0,
          bottom: 0,
          right: 1000,
          height: 500,
          x: 0,
          y: 0,
          toJSON: () => {
          // Empty method required by DOMRect interface
        },
        });
      }

      const handle = fixture.nativeElement.querySelector('.splitter-handle');
      const mouseDownEvent = new MouseEvent('mousedown', {
        clientX: 800,
        bubbles: true,
      });
      handle.dispatchEvent(mouseDownEvent);

      const mouseMoveEvent = new MouseEvent('mousemove', {
        clientX: 800,
        bubbles: true,
      });
      document.dispatchEvent(mouseMoveEvent);

      fixture.detectChanges();
      await fixture.whenStable();

      // Should clamp to 50% of 1000px = 500px
      expect(component.leftWidthPixels()).toBe(500);

      const mouseUpEvent = new MouseEvent('mouseup', { bubbles: true });
      document.dispatchEvent(mouseUpEvent);
    });
  });
});
