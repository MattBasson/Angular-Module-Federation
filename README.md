# Angular Module Federation — AI Chat Client Demo

A complete, runnable example of **Webpack Module Federation** in an Angular 18 monorepo. The application is an AI chat client — chosen because it has a naturally micro-frontend-friendly shape: a persistent history sidebar, a main chat area, and a settings page that are all distinct enough to be owned by different teams.

> **The goal is not a polished product.** The goal is to make Module Federation's principals as legible as possible in the code itself. Every key decision is annotated with a comment explaining *why*, not just *what*.

---

## What is Module Federation?

Module Federation is a webpack 5 feature that allows multiple independently-built JavaScript applications to share code **at runtime** — not at build time. Each application:

- Compiles and deploys on its own schedule
- Serves its own `remoteEntry.js` — a manifest of what it exposes and what shared libraries it needs
- Can be consumed by a "host" (shell) application without the shell needing to rebuild

The result is a **micro-frontend architecture** where teams can ship features independently while the user sees a single, cohesive application.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  Browser (one page, one URL origin)                              │
│                                                                  │
│  ┌─────────────────── SHELL :4200 ──────────────────────────┐   │
│  │  federation.manifest.json  ←  loaded at startup          │   │
│  │                                                           │   │
│  │  ┌──────────────┐  ┌──────────────────────────────────┐  │   │
│  │  │ HISTORY      │  │  <router-outlet>                 │  │   │
│  │  │ :4202        │  │                                  │  │   │
│  │  │ (always      │  │  /chat     → CHAT remote :4201   │  │   │
│  │  │  visible)    │  │  /settings → SETTINGS    :4203   │  │   │
│  │  │              │  │                                  │  │   │
│  │  └──────────────┘  └──────────────────────────────────┘  │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Cross-MFE events via BroadcastChannel('ai-chat-bus')            │
└──────────────────────────────────────────────────────────────────┘
```

### Applications

| App | Port | Role | Exposes |
|-----|------|------|---------|
| **shell** | 4200 | Host / orchestrator | nothing |
| **chat** | 4201 | Remote | `./Routes`, `./ChatComponent` |
| **history** | 4202 | Remote | `./HistoryComponent` |
| **settings** | 4203 | Remote | `./Routes`, `./SettingsComponent` |

---

## Key Concepts Demonstrated

### 1. The Async Bootstrap Pattern (`main.ts` → `bootstrap.ts`)

Every app (shell and remotes) has this pattern:

```typescript
// main.ts
import('./bootstrap').catch(err => console.error(err));

// bootstrap.ts
bootstrapApplication(AppComponent, appConfig).catch(err => console.error(err));
```

The dynamic `import('./bootstrap')` is not just style — it is **mechanically required**. webpack needs an asynchronous boundary between the entry point and the rest of the application so it can negotiate shared module versions across all remotes before Angular's DI system starts loading providers. Without this, you risk running two copies of `@angular/core` in the same tab.

### 2. Manifest-based Dynamic Federation (shell `main.ts`)

```typescript
// shell/src/main.ts
initFederation('/assets/federation.manifest.json')
  .then(() => import('./bootstrap'));
```

```json
// shell/src/assets/federation.manifest.json
{
  "chat":     "http://localhost:4201/remoteEntry.js",
  "history":  "http://localhost:4202/remoteEntry.js",
  "settings": "http://localhost:4203/remoteEntry.js"
}
```

Remote URLs are not baked into the shell's webpack config. They live in `federation.manifest.json`, which can be environment-specific (CI can swap it per deployment target). The shell builds once and points at whichever remotes are appropriate for that environment.

### 3. Pattern A — Route-level Federation (chat, settings)

```typescript
// shell/src/app/app.routes.ts
{
  path: 'chat',
  loadChildren: () =>
    loadRemoteModule({
      type:          'manifest',
      remoteName:    'chat',       // ← key in manifest.json
      exposedModule: './Routes',   // ← key in chat's webpack exposes
    }).then(m => m.CHAT_ROUTES),
}
```

The shell's router lazy-loads an Angular `Routes` array from the remote. The shell never imports the remote's component class directly — it only knows the string contract `'./Routes'` and `'chat'`.

### 4. Pattern B — Component-level Federation (history sidebar)

```typescript
// shell/src/app/layout/shell-layout.component.ts
const m = await loadRemoteModule({
  type:          'manifest',
  remoteName:    'history',
  exposedModule: './HistoryComponent',
});
this.historyComponent.set(m.HistoryComponent);
```

```html
<ng-container *ngComponentOutlet="historyComponent()" />
```

The history panel is always visible (it's in the layout, not a route). The shell loads it as a component class and mounts it with `NgComponentOutlet`. No router involved. This pattern is useful for widgets, headers, and sidebars.

### 5. Shared Singletons (webpack `shared` config)

```javascript
// Every webpack.config.js
shared: {
  ...shareAll({
    singleton:       true,  // only one copy loaded per browser tab
    strictVersion:   true,  // throw if version mismatch
    requiredVersion: 'auto' // read from package.json automatically
  }),
}
```

`shareAll` marks every dependency in `package.json` as shared. The most important shared singleton is `@angular/core` — if it loaded twice, Angular's DI system would have two separate injector trees, and `inject()` calls between apps would fail silently or return `null`.

`strictVersion: true` means webpack throws a runtime error if a remote needs a version incompatible with what the shell already loaded. This surfaces version drift early, rather than letting it cause subtle bugs.

### 6. Cross-MFE Communication (BroadcastChannel)

```typescript
// history/src/app/history/history.component.ts
const channel = new BroadcastChannel('ai-chat-bus');
channel.postMessage({ type: 'SELECT_CONVERSATION', conversationId: id });

