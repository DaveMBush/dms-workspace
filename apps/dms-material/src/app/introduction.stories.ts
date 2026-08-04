import { moduleMetadata } from '@storybook/angular-vite';
import type { Meta, StoryObj } from '@storybook/angular-vite';
import { IntroductionComponent } from './introduction.component';

const meta: Meta = {
  title: 'Introduction',
  component: IntroductionComponent,
  decorators: [
    moduleMetadata({
      imports: [IntroductionComponent],
    }),
  ],
};

export default meta;

export const Welcome: StoryObj = {
  render: () => ({
    template: `<app-introduction></app-introduction>`,
  }),
};
