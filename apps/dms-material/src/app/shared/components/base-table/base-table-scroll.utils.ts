import { DestroyRef } from '@angular/core';

function applyHorizontalWheelDelta(
  bodyScrollerEl: HTMLElement,
  deltaX: number
): boolean {
  if (deltaX === 0) {
    return false;
  }

  const previousScrollLeft = bodyScrollerEl.scrollLeft;
  bodyScrollerEl.scrollLeft = previousScrollLeft + deltaX;

  return bodyScrollerEl.scrollLeft !== previousScrollLeft;
}

function applyVerticalWheelDelta(
  outerScrollerValue: HTMLElement | undefined,
  deltaY: number
): boolean {
  if (!outerScrollerValue || deltaY === 0) {
    return false;
  }

  const previousScrollTop = outerScrollerValue.scrollTop;
  outerScrollerValue.scrollTop = previousScrollTop + deltaY;

  return outerScrollerValue.scrollTop !== previousScrollTop;
}

export function bindHeaderInteractions(
  destroyRef: DestroyRef,
  headerViewportEl: HTMLElement,
  bodyScrollerEl: HTMLElement,
  outerScrollerValue: HTMLElement | undefined
): void {
  function syncHeaderGeometry(): void {
    headerViewportEl.style.inlineSize = `${bodyScrollerEl.clientWidth}px`;
    headerViewportEl.scrollLeft = bodyScrollerEl.scrollLeft;
  }

  function proxyHeaderWheel(event: WheelEvent): void {
    const isBrowserZoomGesture = event.ctrlKey || event.metaKey;

    const handledHorizontalScroll = applyHorizontalWheelDelta(
      bodyScrollerEl,
      event.deltaX
    );
    const handledVerticalScroll = applyVerticalWheelDelta(
      outerScrollerValue,
      event.deltaY
    );

    if (
      !isBrowserZoomGesture &&
      (handledHorizontalScroll || handledVerticalScroll)
    ) {
      event.preventDefault();
    }
  }

  bodyScrollerEl.addEventListener('scroll', syncHeaderGeometry, {
    passive: true,
  });
  destroyRef.onDestroy(function removeBodyScrollListener() {
    bodyScrollerEl.removeEventListener('scroll', syncHeaderGeometry);
  });

  if (typeof ResizeObserver !== 'undefined') {
    const resizeObserver = new ResizeObserver(function syncHeaderWidth() {
      syncHeaderGeometry();
    });
    resizeObserver.observe(bodyScrollerEl);
    destroyRef.onDestroy(function disconnectResizeObserver() {
      resizeObserver.disconnect();
    });
  }

  headerViewportEl.addEventListener('wheel', proxyHeaderWheel, {
    passive: false,
  });
  destroyRef.onDestroy(function removeHeaderWheelListener() {
    headerViewportEl.removeEventListener('wheel', proxyHeaderWheel);
  });

  syncHeaderGeometry();
}
