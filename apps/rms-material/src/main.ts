import { bootstrapApplication } from '@angular/platform-browser';
import { Chart, registerables } from 'chart.js';

import { App } from './app/app';
import { appConfig } from './app/app.config';

// Register all Chart.js components (required for ng2-charts)
Chart.register(...registerables);

void bootstrapApplication(App, appConfig).catch();
