import type { Preview } from '@storybook/angular';
import { withThemeByClassName } from '@storybook/addon-themes';

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

export default preview;
