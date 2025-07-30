import { bootstrapApplication } from '@angular/platform-browser';

import { App } from './app/app';
import { config } from './app/app.config.server';

// eslint-disable-next-line import/no-default-export -- what angular server needs
export default async function bootstrap(): Promise<void> {
  await bootstrapApplication(App, config);
}
