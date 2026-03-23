/**
 * SHELL main.ts
 *
 * The shell entry point has two responsibilities:
 *
 * 1. Load the federation manifest so that the Module Federation runtime
 *    knows where each remote's remoteEntry.js lives before any lazy load
 *    is attempted. initFederation() fetches /assets/federation.manifest.json
 *    and registers each remote with the MF runtime.
 *
 * 2. Dynamically import ./bootstrap AFTER the manifest is loaded. This
 *    dynamic import is the critical Module Federation bootstrap pattern:
 *    it gives webpack a chance to negotiate shared modules with remotes
 *    before Angular itself is initialised. Bootstrapping synchronously
 *    (i.e. calling bootstrapApplication directly here) would cause shared
 *    modules — like @angular/core — to be loaded before remotes have had
 *    a chance to declare what they need, which leads to duplicate copies
 *    of Angular running in the same tab.
 */
import { initFederation } from '@angular-architects/module-federation';

initFederation('/assets/federation.manifest.json')
  .catch(err => console.error('Federation manifest load failed:', err))
  .then(() => import('./bootstrap'))
  .catch(err => console.error('Bootstrap failed:', err));
