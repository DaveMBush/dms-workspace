import type { StorybookConfig } from '@storybook/angular-vite';

const config: StorybookConfig = {
  stories: ['../src/app/**/*.@(mdx|stories.@(js|jsx|ts|tsx))'],
  addons: ['@storybook/addon-themes'],
  framework: {
    name: '@storybook/angular-vite',
    options: {
      // Angular Vite options
      jit: true,
      liveReload: true,
      compodoc: false,
    },
  },
  core: {
    builder: '@storybook/builder-vite',
  },
  viteFinal: async function viteFinal(viteConfig) {
    // Vite-based builder avoids webpack version conflicts
    const { mergeConfig } = await import('vite');
    const tsconfigPaths = await import('vite-tsconfig-paths');
    return mergeConfig(viteConfig, {
      define: {
        ngDevMode: 'false',
      },
      plugins: [tsconfigPaths.default()],
    });
  },
};

export { config };
