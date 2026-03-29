import type { StorybookConfig } from '@storybook/angular';

const config: StorybookConfig = {
  stories: ['../src/app/**/*.@(mdx|stories.@(js|jsx|ts|tsx))'],
  addons: ['@storybook/addon-themes'],
  framework: {
    name: '@storybook/angular',
    options: {},
  },
};

export default config;
