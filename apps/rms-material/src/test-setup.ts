import '@angular/compiler';
import '@analogjs/vitest-angular/setup-zone';

import {
  BrowserTestingModule,
  platformBrowserTesting,
} from '@angular/platform-browser/testing';
import { getTestBed } from '@angular/core/testing';

// Mock matchMedia for tests (including deprecated addListener/removeListener for Angular CDK)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(function mockMatchMedia(query: string) {
    return {
      matches: false,
      media: query,
      onchange: null,
      // Deprecated but still used by Angular CDK
      addListener: vi.fn(),
      removeListener: vi.fn(),
      // Modern API
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };
  }),
});

getTestBed().initTestEnvironment(
  BrowserTestingModule,
  platformBrowserTesting()
);
