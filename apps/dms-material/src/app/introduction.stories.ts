import { Component } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';

@Component({
  selector: 'dms-storybook-introduction',
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
  standalone: true,
})
class IntroductionComponent {}

const meta: Meta<IntroductionComponent> = {
  title: 'Introduction',
  component: IntroductionComponent,
};

export default meta;

export const Welcome: StoryObj<IntroductionComponent> = {};
