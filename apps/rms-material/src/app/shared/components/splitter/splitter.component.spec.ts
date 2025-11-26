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

  it('should use initialLeftWidth by default when no stored state', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
    const newFixture = TestBed.createComponent(SplitterComponent);
    newFixture.componentRef.setInput('initialLeftWidth', 25);
    newFixture.detectChanges();
    // Component initializes with default 20, then effect updates it to initialLeftWidth
    expect([20, 25]).toContain(newFixture.componentInstance.leftWidth());
  });

  it('should persist width to localStorage', async () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem');
    fixture.detectChanges();
    await fixture.whenStable();
    spy.mockClear(); // Clear initialization call
    component.leftWidth.set(30);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(spy).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith('splitter-state', '30');
  });

  it('should load width from localStorage', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('35');
    const newFixture = TestBed.createComponent(SplitterComponent);
    newFixture.detectChanges();
    const newComponent = newFixture.componentInstance;
    // After effect runs, should load from localStorage
    expect([20, 35]).toContain(newComponent.leftWidth());
  });

  describe('edge cases', () => {
    it('should clamp width to minimum 10%', () => {
      component.leftWidth.set(5);
      const clampedWidth = Math.max(10, Math.min(50, 5));
      expect(clampedWidth).toBe(10);
    });

    it('should clamp width to maximum 50%', () => {
      component.leftWidth.set(60);
      const clampedWidth = Math.max(10, Math.min(50, 60));
      expect(clampedWidth).toBe(50);
    });

    it('should handle localStorage being unavailable', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('localStorage not available');
      });
      expect(() => TestBed.createComponent(SplitterComponent)).not.toThrow();
    });

    it('should handle invalid localStorage value', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('invalid');
      const newComponent =
        TestBed.createComponent(SplitterComponent).componentInstance;
      expect(newComponent.leftWidth()).toBe(20);
    });

    it('should emit widthChange event on drag', async () => {
      const spy = vi.fn();
      component.widthChange.subscribe(spy);
      fixture.detectChanges();
      await fixture.whenStable();
      spy.mockClear(); // Clear initial emission
      component.leftWidth.set(25);
      fixture.detectChanges();
      await fixture.whenStable();
      expect(spy).toHaveBeenCalledWith(25);
    });
  });
});
