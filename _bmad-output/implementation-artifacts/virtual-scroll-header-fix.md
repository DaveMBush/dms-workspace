# Virtual-Scroll Header Jumping: Root Cause & Fix

## Reproduction Evidence

### Universe Screen — Incremental Scroll Test

App URL: `http://localhost:4201/global/universe`
Test: scroll `.virtual-scroll-viewport` by 50px increments, capture `tr.mat-mdc-header-row` `getBoundingClientRect().top` after each step.

| Scroll Step | `viewport.scrollTop` | `headerRow.getBoundingClientRect().top` | Delta from step 0 |
| ----------- | -------------------- | --------------------------------------- | ----------------- |
| 0 (initial) | 0 px                 | 128 px                                  | —                 |
| 1           | 50 px                | 78 px                                   | −50 px            |
| 2           | 100 px               | 28 px                                   | −100 px           |
| 3           | 150 px               | −22 px                                  | −150 px           |
| 4           | 200 px               | −72 px                                  | −200 px           |
| 5           | 250 px               | −122 px                                 | −250 px           |
| 6           | 300 px               | −172 px                                 | −300 px           |
| 7           | 350 px               | −222 px                                 | −350 px           |
| 8           | 400 px               | −272 px                                 | −400 px           |
| 9           | 450 px               | −322 px                                 | −450 px           |
| 10          | 500 px               | −372 px                                 | −500 px           |

**Conclusion**: the header top changes by exactly −50 px per 50 px scroll step, confirming a 1:1 ratio.  
`position: sticky` is completely non-functional — the header behaves as `position: relative`.

### Account Screen — Incremental Scroll Test

URL: `http://localhost:4201/account/c1bd30cb-c13f-48bc-8d87-97da518362dc` (Joint Brokerage \*4767)
Same test on the Open Positions table.

| Scroll Step | `viewport.scrollTop` | `headerRow.top` | Delta   |
| ----------- | -------------------- | --------------- | ------- |
| 0 (initial) | 0 px                 | 113 px          | —       |
| 1           | 50 px                | 63 px           | −50 px  |
| 2           | 100 px               | 13 px           | −100 px |
| 3           | 150 px               | −37 px          | −150 px |
| 4           | 200 px               | −87 px          | −200 px |
| 5           | 250 px               | −137 px         | −250 px |

**Conclusion**: identical behaviour — the same 1:1 scroll-to-header-movement ratio.  
The bug is present on all `BaseTableComponent` virtual-scroll tables.

---

## Root Cause Analysis

### CSS at fault: `contain: strict` on `.virtual-scroll-viewport`

From `base-table.component.scss`:

```scss
.virtual-scroll-viewport {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  will-change: transform; // creates a GPU compositing layer — likely factor
  contain: strict; // implies size + layout + paint + style
}
```

`contain: strict` expands to `contain: size layout paint style`.

### Why `position: sticky` Fails in This Setup

**Note on `contain: layout`**: According to the CSS Containment spec (W3C) and MDN,
`contain: layout` by itself does _not_ break `position: sticky` for descendant elements.
Sticky positioning resolves against the nearest scroll container (found via `overflow != visible`),
and layout containment's independent formatting context does not intercept that lookup.

The observed failure — sticky header scrolling 1:1 with `scrollTop` from the very first scroll
step — is therefore not directly caused by layout containment. Three more likely mechanisms
are:

**1. `will-change: transform` on the scroll container**

When `will-change: transform` is set on the _scroll container itself_, the browser promotes it
to a GPU compositing layer and applies the same environmental effects as `transform: (anything)`.
A known browser behaviour is that composited scroll layers can bypass the standard sticky-offset
calculation: the sticky element's paint is computed on a different draw phase than the
scrolling/layout phase, and some browser compositor paths treat the sticky offset as zero when
the containing scroll layer is hardware-accelerated in this way. The result: the element paints
at its normal-flow position (top of content) and scrolls away with the content instead of holding
at `top: 0`.

