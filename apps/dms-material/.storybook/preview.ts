// Import global styles — Vite-based Storybook does not auto-load
// the styles that webpack/Angular CLI pulled from project.json
import { withThemeByClassName } from '@storybook/addon-themes';
import type { Preview } from '@storybook/angular-vite';
import '../src/styles.scss';
import '../src/tailwind-imports.css';

const preview: Preview = {
  decorators: [
    withThemeByClassName({
      themes: {
        Light: '',
        Dark: 'dark-theme',
      },
      defaultTheme: 'Light',
    }),
  ],
};

export { preview };
