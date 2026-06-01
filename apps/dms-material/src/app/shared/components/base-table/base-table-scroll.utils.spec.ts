// @vitest-environment jsdom

import { DestroyRef } from '@angular/core';

import { bindHeaderInteractions } from './base-table-scroll.utils';

function createDestroyRefMock(): {
  destroyRef: DestroyRef;
  runDestroyCallbacks(): void;
} {
  const destroyCallbacks: Array<() => void> = [];

  return {
    destroyRef: {
      onDestroy(callback: () => void) {
        destroyCallbacks.push(callback);
      },
    } as DestroyRef,
    runDestroyCallbacks() {
      destroyCallbacks.forEach(function runCallback(callback) {
        callback();
      });
    },
  };
}

function defineScrollableAxis(
  element: HTMLElement,
  axis: 'horizontal' | 'vertical',
  config: { clientSize: number; scrollSize: number; initialValue?: number }
): void {
  const sizeKey = axis === 'horizontal' ? 'Width' : 'Height';
  const clientProperty = `client${sizeKey}`;
  const scrollProperty = `scroll${sizeKey}`;
  const positionProperty = axis === 'horizontal' ? 'scrollLeft' : 'scrollTop';
  let currentValue = config.initialValue ?? 0;

  Object.defineProperty(element, clientProperty, {
    configurable: true,
    get() {
      return config.clientSize;
    },
  });
  Object.defineProperty(element, scrollProperty, {
    configurable: true,
    get() {
      return config.scrollSize;
    },
  });
  Object.defineProperty(element, positionProperty, {
    configurable: true,
    get() {
      return currentValue;
    },
    set(nextValue: number) {
      const maxScroll = Math.max(0, config.scrollSize - config.clientSize);
      currentValue = Math.min(maxScroll, Math.max(0, Number(nextValue)));
    },
  });
}

describe('bindHeaderInteractions', () => {
  it('forwards horizontal wheel input from header viewport into body scroller', () => {
    const { destroyRef } = createDestroyRefMock();
    const headerViewportEl = document.createElement('div');
    const bodyScrollerEl = document.createElement('div');

    defineScrollableAxis(headerViewportEl, 'horizontal', {
      clientSize: 320,
      scrollSize: 320,
    });
    defineScrollableAxis(bodyScrollerEl, 'horizontal', {
      clientSize: 320,
      scrollSize: 960,
    });

    bindHeaderInteractions(
      destroyRef,
      headerViewportEl,
      bodyScrollerEl,
      undefined
    );

    const wheelEvent = new WheelEvent('wheel', {
      deltaX: 120,
      bubbles: true,
      cancelable: true,
    });

    const dispatchResult = headerViewportEl.dispatchEvent(wheelEvent);

    expect(dispatchResult).toBe(false);
    expect(wheelEvent.defaultPrevented).toBe(true);
    expect(bodyScrollerEl.scrollLeft).toBe(120);
    expect(headerViewportEl.scrollLeft).toBe(0);
  });

  it('allows wheel events to bubble when header input cannot move either scroller', () => {
    const { destroyRef } = createDestroyRefMock();
    const headerViewportEl = document.createElement('div');
    const bodyScrollerEl = document.createElement('div');
    const outerScrollerEl = document.createElement('div');

    defineScrollableAxis(headerViewportEl, 'horizontal', {
      clientSize: 320,
      scrollSize: 320,
    });
    defineScrollableAxis(bodyScrollerEl, 'horizontal', {
      clientSize: 320,
      scrollSize: 960,
      initialValue: 640,
    });
    defineScrollableAxis(outerScrollerEl, 'vertical', {
      clientSize: 480,
      scrollSize: 480,
    });

    bindHeaderInteractions(
      destroyRef,
      headerViewportEl,
      bodyScrollerEl,
      outerScrollerEl
    );

    const wheelEvent = new WheelEvent('wheel', {
      deltaX: 120,
      deltaY: 120,
      bubbles: true,
      cancelable: true,
    });

    const dispatchResult = headerViewportEl.dispatchEvent(wheelEvent);

    expect(dispatchResult).toBe(true);
    expect(wheelEvent.defaultPrevented).toBe(false);
    expect(bodyScrollerEl.scrollLeft).toBe(640);
    expect(outerScrollerEl.scrollTop).toBe(0);
  });

  it('handles pure vertical wheel input without forcing horizontal preventDefault path', () => {
    const { destroyRef } = createDestroyRefMock();
    const headerViewportEl = document.createElement('div');
    const bodyScrollerEl = document.createElement('div');
    const outerScrollerEl = document.createElement('div');

    defineScrollableAxis(headerViewportEl, 'horizontal', {
      clientSize: 320,
      scrollSize: 320,
    });
    defineScrollableAxis(bodyScrollerEl, 'horizontal', {
      clientSize: 320,
      scrollSize: 960,
    });
    defineScrollableAxis(outerScrollerEl, 'vertical', {
      clientSize: 240,
      scrollSize: 720,
    });

    bindHeaderInteractions(
      destroyRef,
      headerViewportEl,
      bodyScrollerEl,
      outerScrollerEl
    );

    const wheelEvent = new WheelEvent('wheel', {
      deltaY: 120,
      bubbles: true,
      cancelable: true,
    });

    const dispatchResult = headerViewportEl.dispatchEvent(wheelEvent);

    expect(dispatchResult).toBe(false);
    expect(wheelEvent.defaultPrevented).toBe(true);
    expect(bodyScrollerEl.scrollLeft).toBe(0);
    expect(outerScrollerEl.scrollTop).toBe(120);
  });

  it('observes body geometry with ResizeObserver and disconnects it on destroy', () => {
    const { destroyRef, runDestroyCallbacks } = createDestroyRefMock();
    const headerViewportEl = document.createElement('div');
    const bodyScrollerEl = document.createElement('div');
    const originalResizeObserver = globalThis.ResizeObserver;
    const observe = vi.fn();
    const disconnect = vi.fn();
    let resizeObserverCallback: ResizeObserverCallback | undefined;

    defineScrollableAxis(headerViewportEl, 'horizontal', {
      clientSize: 320,
      scrollSize: 320,
    });
    defineScrollableAxis(bodyScrollerEl, 'horizontal', {
      clientSize: 320,
      scrollSize: 960,
    });

    globalThis.ResizeObserver = class ResizeObserverMock {
      constructor(callback: ResizeObserverCallback) {
        resizeObserverCallback = callback;
      }

      observe(target: Element): void {
        observe(target);
        resizeObserverCallback?.([], this as unknown as ResizeObserver);
      }

      disconnect(): void {
        disconnect();
      }
    } as unknown as typeof ResizeObserver;

    try {
      bindHeaderInteractions(
        destroyRef,
        headerViewportEl,
        bodyScrollerEl,
        undefined
      );

      runDestroyCallbacks();

      expect(observe).toHaveBeenCalledWith(bodyScrollerEl);
      expect(disconnect).toHaveBeenCalledTimes(1);
    } finally {
      globalThis.ResizeObserver = originalResizeObserver;
    }
  });
});
