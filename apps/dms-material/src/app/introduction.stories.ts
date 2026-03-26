import type { Meta, StoryObj } from '@storybook/angular';

const meta: Meta = {
  title: 'Introduction',
};

export default meta;

export const Welcome: StoryObj = {
  render: function renderWelcome() {
    return {
      template: `
        <div style="font-family: sans-serif; padding: 2rem; max-width: 600px;">
          <h1>DMS Material Component Library</h1>
          <p>Welcome to the Storybook for <strong>dms-material</strong>.</p>
          <p>
            Stories for individual components will be added in subsequent stories
            (16.3+).
          </p>
        </div>
      `,
    };
  },
};
