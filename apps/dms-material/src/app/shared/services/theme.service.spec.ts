import { TestBed } from '@angular/core/testing';

import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;
  let localStorageSpy: ReturnType<typeof vi.spyOn>;
  let matchMediaSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Mock localStorage
    localStorageSpy = vi.spyOn(Storage.prototype, 'getItem');
    vi.spyOn(Storage.prototype, 'setItem');

    // Mock matchMedia
    matchMediaSpy = vi.spyOn(window, 'matchMedia');
    matchMediaSpy.mockReturnValue({ matches: false } as MediaQueryList);

    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.classList.remove('dark-theme');
  });

  describe('initialization', () => {
    it('should load light theme when localStorage is empty and system prefers light', () => {
      localStorageSpy.mockReturnValue(null);
      matchMediaSpy.mockReturnValue({ matches: false } as MediaQueryList);

      service = TestBed.inject(ThemeService);

      expect(service.isDarkMode$()).toBe(false);
      expect(document.body.classList.contains('dark-theme')).toBe(false);
    });

    it('should load dark theme when localStorage has dark preference', () => {
      localStorageSpy.mockReturnValue('dark');

      service = TestBed.inject(ThemeService);

      expect(service.isDarkMode$()).toBe(true);
      expect(document.body.classList.contains('dark-theme')).toBe(true);
    });

    it('should load light theme when localStorage has light preference', () => {
      localStorageSpy.mockReturnValue('light');

      service = TestBed.inject(ThemeService);

      expect(service.isDarkMode$()).toBe(false);
    });

    it('should respect system preference when no localStorage value', () => {
      localStorageSpy.mockReturnValue(null);
      matchMediaSpy.mockReturnValue({ matches: true } as MediaQueryList);

      service = TestBed.inject(ThemeService);

      expect(service.isDarkMode$()).toBe(true);
    });
  });

  describe('toggleTheme', () => {
    beforeEach(() => {
      localStorageSpy.mockReturnValue(null);
      service = TestBed.inject(ThemeService);
    });

    it('should toggle from light to dark', () => {
      expect(service.isDarkMode$()).toBe(false);

      service.toggleTheme();

      expect(service.isDarkMode$()).toBe(true);
      expect(document.body.classList.contains('dark-theme')).toBe(true);
    });

    it('should toggle from dark to light', () => {
      service.toggleTheme(); // Now dark

      service.toggleTheme(); // Back to light

      expect(service.isDarkMode$()).toBe(false);
      expect(document.body.classList.contains('dark-theme')).toBe(false);
    });

    it('should persist theme preference to localStorage', () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

      service.toggleTheme();

      expect(setItemSpy).toHaveBeenCalledWith('dms-theme', 'dark');
    });

    it('should persist light theme preference to localStorage', () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

      service.toggleTheme(); // dark
      service.toggleTheme(); // light

      expect(setItemSpy).toHaveBeenLastCalledWith('dms-theme', 'light');
    });
  });

  describe('edge cases', () => {
    it('should handle localStorage throwing error gracefully', () => {
      localStorageSpy.mockImplementation(function throwError(): string {
        throw new Error('localStorage not available');
      });

      expect(() => TestBed.inject(ThemeService)).not.toThrow();
    });

    it('should handle matchMedia not available', () => {
      localStorageSpy.mockReturnValue(null);
      matchMediaSpy.mockReturnValue(undefined as unknown as MediaQueryList);

      expect(() => TestBed.inject(ThemeService)).not.toThrow();
    });

    it('should apply theme immediately on toggle without delay', () => {
      localStorageSpy.mockReturnValue(null);
      service = TestBed.inject(ThemeService);

      service.toggleTheme();

      // Verify immediate application (no async delay)
      expect(document.body.classList.contains('dark-theme')).toBe(true);
    });
  });
});
