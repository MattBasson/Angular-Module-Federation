/**
 * SETTINGS REMOTE — app.routes.ts
 *
 * Exposed as './Routes' by the webpack config. Consumed by the shell's
 * loadChildren() call for the /settings route.
 */
import { Routes }             from '@angular/router';
import { SettingsComponent }  from './settings/settings.component';

export const SETTINGS_ROUTES: Routes = [
  { path: '', component: SettingsComponent },
];
