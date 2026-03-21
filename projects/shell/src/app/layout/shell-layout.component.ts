/**
 * SHELL ShellLayoutComponent
 *
 * Renders the application chrome: top navigation bar, fixed history sidebar,
 * and the main content area where routed remote modules appear.
 *
 * Pattern B — Component-level federation (history sidebar):
 *
 * The history panel must always be visible regardless of the active route,
 * so it cannot be a lazy route. Instead we use loadRemoteModule() to fetch
 * the remote module, then NgComponentOutlet to render it dynamically.
 *
 * Steps:
 *  1. loadRemoteModule() fetches history's remoteEntry.js and returns the
 *     ES module that the remote exposes at './HistoryComponent'.
 *  2. We extract the HistoryComponent class from the module.
 *  3. NgComponentOutlet creates and mounts the component in the template.
 *
 * This approach keeps the sidebar decoupled from the shell build — the
 * history team can update their component independently.
 *
 * Error handling:
 * If a remote is unavailable (e.g. history server is down), we show a
 * graceful fallback message rather than crashing the entire shell.
 */
import {
  Component,
  OnInit,
  Type,
  signal,
} from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { NgComponentOutlet, NgIf }                   from '@angular/common';
import { loadRemoteModule }                           from '@angular-architects/module-federation';

@Component({
  selector:   'app-shell-layout',
  standalone: true,
  imports:    [RouterOutlet, RouterLink, RouterLinkActive, NgComponentOutlet, NgIf],
  styles: [`
    :host { display: flex; flex-direction: column; height: 100vh; }

    /* ── Header ── */
    .header {
      display:         flex;
      align-items:     center;
      justify-content: space-between;
      padding:         0 24px;
      height:          56px;
      background:      var(--color-header);
      color:           var(--color-text-inv);
      box-shadow:      0 2px 4px rgba(0,0,0,.2);
      flex-shrink:     0;
      z-index:         10;
    }
    .header-brand {
      display:     flex;
      align-items: center;
      gap:         10px;
      font-size:   18px;
      font-weight: 600;
      letter-spacing: -.3px;
    }
    .header-brand .icon { font-size: 22px; }
    .header-badge {
      font-size:    10px;
      font-weight:  600;
      background:   var(--color-accent);
      color:        #fff;
      padding:      2px 8px;
      border-radius: 99px;
      letter-spacing: 1px;
    }
    nav a {
      color:         var(--color-text-inv);
      opacity:       .7;
      font-size:     13px;
      font-weight:   500;
      padding:       6px 14px;
      border-radius: var(--radius);
      transition:    background .15s, opacity .15s;
    }
    nav a:hover, nav a.active {
      background: rgba(255,255,255,.1);
      opacity:    1;
    }

    /* ── Body ── */
    .body {
      display:    flex;
      flex:       1;
      overflow:   hidden;
    }

    /* ── Sidebar ── */
    .sidebar {
      width:        280px;
      flex-shrink:  0;
      background:   var(--color-sidebar);
      overflow-y:   auto;
      border-right: 1px solid rgba(255,255,255,.05);
    }
    .sidebar-error {
      padding:   24px 16px;
      color:     #f87171;
      font-size: 13px;
    }

    /* ── Main ── */
    .main {
      flex:       1;
      overflow-y: auto;
      display:    flex;
      flex-direction: column;
    }

    /* Remote loading indicator */
    .loading-remote {
      display:         flex;
      align-items:     center;
      justify-content: center;
      height:          100%;
      color:           var(--color-text-light);
      font-size:       13px;
      gap:             10px;
    }
    .spinner {
      width:         20px;
      height:        20px;
      border:        2px solid var(--color-border);
      border-top-color: var(--color-accent);
      border-radius: 50%;
      animation:     spin .7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
  template: `
    <!-- ── Header ─────────────────────────────────────────── -->
    <header class="header">
      <div class="header-brand">
        <span class="icon">✦</span>
        AI Chat
        <span class="header-badge">MF DEMO</span>
      </div>
      <nav>
        <a routerLink="/chat"     routerLinkActive="active">Chat</a>
        <a routerLink="/settings" routerLinkActive="active">Settings</a>
      </nav>
    </header>

    <!-- ── Body ────────────────────────────────────────────── -->
    <div class="body">

      <!-- Pattern B: History sidebar loaded as a federated component,
           not via the router. It is always rendered regardless of the
           active route. -->
      <aside class="sidebar">
        @if (historyRemoteError()) {
          <div class="sidebar-error">
            ⚠️ History remote unavailable.<br>
            Is <code>history</code> running on port 4202?
          </div>
        } @else if (!historyComponent()) {
          <div class="loading-remote">
            <div class="spinner"></div> Loading history…
          </div>
        } @else {
          <!-- NgComponentOutlet dynamically mounts the federated component -->
          <ng-container *ngComponentOutlet="historyComponent()" />
        }
      </aside>

      <!-- Pattern A: Routed remote modules render here -->
      <main class="main">
        <router-outlet />
      </main>

    </div>
  `,
})
export class ShellLayoutComponent implements OnInit {

  // Angular signals for reactive state — no extra state-management library needed.
  historyComponent   = signal<Type<unknown> | null>(null);
  historyRemoteError = signal(false);

  async ngOnInit(): Promise<void> {
    try {
      /**
       * loadRemoteModule with type:'manifest' looks up the 'history' key in
       * the manifest loaded by initFederation() in main.ts.
       * exposedModule: './HistoryComponent' maps to the key in the remote's
       * webpack exposes config.
       */
      const m = await loadRemoteModule({
        type:          'manifest',
        remoteName:    'history',
        exposedModule: './HistoryComponent',
      });
      this.historyComponent.set(m.HistoryComponent);
    } catch (err) {
      console.error('Failed to load History remote:', err);
      this.historyRemoteError.set(true);
    }
  }
}