// chat/src/app/chat/chat.service.ts
const channel = new BroadcastChannel('ai-chat-bus');
channel.onmessage = (event) => {
  if (event.data.type === 'SELECT_CONVERSATION') {
    this.selectConversation(event.data.conversationId);
  }
};
```

`BroadcastChannel` is a browser-native pub/sub API that works across same-origin contexts in the same tab. Neither remote imports from the other — they only share a channel name string. This is the minimum coupling needed for micro-frontends to collaborate.

Events used in this demo:

| Event | Direction | Purpose |
|-------|-----------|---------|
| `SELECT_CONVERSATION` | History → Chat | User clicked a conversation |
| `CONVERSATION_UPDATED` | Chat → History | New message sent, update preview |
| `CONVERSATIONS_CHANGED` | Chat → History | New conversation created |
| `NEW_CONVERSATION` | History → Chat | User pressed "+ New" in sidebar |
| `SETTINGS_CHANGED` | Settings → All | User saved settings |

### 7. Independently Runnable Remotes

Each remote can be started and used in isolation:

```bash
npm run start:chat  # opens at http://localhost:4201
```

The remote bootstraps its own Angular application with its own router. This means:
- Teams can develop and test their feature without running the full stack
- QA can test a remote in isolation
- The remote's standalone `index.html` is a development harness

---

## Project Structure

```
Angular-Module-Federation/
├── angular.json                    # Workspace config for all 4 projects
├── package.json                    # Single node_modules for the workspace
├── tsconfig.json                   # Shared TypeScript config
│
└── projects/
    ├── shell/                      # Host application (port 4200)
    │   ├── webpack.config.js       # MF host: no exposes, manifest-based remotes
    │   └── src/
    │       ├── main.ts             # initFederation() → dynamic import bootstrap
    │       ├── bootstrap.ts        # bootstrapApplication()
    │       ├── assets/
    │       │   └── federation.manifest.json   # Remote URL registry
    │       └── app/
    │           ├── app.routes.ts   # Pattern A routes using loadRemoteModule()
    │           └── layout/
    │               └── shell-layout.component.ts  # Pattern B: NgComponentOutlet
    │
    ├── chat/                       # Remote (port 4201)
    │   ├── webpack.config.js       # exposes: './Routes', './ChatComponent'
    │   └── src/app/
    │       ├── app.routes.ts       # Exported as CHAT_ROUTES (the exposed module)
    │       └── chat/
    │           ├── chat.component.ts   # UI: message list + input
    │           ├── chat.service.ts     # State + BroadcastChannel listener
    │           └── message.model.ts    # Shared types (within this remote)
    │
    ├── history/                    # Remote (port 4202)
    │   ├── webpack.config.js       # exposes: './HistoryComponent'
    │   └── src/app/history/
    │       └── history.component.ts    # Sidebar UI + BroadcastChannel emitter
    │
    └── settings/                   # Remote (port 4203)
        ├── webpack.config.js       # exposes: './Routes', './SettingsComponent'
        └── src/app/settings/
            └── settings.component.ts  # Model/parameter UI + SETTINGS_CHANGED broadcast
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Install

```bash
npm install
```

### Run (all apps together)

```bash
npm run start:all
```

Then open **http://localhost:4200**

> The script starts all four dev servers concurrently. The shell loads last so the remotes are ready when it tries to fetch their `remoteEntry.js`. If you see "History remote unavailable" in the sidebar, check that port 4202 is serving.

### Run individually

```bash
# Start only one remote for isolated development
npm run start:chat      # http://localhost:4201
npm run start:history   # http://localhost:4202
npm run start:settings  # http://localhost:4203

# Start shell alone (remotes will show graceful error states)
npm run start:shell     # http://localhost:4200
```

### Build

```bash
npm run build:all
```

Builds must happen in dependency order: remotes first, then shell. The `build:all` script handles this. In CI you would build in parallel across separate agents and then run the shell build.

---

## Angular 18 Features Used

| Feature | Where | Purpose |
|---------|-------|---------|
| Standalone components | Everywhere | Removes NgModule overhead; cleaner MF boundaries |
| Signals | ChatService, HistoryComponent, SettingsComponent | Reactive state without RxJS or NgRx |
| `@if` / `@for` control flow | All templates | Cleaner than `*ngIf` / `*ngFor` directives |
| `NgComponentOutlet` | ShellLayoutComponent | Dynamically renders federated component |
| `provideRouter` / functional config | All `app.config.ts` | Tree-shakeable, no module boilerplate |
| `withComponentInputBinding` | Shell, Chat, Settings | Maps route params to component inputs |

---

## Connecting to a Real AI API

The `ChatService` uses mock responses. To connect to a real API:

1. Add your API client to `projects/chat/` (it only affects that remote's bundle)
2. Replace the `sendMessage()` implementation in `chat.service.ts`
3. For streaming, use the `ReadableStream` API and update the message signal incrementally

No other remotes need to change.

---

## Production Considerations

| Concern | Approach |
|---------|----------|
| Remote URLs per environment | Replace `federation.manifest.json` in CI before deploying the shell |
| CDN deployment | Each remote's `dist/` folder is independently deployable to its own CDN path |
| Version mismatches | `strictVersion: true` catches them at runtime; monitor for `Unsatisfied version` errors in prod |
| Remote unavailability | Shell shows graceful fallback (see `shell-layout.component.ts` error handling) |
| Bundle size | Each remote is an independent chunk; users only download what they navigate to |
| Caching | `outputHashing: 'all'` in production gives long-lived cache keys per build |

---

## License

GNU General Public License v3 — see [LICENSE](./LICENSE).