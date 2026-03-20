import angular from '@analogjs/vite-plugin-angular';
import type { StorybookConfig } from '@storybook/angular';
import { mergeConfig } from 'vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  framework: {
    name: '@storybook/angular',
    options: {},
  },
  core: {
    builder: {
      name: '@storybook/builder-vite',
      options: {},
    },
  },
  viteFinal(viteConfig) {
    return mergeConfig(viteConfig, {
      plugins: [angular()],
    });
  },
};

export default config;