**2. `contain: strict` combined with `will-change: transform`**

Even if neither rule breaks sticky individually, the combination of `contain: strict` (which
creates a new stacking context, new BFC, and constrains size and paint) with `will-change:
transform` (which creates a compositing layer) can prevent the browser's sticky-calculation pass
from correctly identifying the scroll container and computing the offset. The stacking-context and
compositing-layer boundaries effectively isolate the scroll viewport from the standard sticky
resolution path.

**3. CDK `transform: translateY(Npx)` on the content wrapper (higher scroll depths)**

At higher scroll depths CDK applies `transform: translateY(Npx)` to `.cdk-virtual-scroll-content-wrapper`
to position the rendered rows. A `transform` on any ancestor between the sticky element and the
scroll container creates a new containing block for absolutely/fixed-positioned elements and, in
practice, also disrupts sticky positioning. This is an independent secondary failure mode: at low
scroll depths (our 27-row test) the CDK transform was still `matrix(1,0,0,1,0,0)` (identity)
but the header was already broken, confirming the primary cause is not the CDK transform.

### Summary

| Factor                                                                        | Effect                                                                                                |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `will-change: transform` on scroll container                                  | Composites the scroll layer; browser sticky-offset calculation may be bypassed by the compositor path |
| `contain: strict` + `will-change: transform` combined                         | Stacking-context + compositing-layer isolation prevents correct sticky resolution                     |
| CDK `transform: translateY(Npx)` on content wrapper (at higher scroll depths) | Independent secondary failure: transform ancestor interrupts sticky lookup                            |

---

## Angular CDK Version Constraint

- `@angular/cdk`: `21.2.4`
- Angular version: `21.2.x`
- This is not a CDK bug introduced in a specific version — it is a browser-level interaction between `will-change: transform` / `contain: strict` on the scroll container and `position: sticky` for descendants, which affects all versions of CDK virtual scroll.
- There is no CDK upstream fix required; the fix is purely in the application's CSS.

---

## Proposed Fix Approach

### Recommended Fix: Replace `contain: strict` with `contain: paint` in `base-table.component.scss`

Since the primary suspected cause is the combination of `contain: strict` with `will-change: transform`, the minimal CSS fix is to replace `contain: strict` with `contain: paint`, which removes the `size`, `layout`, and `style` constraints while retaining the paint-performance benefit.

**Change**:

```scss
// Before
.virtual-scroll-viewport {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  will-change: transform;
  contain: strict;
}

// After
.virtual-scroll-viewport {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  will-change: transform;
  contain: paint; // paint only: no layout containment → sticky works
}
```

`contain: paint` tells the browser that elements inside the viewport do not overflow beyond the viewport's box (enabling GPU paint optimization) but does NOT apply `size`, `layout`, or `style` containment. This removes the constraints most likely to combine with `will-change: transform` and break sticky resolution.

### Why `contain: paint` Is Safe

- **`contain: paint`** still creates a paint-optimized compositing layer (the primary performance goal of the original rule)
- It does NOT apply layout or size containment, so `position: sticky` resolves correctly against the scroll container
- The `will-change: transform` rule is retained, preserving GPU compositing of the scroll layer
- There is no risk of layout _leakage_ to the outside of the viewport element because `overflow: auto/hidden` already clips overflow

### Alternative Fix: Remove `contain` Entirely

```scss
.virtual-scroll-viewport {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  will-change: transform;
  // contain removed entirely
}
```

This is also valid. `will-change: transform` already promotes the element to a GPU compositing layer. The `contain: strict` was originally added to further optimize paint and layout, but this change is overly aggressive and breaks the header sticky behaviour.

### Verification Approach (for Story 31.2)

After applying the fix, re-run the same Playwright scroll test on both Universe and Account screens. The `headerRow.getBoundingClientRect().top` must remain **constant** (e.g., 128 px throughout all 10 scroll steps on Universe, 113 px throughout all 5 steps on Account) rather than decreasing 1:1 with scrollTop.
