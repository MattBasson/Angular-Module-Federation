/**
 * SHELL bootstrap.ts
 *
 * Actual Angular bootstrap lives here, not in main.ts. Webpack sees the
 * dynamic import in main.ts and treats everything in this file as a separate
 * async chunk. This gives the Module Federation runtime the opportunity to
 * resolve shared library versions across all remotes before Angular's
 * dependency injection system starts resolving providers.
 */
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent }         from './app/app.component';
import { appConfig }            from './app/app.config';

bootstrapApplication(AppComponent, appConfig)
  .catch(err => console.error(err));
