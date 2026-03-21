/**
 * HISTORY REMOTE — Standalone app root.
 * Used only when this remote runs independently for development.
 * When embedded in the shell sidebar, HistoryComponent is mounted directly.
 */
import { Component }            from '@angular/core';
import { HistoryComponent }     from './history/history.component';

@Component({
  selector:   'app-root',
  standalone: true,
  imports:    [HistoryComponent],
  template:   `<app-history style="display:block;height:100vh" />`,
})
export class AppComponent {}
