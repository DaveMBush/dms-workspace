---
name: DMS
description: Personal self-hosted CEF dividend tracker. Angular Material 22 + Tailwind CSS 4 defaults; brand blue/amber layer carried as CSS custom properties. This DESIGN.md specifies the brand-layer delta over the shared UI frameworks.
status: final
sources:
  - _bmad-output/planning-artifacts/prds/prd-dms-workspace-2026-08-20/prd.md
  - _bmad-output/planning-artifacts/architecture/architecture-dms-workspace-2026-08-22/ARCHITECTURE-SPINE.md
  - apps/dms-material/src/themes/_theme-variables.scss
updated: 2026-08-22
colors:
  # Brand overrides on top of Angular Material + Tailwind defaults. All unlisted
  # tokens inherit Material blue-palette / Tailwind gray defaults.
  primary: '#2563eb'        # --dms-primary-700, light (btn-primary)
  primary-dark: '#3b82f6'   # --dms-primary-600, dark (btn-primary)
  tertiary: '#f59e0b'       # --dms-tertiary, light (btn-tertiary)
  tertiary-dark: '#fbbf24'  # dark (btn-tertiary)
  success: '#22c55e'
  warning: '#f59e0b'
  error: '#ef4444'          # btn-error, both modes
  info: '#3b82f6'
  surface-light: '#ffffff'
  surface-dark: '#111827'
  surface-elevated-light: '#f9fafb'
  surface-elevated-dark: '#1f2937'
  text-primary-light: '#111827'
  text-primary-dark: '#f9fafb'
  text-secondary-light: '#6b7280'
  text-secondary-dark: '#9ca3af'
  border-light: '#e5e7eb'
  border-dark: '#374151'
  focus-visible-light: '#1976d2'
  focus-visible-dark: '#90caf9'
  chart-equities: '#3b82f6'
  chart-income: '#10b981'
  chart-tax-free: '#f59e0b'
  chart-alt-1: '#ef4444'
  chart-alt-2: '#8b5cf6'
typography:
  # Body, label, and caption inherit Angular Material / Roboto defaults.
  # DMS adds no custom typeface — only Roboto.
  body:
    fontFamily: 'Roboto'
  note: 'Type roles inherit Material/Roboto defaults; DMS adds no custom typeface.'
rounded:
  note: 'Material default radii (4px buttons/chips, 4px cards) inherited as-is.'
spacing:
  note: 'Tailwind default 4-based scale (4, 8, 12, 16, 24, ...) inherited as-is.'
components:
  button-primary:
    background: '{colors.primary}'
    background-dark: '{colors.primary-dark}'
    foreground: '#ffffff'
  button-tertiary:
    background: '{colors.tertiary}'
    background-dark: '{colors.tertiary-dark}'
    foreground: '#1a1208'
  button-error:
    background: '{colors.error}'
    foreground: '#ffffff'
  dialog-surface:
    background-light: '#ffffff'
    background-dark: '#424242'
---

## Brand & Style

DMS is a personal, self-hosted CEF dividend tracker. The product premise is that *your portfolio is yours* — no SaaS subscription, no telemetry, no multi-tenant complexity. The brand expression follows: a sober data-first surface with a single confident blue for primary actions, a warm amber reserved for the "this is the thing that matters" accent (tertiary buttons, tax-free income charts), and visual restraint everywhere else. No gradients, no glassmorphism, no decorative illustration. The UI is a ledger with a pulse.

DMS inherits Angular Material 22 defaults wholesale (buttons, dialogs, chips, tabs, snackbars, spinners) and Tailwind CSS 4 utility spacing/layout. This DESIGN.md specifies only the brand-layer deltas: the blue/amber brand palette carried as CSS custom properties in `_theme-variables.scss`, the semantic state tokens (success/warning/error/info), light/dark surface pairings, and the chart color assignment. The 80% of components that ship from Material (MatButton, MatDialog, MatChip, MatSnackBar, MatSort) inherit Material's visual specs as-is. Customizing those beyond the brand palette is *against* the brand discipline.

## Colors

The DMS palette is a brand blue/amber pair plus a gray neutral ramp, with four semantic state tokens.

