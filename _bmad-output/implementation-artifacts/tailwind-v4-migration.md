# Tailwind CSS v4 Migration Checklist

## Summary

This document captures all breaking changes from Tailwind CSS v3 → v4 that affect the DMS workspace, along with the migration steps needed.

**Source**: PR #501 (dependabot/npm_and_yarn/tailwindcss-4.2.1 branch) attempted a direct version bump which failed because v4 is a major rewrite requiring manual migration steps.

---

## 1. Config File Format Changes

### PostCSS Plugin Change

- **v3**: `tailwindcss` package was a PostCSS plugin
- **v4**: PostCSS plugin lives in dedicated `@tailwindcss/postcss` package
- **Action**: Update `apps/dms-material/postcss.config.js` to use `@tailwindcss/postcss` and remove `autoprefixer` (now handled automatically)

**Current** (`apps/dms-material/postcss.config.js`):

```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

**Target**:

```js
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
```

### JavaScript Config File

- **v3**: `tailwind.config.js` auto-detected
- **v4**: JS config files NOT auto-detected; must use `@config` directive in CSS
- **Action**: Add `@config "../../tailwind.config.js"` in `styles.scss` (or the main CSS entry file)
- **Architecture Decision (ADR-002)**: Keep JS config for now — CSS-first `@theme {}` migration deferred

### Content Paths

- **v3**: `content` array in JS config
- **v4**: Auto-detection won't work in monorepo — explicit paths still required
- **Action**: Ensure `content` paths in `tailwind.config.js` explicitly include:
  - `./apps/dms-material/src/**/*.ts`
  - `./apps/dms-material/src/**/*.html`

---

## 2. Removed/Renamed Utilities with Replacements

### Removed Deprecated Utilities

| v3 Utility              | v4 Replacement                               | Project Impact                                                       |
| ----------------------- | -------------------------------------------- | -------------------------------------------------------------------- |
| `bg-opacity-*`          | `bg-{color}/{opacity}` (e.g., `bg-black/50`) | **1 occurrence** in `shell.html` (`bg-opacity-50`)                   |
| `text-opacity-*`        | `text-{color}/{opacity}`                     | None found                                                           |
| `border-opacity-*`      | `border-{color}/{opacity}`                   | None found                                                           |
| `divide-opacity-*`      | `divide-{color}/{opacity}`                   | None found                                                           |
| `ring-opacity-*`        | `ring-{color}/{opacity}`                     | None found                                                           |
| `placeholder-opacity-*` | `placeholder-{color}/{opacity}`              | None found                                                           |
| `flex-shrink-*`         | `shrink-*`                                   | CSS-only (in `.scss` files, NOT Tailwind classes) — no action needed |
| `flex-grow-*`           | `grow-*`                                     | CSS-only — no action needed                                          |
| `overflow-ellipsis`     | `text-ellipsis`                              | None found                                                           |
| `decoration-slice`      | `box-decoration-slice`                       | None found                                                           |
| `decoration-clone`      | `box-decoration-clone`                       | None found                                                           |

### Renamed Utilities

| v3 Utility             | v4 Equivalent      | Project Impact          |
| ---------------------- | ------------------ | ----------------------- |
| `shadow-sm`            | `shadow-xs`        | None found in templates |
| `shadow` (bare)        | `shadow-sm`        | None found in templates |
| `drop-shadow-sm`       | `drop-shadow-xs`   | None found              |
| `drop-shadow` (bare)   | `drop-shadow-sm`   | None found              |
| `blur-sm`              | `blur-xs`          | None found              |
| `blur` (bare)          | `blur-sm`          | None found              |
| `backdrop-blur-sm`     | `backdrop-blur-xs` | None found              |
| `backdrop-blur` (bare) | `backdrop-blur-sm` | None found              |
| `rounded-sm`           | `rounded-xs`       | None found in templates |
| `rounded` (bare)       | `rounded-sm`       | None found in templates |
| `outline-none`         | `outline-hidden`   | None found in templates |
| `ring` (bare)          | `ring-3`           | None found in templates |

---

## 3. PostCSS Plugin Updates

| Package                | Current           | Target                     | Notes                                     |
| ---------------------- | ----------------- | -------------------------- | ----------------------------------------- |
| `tailwindcss`          | 3.4.1 (devDep)    | ^4.x                       | Core package upgrade                      |
| `@tailwindcss/postcss` | N/A               | ^4.x (new)                 | Replacement PostCSS plugin                |
| `@tailwindcss/vite`    | 4.2.1 (devDep)    | Keep                       | Already present as fallback               |
| `autoprefixer`         | ^10.4.24 (devDep) | Remove from PostCSS config | v4 handles vendor prefixing automatically |
| `postcss`              | ^8.5.6 (devDep)   | Keep                       | Compatible with @tailwindcss/postcss      |

### Fallback Strategy

If `@tailwindcss/postcss` doesn't produce Tailwind utility classes from inline Angular templates in the production bundle:

1. Switch to `@tailwindcss/vite` (already installed at 4.2.1)
2. Configure in Vite config alongside `@analogjs/vite-plugin-angular`
3. Re-validate entire build pipeline

---

## 4. `@import` and `@layer` Changes

### Removed `@tailwind` Directives

- **v3**: `@tailwind base;`, `@tailwind components;`, `@tailwind utilities;`
- **v4**: `@import "tailwindcss";` (monolith) or individual imports
- **Architecture Decision (ADR-002)**: Use THREE individual imports to preserve `@layer` ordering

**Current** (`apps/dms-material/src/styles.scss`):

```scss
@layer tailwind-base, material, tailwind-utilities;

