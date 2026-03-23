/**
 * SHELL app.routes.ts
 *
 * This file is the heart of the Module Federation routing strategy.
 *
 * loadRemoteModule() is called lazily when the user navigates to a route.
 * It uses the manifest key ('chat', 'settings') resolved by initFederation()
 * in main.ts to locate the correct remoteEntry.js URL.
 *
 * Two federation loading patterns are shown here:
 *
 *  Pattern A — Route-level federation (chat, settings):
 *    loadRemoteModule returns an ES module. We grab an exported Routes array
 *    from it and hand it to loadChildren. Angular's router then renders the
 *    remote's components inside the shell's <router-outlet>.
 *
 *  Pattern B — Component-level federation (history):
 *    The history panel must always be visible in the sidebar, so it is NOT
 *    a route. Instead the shell layout component loads it directly via
 *    loadRemoteModule and renders it with NgComponentOutlet. See
 *    shell-layout.component.ts for the implementation.
 *
 * type: 'manifest' tells the helper to look up the remote URL from the
 * manifest loaded by initFederation() rather than using a hard-coded URL.
 * This is the recommended approach for production applications because
 * remote URLs can differ between environments without rebuilding the shell.
 */
import { Routes } from '@angular/router';
import { loadRemoteModule } from '@angular-architects/module-federation';
import { ShellLayoutComponent } from './layout/shell-layout.component';

export const SHELL_ROUTES: Routes = [
  {
    path: '',
    component: ShellLayoutComponent,
    children: [
      {
        path: '',
        redirectTo: 'chat',
        pathMatch: 'full',
      },

      // ── Pattern A: Route-level federation ──────────────────────────────
      // The chat remote exposes a Routes array (./Routes). The shell asks
      // Angular's router to load those routes lazily. No knowledge of the
      // remote's internal component names is needed here.
      {
        path: 'chat',
        loadChildren: () =>
          loadRemoteModule({
            type:           'manifest',
            remoteName:     'chat',
            exposedModule:  './Routes',
          }).then(m => m.CHAT_ROUTES),
      },

      // Settings follows the same pattern as chat.
      {
        path: 'settings',
        loadChildren: () =>
          loadRemoteModule({
            type:           'manifest',
            remoteName:     'settings',
            exposedModule:  './Routes',
          }).then(m => m.SETTINGS_ROUTES),
      },
    ],
  },

  // Catch-all fallback
  { path: '**', redirectTo: 'chat' },
];