- **Primary Blue** (`{colors.primary}` light / `{colors.primary-dark}` dark) is the brand color. Used on primary buttons (`.btn-primary`), active nav highlights, and the Material theme primary. Carried as `--dms-primary-*` CSS custom properties.
- **Tertiary Amber** (`{colors.tertiary}` light / `{colors.tertiary-dark}` dark) is the accent. Used on tertiary buttons (`.btn-tertiary`), the Material tertiary palette, and the tax-free income chart series. Never used for state badges or destructive actions.
- **Success / Warning / Error / Info** (`{colors.success}`, `{colors.warning}`, `{colors.error}`, `{colors.info}`) are the four semantic state tokens. Success (green) for positive confirmation, warning (amber) for caution, error (red) for destructive/failure, info (blue) for neutral notifications. These drive snackbar classes (`snackbar-success`, `snackbar-warn`, `snackbar-error`, `snackbar-info`) and error banner backgrounds.
- **Surface pairings** — light mode: white background on `#f9fafb` elevated surface; dark mode (`.dark-theme`): `#111827` background on `#1f2937` elevated surface. Text primary `#111827`/`#f9fafb`, text secondary `#6b7280`/`#9ca3af`, border `#e5e7eb`/`#374151`.
- **Chart palette** — `{colors.chart-equities}` (blue) for equities, `{colors.chart-income}` (green) for income, `{colors.chart-tax-free}` (amber) for tax-free income, `{colors.chart-alt-1}` (red) and `{colors.chart-alt-2}` (purple) for additional series.

All other tokens (Material elevation shadows, Tailwind gray scale for utility classes, focus ring defaults) inherit from Angular Material / Tailwind defaults. If the brand can't justify overriding a token, it doesn't.

## Typography

DMS uses **Roboto** as its sole typeface, inherited from Angular Material's default theme. No webfont loading, no custom typeface, no display/serif pairing — the single family is the brand discipline. Type roles (display, headline, title, body, label, caption) inherit Angular Material's Roboto ramp as-is; DMS adds no custom `fontFamily` token.

Two practical notes for the data-dense surfaces:

- **Tabular numbers matter.** The ledger's core surfaces — positions, income deposits, the global summary — are numeric. Where Material/Tailwind defaults don't force tabular figures, prefer the `font-variant-numeric: tabular-nums` utility so columns align when values change on inline edit. This is a usage convention, not a token.
- **Data-table sizing.** `dms-base-table` rows are `57px` tall (virtual-scroll `rowHeight`), giving comfortable line-height for dense numeric rows. Column headers inherit the Material label size. Don't shrink table text below the Material body/label sizes — the 57px row budget is what makes the virtual scroll comfortable, and text smaller than the defaults fights it.

No monospace typeface is part of the brand. If a future surface needs code/identifier display (e.g. the CUSIP cache), use the system monospace stack rather than introducing a new typeface.

## Layout & Spacing

DMS is a desktop-first, dense data application. The app shell is a **left sidebar + right content split** (`dms-splitter`): the left pane holds the account navigator (Global section: Universe, Screener, Summary, Error Logs, CUSIP Cache; Accounts section), the right pane is the routed content surface.

- **Spacing scale** inherits Tailwind's default 4-based scale (`{spacing}` — 4, 8, 12, 16, 24, ...). Components compose from these; no custom spacing tokens exist. Layout containers default to `flex flex-col` (via `host` binding) so panes stack predictably.
- **Density over whitespace.** The core value is scanning numbers. Tables use the 57px virtual-scroll row height, and columns are sized to content with tabular figures. Don't pad data surfaces with marketing-style whitespace — the ledger is the interface.
- **Responsive.** The split shell and dense tables are designed for desktop widths. There is no dedicated mobile layout; below desktop widths the split collapses rather than introducing a mobile IA. Don't invent a mobile-first grid.
- **Grids/charts.** The global summary and demo chart surfaces are the only places charts live; they inherit the same spacing scale and surface pairings as the rest of the app.

## Elevation & Depth

DMS is a flat, single-surface application. Depth is expressed with **Angular Material's standard elevation shadows**, inherited as-is — there are no custom shadow tokens, no layered glass, no drop-shadow gradients.

- **Base surface** (light `#fff` / dark `#111827`) holds the split shell and content panes.
- **Elevated surface** (light `#f9fafb` / dark `#1f2937`) is the raised plane — cards, the `dms-base-table` body, hover/selected rows.
- **Floating** (dialogs at `{components.dialog-surface}` light `#fff` / dark `#424242`, snackbars, and the full-screen loading overlay at `z-[9999]`) use Material's dialog elevation.
- **Borders over shadows.** Where a distinction is needed between adjacent panes, a 1px border (`{colors.border-light}` / `{colors.border-dark}`) is the primary separator; shadows are secondary. Don't stack heavy shadows to fake hierarchy — the surface color shift plus a thin border carries the structure.

