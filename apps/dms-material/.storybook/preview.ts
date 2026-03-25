import { provideZonelessChangeDetection } from '@angular/core';
import { applicationConfig, type Preview } from '@storybook/angular';

const preview: Preview = {
  decorators: [
    applicationConfig({
      providers: [provideZonelessChangeDetection()],
    }),
  ],
};

export default preview;
