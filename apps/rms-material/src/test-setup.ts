import '@angular/compiler';
import '@analogjs/vitest-angular/setup-zone';

import {
  BrowserTestingModule,
  platformBrowserTesting,
} from '@angular/platform-browser/testing';
import { getTestBed } from '@angular/core/testing';

// Mock canvas for Chart.js tests
HTMLCanvasElement.prototype.getContext = vi.fn(function mockGetContext() {
  return {
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    getImageData: vi.fn(function mockGetImageData() {
      return { data: [] };
    }),
    putImageData: vi.fn(),
    createImageData: vi.fn(function mockCreateImageData() {
      return [];
    }),
    setTransform: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    arc: vi.fn(),
    measureText: vi.fn(function mockMeasureText() {
      return { width: 0 };
    }),
    transform: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    quadraticCurveTo: vi.fn(),
    bezierCurveTo: vi.fn(),
    isPointInPath: vi.fn(),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    createLinearGradient: vi.fn(function mockCreateLinearGradient() {
      return { addColorStop: vi.fn() };
    }),
    createRadialGradient: vi.fn(function mockCreateRadialGradient() {
      return { addColorStop: vi.fn() };
    }),
    createPattern: vi.fn(),
    setLineDash: vi.fn(),
    getLineDash: vi.fn(function mockGetLineDash() {
      return [];
    }),
    canvas: {
      style: {},
      width: 300,
      height: 150,
    },
  } as unknown as CanvasRenderingContext2D;
}) as unknown as typeof HTMLCanvasElement.prototype.getContext;

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
