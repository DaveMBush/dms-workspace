import { Component } from '@angular/core';

@Component({
  selector: 'dms-introduction',
  template: `
    <div style="font-family: sans-serif; padding: 2rem; max-width: 600px;">
      <h1>DMS Material Component Library</h1>
      <p>Welcome to the Storybook for <strong>dms-material</strong>.</p>
      <p>
        Stories for individual components will be added in subsequent stories.
      </p>
    </div>
  `,
  standalone: true,
})
export class IntroductionComponent {}
