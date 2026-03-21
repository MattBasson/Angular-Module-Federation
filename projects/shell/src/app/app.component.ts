/**
 * SHELL AppComponent
 *
 * The root component is deliberately thin — it just renders the router outlet.
 * All layout chrome (header, sidebar, main content area) lives in
 * ShellLayoutComponent, which is the component attached to the parent route
 * in app.routes.ts.
 */
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector:    'app-root',
  standalone:  true,
  imports:     [RouterOutlet],
  template:    `<router-outlet />`,
})
export class AppComponent {}
