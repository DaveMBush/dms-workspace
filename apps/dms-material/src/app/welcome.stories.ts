import { Component } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';

@Component({
  selector: 'dms-welcome',
  template: `
    <div style="padding: 2rem; font-family: sans-serif; text-align: center">
      <h1>DMS Material Storybook</h1>
      <p>Storybook is configured and running.</p>
    </div>
  `,
  standalone: true,
})
class WelcomeComponent {}

const meta: Meta<WelcomeComponent> = {
  title: 'Welcome',
  component: WelcomeComponent,
};

export default meta;
type Story = StoryObj<WelcomeComponent>;

export const Default: Story = {};
