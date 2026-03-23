/**
 * CHAT REMOTE — Standalone app root.
 *
 * Used only when the remote is run independently (npm run start:chat).
 * When loaded by the shell, Angular renders ChatComponent directly via
 * the route rather than this root component.
 */
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector:   'app-root',
  standalone: true,
  imports:    [RouterOutlet],
  template:   `<router-outlet />`,
})
export class AppComponent {}
