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
  will-change: transform; // ← creates a stacking context (minor factor)
  contain: strict; // ← PRIMARY ROOT CAUSE
}
```

`contain: strict` expands to `contain: size layout paint style`.

### Why `contain: layout` Breaks `position: sticky`

`contain: layout` on an element makes it an **independent formatting context** (a layout root). According to the CSS Containment Level 2 spec:

> `contain: layout` establishes a new independent formatting context for its children. The element becomes both the containing block and the layout root for its subtree.

For `position: sticky` to work:

1. The sticky element must have a **scrollable ancestor** — ✅ `.virtual-scroll-viewport` has `overflow-y: auto`.
2. The sticky element must have a **containing block** (nearest block ancestor) that is _taller_ than the sticky element, giving the element a non-zero "stick range" (the distance it can travel before it is released at the bottom).

The problem: when `contain: layout` is applied to the scroll container, the browser's layout engine resolves the sticky element's containing block as the _same element_ that is also the scroll container. In this geometry, the layout containment boundary and the scroll container boundary are identical. Because the sticky element's containing block and scroll container are the same node, the browser treats sticky as if the element has already consumed its full stick range at every scroll position — effectively falling back to `position: relative`.

Additionally, `contain: size` (also part of `contain: strict`) declares that the element's size is independent of its content. This further confuses the sticky constraint calculation, as the browser cannot correctly compute the "scrollable height" vs "visible height" ratio needed to resolve where stickiness should engage and release.

### The `will-change: transform` Factor

`will-change: transform` on the viewport creates a new **stacking context** and **GPU compositing layer** for the element. While this does not by itself break sticky, it combines with `contain: strict` to fully isolate the scroll viewport's rendering from its ancestors. Any sticky resolution that might have climbed the ancestor chain is cut off by this compositing boundary.

### Angular CDK Virtual Scroll Interaction

Angular CDK version: `@angular/cdk 21.2.4` (Angular 21.2.x)

CDK virtual scroll works by:

1. Setting a large-height element inside the viewport to represent the full scroll height
2. Applying `transform: translateY(Npx)` to the `.cdk-virtual-scroll-content-wrapper` to virtually position rendered rows

In our test, at scroll depth ≤ 500 px with 27 rows × 52 px = 1,404 px total height, CDK has not yet needed to apply a translateY transform (all rows are already rendered). So the `transform` on the content wrapper is not the trigger in this case — the sticky failure happens purely due to `contain: layout` on the viewport.

At higher scroll depths (when CDK does apply `transform: translateY(Npx)` to the content wrapper), there would be a _second independent failure_: any sticky header inside a transformed element cannot be sticky relative to a scroll container outside that transform, because transforms create new stacking/containing-block contexts. This is documented in the CSS spec as: "a transform makes the element a containing block for `position: fixed`". The same mechanism makes sticky positioning resolve against the transformed ancestor rather than the scroll container.

### Summary

| Factor                                                                        | Effect                                                                                                                                    |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `contain: strict` → `contain: layout`                                         | Creates independent formatting context; sticky element's containing block = scroll container → zero stick range → sticky becomes relative |
| `contain: strict` → `contain: size`                                           | Viewport's intrinsic size is decoupled from children; sticky constraint calculation is further broken                                     |
| `will-change: transform`                                                      | Creates stacking/compositing layer; reinforces isolation of the scroll context                                                            |
| CDK `transform: translateY(Npx)` on content wrapper (at higher scroll depths) | Would independently break intra-wrapper sticky a second time                                                                              |

---

## Angular CDK Version Constraint

- `@angular/cdk`: `21.2.4`
- Angular version: `21.2.x`
- This is not a CDK bug introduced in a specific version — it is a fundamental CSS containment + sticky interaction that applies to all versions of CDK virtual scroll when `contain: strict` is applied to the viewport element.
- There is no CDK upstream fix required; the fix is purely in the application's CSS.

---

## Proposed Fix Approach

### Recommended Fix: Replace `contain: strict` with `contain: paint` in `base-table.component.scss`

`contain: content` (= `contain: layout paint style`) would NOT fix the issue because it still includes `contain: layout`. The correct fix is to use `contain: paint` only.

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

`contain: paint` tells the browser that elements inside the viewport do not overflow beyond the viewport's box (enabling GPU paint optimisation) but does NOT create an independent formatting context. This preserves the GPU compositing performance benefit while allowing the sticky header computation to work correctly.

### Why `contain: paint` Is Safe

- **`contain: paint`** still creates a paint-optimised compositing layer (the primary performance goal of the original rule)
- It does NOT apply layout containment, so `position: sticky` resolves correctly against the scroll container
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

This is also valid. `will-change: transform` already promotes the element to a GPU compositing layer. The `contain: strict` was originally added to further optimise paint and layout, but this optimization is overly aggressive and breaks the header sticky behaviour.

### Verification Approach (for Story 31.2)

After applying the fix, re-run the same Playwright scroll test on both Universe and Account screens. The `headerRow.getBoundingClientRect().top` must remain **constant** (e.g., 128 px throughout all 10 scroll steps on Universe, 113 px throughout all 5 steps on Account) rather than decreasing 1:1 with scrollTop.
