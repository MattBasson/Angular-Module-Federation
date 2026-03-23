/**
 * SHELL app.config.ts
 *
 * Angular 18 standalone application configuration. All providers are
 * registered here and passed to bootstrapApplication().
 *
 * provideRouter() sets up the client-side router. Routes are defined
 * separately in app.routes.ts; some of those routes lazy-load federated
 * remote modules using loadRemoteModule().
 */
import { ApplicationConfig } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { SHELL_ROUTES } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(SHELL_ROUTES, withComponentInputBinding()),
    provideAnimations(),
  ],
};
