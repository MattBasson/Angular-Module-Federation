/**
 * CHAT REMOTE — app.routes.ts
 *
 * This file is exposed by the webpack config as './Routes'.
 * When the shell calls:
 *
 *   loadRemoteModule({ type: 'manifest', remoteName: 'chat', exposedModule: './Routes' })
 *     .then(m => m.CHAT_ROUTES)
 *
 * it gets this Routes array and hands it to Angular's router via loadChildren.
 * The router then renders ChatComponent inside the shell's <router-outlet>.
 *
 * CHAT_ROUTES is also used when this app runs standalone (the app.config.ts
 * passes it to provideRouter()), making the remote independently runnable.
 */
import { Routes } from '@angular/router';
import { ChatComponent } from './chat/chat.component';

export const CHAT_ROUTES: Routes = [
  { path: '', component: ChatComponent },
];