## Shapes

Corner radii are **Angular Material defaults** (`{rounded}` — 4px for buttons, chips, and cards), inherited as-is. DMS adds no custom radius tokens.

- **4px** is the standard control radius (`.btn-primary`, `.btn-tertiary`, `.btn-error`, chips, table row hover blocks).
- **Circles** appear only where Material does — the `mat-spinner` (48px full-screen and component-level), and circular icon buttons.
- **No pill shapes, no large-radius cards, no rounded-full banners.** The ledger is rectangular and precise. If a component wants to feel "friendly" through big rounding, that's a brand violation.
- **Full-bleed panes** (sidebar, content surface) have no radius — they meet at hard 1px borders.

## Components

DMS composes from **Angular Material 22** primitives, with a small set of bespoke `dms-<name>` components for the data-heavy surfaces. Each row states what it inherits and the one brand constraint that matters.

| Component | Base | Brand delta / rule |
|---|---|---|
| `MatButton` (`.btn-primary`) | Material button | `{components.button-primary}` — primary blue `{colors.primary}` / dark `{colors.primary-dark}`, white foreground. The single "do the main thing" action per surface. |
| `MatButton` (`.btn-tertiary`) | Material button | `{components.button-tertiary}` — amber `{colors.tertiary}` / dark `{colors.tertiary-dark}`, dark foreground. The accent action; never destructive. |
| `MatButton` (`.btn-error`) | Material button | `{components.button-error}` — `{colors.error}` red, white foreground. Destructive only. |
| `MatDialog` | Material dialog | `{components.dialog-surface}` — white / dark `#424242`. Reactive forms, `Validators.required/min/pattern`; used for all "add" flows. |
| `MatSnackBar` (NotificationService) | Material snackbar | Top-end, 3000ms, "Close" action; colored via `snackbar-{success,info,warn,error}` state classes. |
| `MatChip` / `MatTabs` / `MatSort` | Material | Inherited as-is; no brand override. Tab nav drives account panel (Summary / Open / Sold / Div-dep). |
| `MatSpinner` | Material | 48px full-screen (`GlobalLoadingService`) and component-level with `aria-label`. No skeletons. |
| `dms-base-table` | CDK virtual scroll + ARIA table | The core data surface. 57px rows, multi-column `MatSort` with rank badges, `SelectionModel` + `mat-checkbox`, server-side windowing, full ARIA roles. |
| `dms-editable-cell` / `dms-editable-date-cell` | — | Inline row edit; Enter commits, Escape cancels. |
| `dms-node-editor` (ControlValueAccessor) | — | Inline rename; Enter saves, Escape cancels. |
| `dms-splitter` | — | Left sidebar / right content shell. |

The discipline: **reach for a Material primitive first.** A bespoke `dms-` component is justified only when the data density or inline-edit interaction can't be expressed with Material — `dms-base-table` and the `dms-editable-*` cells are that case. Everything else (buttons, dialogs, chips, tabs, snackbars, spinners) stays Material.

## Do's and Don'ts

| Do | Don't |
|---|---|
| Use one `{colors.primary}` blue action per surface as the primary verb. | Add a second competing primary-colored button to the same surface. |
| Reserve amber `{colors.tertiary}` for the accent verb and the tax-free income chart. | Use amber for state, warnings-as-badges, or destructive actions. |
| Express depth with surface color shift + 1px border, Material elevation shadows. | Stack heavy shadows, gradients, glassmorphism, or decorative illustration. |
| Keep tables dense: 57px rows, tabular figures, content-sized columns. | Pad data surfaces with marketing whitespace or shrink table text below Material defaults. |
| Reach for a Material 22 primitive before writing a `dms-` component. | Re-skin Material components or introduce a second UI kit. |
| Carry brand color only as the `_theme-variables.scss` CSS custom properties. | Hardcode brand hex values in component styles — go through the CSS vars. |
| Support both light and dark via the `.dark-theme` surface pairings. | Assume light-mode-only; every surface must resolve under `.dark-theme`. |
| Use Roboto (Material default) and the system monospace stack for identifiers. | Add webfonts, display/serif pairings, or a monospace typeface. |
| Keep corners at the 4px Material default. | Introduce pill shapes, large-radius cards, or rounded-full banners. |
| Design desktop-first; let the split shell collapse below desktop widths. | Invent a mobile-first grid or a separate mobile IA. |

If a change can't be justified against the brand ("a ledger with a pulse"), it doesn't ship.
