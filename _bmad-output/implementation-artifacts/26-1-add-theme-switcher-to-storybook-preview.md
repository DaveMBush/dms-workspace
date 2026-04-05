# Story 26.1: Add Theme Switcher to Storybook Preview

Status: Approved

## Story

As a developer,
I want Storybook to include a toolbar button for switching between the light and dark application themes,
so that I can visually verify components in both themes without manually editing the preview configuration.

## Acceptance Criteria

1. **Given** Storybook is running (`pnpm storybook`), **When** the toolbar is rendered, **Then** a theme switcher control is visible that allows selecting "Light" and "Dark" themes.
2. **Given** the theme switcher is set to "Dark", **When** any component story is viewed, **Then** the dark theme CSS class (or the appropriate Angular Material dark theme mixin) is applied to the story container.
3. **Given** the theme switcher is set to "Light", **When** any component story is viewed, **Then** the light theme CSS class is applied.
4. **Given** the configuration uses `@storybook/addon-themes` with `withThemeByClassName`, **When** Storybook builds, **Then** no build errors occur.
5. **Given** the updated preview configuration, **When** `pnpm all` is run, **Then** no TypeScript or lint errors are introduced.

## Definition of Done

- [ ] `@storybook/addon-themes` installed and added to Storybook addons list
- [ ] `withThemeByClassName` decorator configured in `apps/dms-material/.storybook/preview.ts`
- [ ] Light and Dark theme CSS class names mapped correctly to the Angular Material theme setup
- [ ] Theme switcher appears in Storybook toolbar and switches themes visually
- [ ] Run `pnpm all`
- [ ] Run `pnpm storybook` (manual: confirm toolbar shows switcher)
- [ ] Run `pnpm format`
- [ ] Repeat all of these if any fail until they all pass

## Tasks / Subtasks

- [ ] Install `@storybook/addon-themes` (AC: #4)
  - [ ] Run `pnpm add -D @storybook/addon-themes --filter dms-material` (or workspace root as appropriate)
  - [ ] Confirm the package appears in `package.json` devDependencies
- [ ] Register addon in Storybook config (AC: #1)
  - [ ] Open `apps/dms-material/.storybook/main.ts`
  - [ ] Add `'@storybook/addon-themes'` to the `addons` array
- [ ] Configure `withThemeByClassName` in preview (AC: #2, #3)
  - [ ] Open `apps/dms-material/.storybook/preview.ts`
  - [ ] Import `withThemeByClassName` from `@storybook/addon-themes`
  - [ ] Determine the correct CSS class names used for light and dark Angular Material themes in this project
    - Inspect `apps/dms-material/src/styles.scss` or equivalent global styles entry
    - Find the `[data-theme="dark"]` / `[data-theme="light"]` attribute or CSS class approach used
  - [ ] Configure the decorator:
    ```typescript
    decorators: [
      withThemeByClassName({
        themes: { Light: 'light-theme', Dark: 'dark-theme' },
        defaultTheme: 'Light',
      }),
    ];
    ```
  - [ ] Adjust class names to match actual project theme classes
- [ ] Validate (AC: #4, #5)
  - [ ] Build Storybook: `pnpm nx run dms-material:build-storybook`
  - [ ] Run `pnpm all` to confirm no regressions

## Dev Notes

### Key Files

- `apps/dms-material/.storybook/main.ts` — addon registration
- `apps/dms-material/.storybook/preview.ts` — decorator setup
- `apps/dms-material/src/styles.scss` — find actual theme class names
- `package.json` — add `@storybook/addon-themes` devDependency

### Theme Class Lookup

Before writing the config, the implementing agent must:

1. Open `apps/dms-material/src/styles.scss` (or the root styles entry)
2. Find the CSS class or attribute that Angular Material uses to toggle between light and dark palettes
3. Use those exact class names in `withThemeByClassName`

### References

[Source: apps/dms-material/.storybook/main.ts]
[Source: apps/dms-material/.storybook/preview.ts]
[Source: apps/dms-material/src/styles.scss]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