@layer tailwind-base {
  @tailwind base;
}

@layer tailwind-utilities {
  @tailwind components;
  @tailwind utilities;
}
```

**Target**:

```scss
@layer tailwind-base, material, tailwind-utilities;

@layer tailwind-base {
  @import 'tailwindcss/preflight';
}

@layer tailwind-utilities {
  @import 'tailwindcss/utilities';
}
```

### Critical Constraint

- CSS layer order `@layer tailwind-base, material, tailwind-utilities` **MUST** survive the v4 migration
- The `@import "tailwindcss"` monolith import MUST NOT be used — it would break layer ordering

### Sass Compatibility Warning

- **v4 does NOT support Sass/Less/Stylus** as preprocessors
- Our `styles.scss` uses Sass features (`@use`, `@include`, SCSS variables)
- **Mitigation**: The Tailwind `@import` directives are processed by PostCSS/Tailwind BEFORE Sass compilation, so they should work. The Angular build pipeline processes `.scss` through Sass then PostCSS. However, this needs verification during Story 6.2.

---

## 5. Content Path Changes (Auto-Detection vs Explicit)

### v4 Auto-Detection

- v4 introduces automatic content detection
- **Does NOT work** in monorepo setups — explicit paths required

### Required Config

```js
// tailwind.config.js
module.exports = {
  content: ['./apps/dms-material/src/**/*.ts', './apps/dms-material/src/**/*.html'],
  // ...
};
```

### JS Config Loading

Since v4 doesn't auto-detect JS config, add to main CSS entry:

```css
@config "../../tailwind.config.js";
```

---

## 6. Dark Mode Configuration

### Current Setup

```js
darkMode: ['class', '.dark-theme'];
```

- Dark mode toggled by `.dark-theme` class on `document.body`
- **v4 change**: The `darkMode` option in JS config should still work when loaded via `@config`
- **Verify**: class-based dark mode with custom selector still functions in v4

---

## 7. Other Breaking Changes (Low/No Impact)

| Change                                                 | Impact | Notes                                             |
| ------------------------------------------------------ | ------ | ------------------------------------------------- |
| Default border color → `currentColor`                  | Low    | Check if any borders rely on old default gray-200 |
| Default ring width 3px → 1px                           | Low    | No bare `ring` usage found                        |
| Default ring color blue-500 → `currentColor`           | Low    | No bare `ring` usage found                        |
| Buttons use `cursor: default`                          | Low    | May need preflight override if pointer expected   |
| Variant stacking order (right-to-left → left-to-right) | None   | No stacked variants found                         |
| `@layer utilities` → `@utility` for custom classes     | None   | No custom Tailwind utilities defined              |
| `hover` only on hover-capable devices                  | Low    | Verify mobile touch behavior                      |
| Space-between/divide selector changes                  | Low    | Verify `space-*` and `divide-*` usage             |

---

## 8. Risks and Mitigation Strategies

### Risk 1: Sass + Tailwind v4 Incompatibility

- **Risk**: v4 docs say "not designed to be used with CSS preprocessors"
- **Mitigation**: Angular build pipeline processes Sass first, then PostCSS. The `@import "tailwindcss/*"` directives will be inside `@layer` blocks that Sass passes through. Test thoroughly in Story 6.2.

### Risk 2: `@analogjs/vite-plugin-angular` Compatibility

- **Risk**: Plugin ordering conflicts between Tailwind and Analog.js
- **Mitigation**: Use `@tailwindcss/postcss` (not Vite plugin) to avoid ordering issues. Fallback to `@tailwindcss/vite` if PostCSS approach fails.

### Risk 3: Production Bundle Missing Utility Classes

- **Risk**: Inline Angular component templates may not be scanned for Tailwind classes
- **Mitigation**: Production bundle verification gate in Story 6.2. Explicit `content` paths required.

### Risk 4: `@nx/angular/tailwind` `createGlobPatternsForDependencies` Compatibility

- **Risk**: The Nx helper function may not work with v4
- **Mitigation**: Replace with explicit glob patterns if needed.

---

## Migration Order

1. **Story 6-1** (this document): Analysis and migration checklist ✅
2. **Story 6-2**: Update dependencies, PostCSS config, `styles.scss` imports, verify production build
3. **Story 6-3**: Migrate `tailwind.config.js` to v4-compatible format
4. **Story 6-4**: Fix deprecated/renamed utility classes in templates
5. **Story 6-5**: Full CI pipeline green verification
