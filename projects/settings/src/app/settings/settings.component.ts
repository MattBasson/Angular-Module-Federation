/**
 * SettingsComponent — application configuration panel.
 *
 * Demonstrates that a federated remote can:
 *  1. Maintain its own local state (signals) independently of the shell
 *  2. Broadcast configuration changes to other remotes via BroadcastChannel
 *  3. Work in isolation during development (run `npm run start:settings`)
 *
 * In a real application these settings would be persisted (localStorage,
 * user profile API) and the chat remote would read them before making API
 * calls. Here we broadcast the change so the other remotes could react.
 *
 * Angular 18 features used:
 *  - Signals and signal-derived computed values
 *  - New template control flow (@if, @for)
 *  - Reactive forms alternative: simple two-way binding with signals
 */
import { Component, signal, computed } from '@angular/core';
import { FormsModule }                  from '@angular/forms';

const CHANNEL_NAME = 'ai-chat-bus';

interface ModelOption {
  id:          string;
  name:        string;
  provider:    string;
  description: string;
  maxTokens:   number;
}

const MODEL_OPTIONS: ModelOption[] = [
  { id: 'gpt-4o',         name: 'GPT-4o',         provider: 'OpenAI',    description: 'Most capable GPT-4 model, optimised for speed.',        maxTokens: 128_000 },
  { id: 'gpt-4o-mini',    name: 'GPT-4o mini',    provider: 'OpenAI',    description: 'Fast and affordable for lighter tasks.',                  maxTokens: 128_000 },
  { id: 'claude-sonnet',  name: 'Claude Sonnet',  provider: 'Anthropic', description: 'Balanced intelligence and speed.',                       maxTokens: 200_000 },
  { id: 'claude-haiku',   name: 'Claude Haiku',   provider: 'Anthropic', description: 'Near-instant responses for simpler queries.',             maxTokens: 200_000 },
  { id: 'gemini-pro',     name: 'Gemini 1.5 Pro', provider: 'Google',    description: 'Multimodal reasoning with a very large context window.', maxTokens: 1_000_000 },
];

@Component({
  selector:   'app-settings',
  standalone: true,
  imports:    [FormsModule],
  styles: [`
    :host {
      display:   block;
      max-width: 720px;
      margin:    0 auto;
      padding:   32px 24px;
    }

    h1 { font-size: 22px; font-weight: 600; color: #1e293b; margin: 0 0 4px; }
    .subtitle { font-size: 13px; color: #64748b; margin: 0 0 32px; }

    /* ── Section ── */
    .section {
      background:    #fff;
      border-radius: 12px;
      padding:       24px;
      margin-bottom: 20px;
      box-shadow:    0 1px 3px rgba(0,0,0,.07);
    }
    .section-title {
      font-size:     13px;
      font-weight:   600;
      text-transform: uppercase;
      letter-spacing: .8px;
      color:         #64748b;
      margin:        0 0 16px;
    }

    /* ── Model grid ── */
    .model-grid {
      display:               grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap:                   10px;
    }
    .model-card {
      border:        2px solid #e2e8f0;
      border-radius: 8px;
      padding:       12px;
      cursor:        pointer;
      transition:    border-color .15s, background .15s;
    }
    .model-card:hover   { border-color: #a5b4fc; background: #f8f7ff; }
    .model-card.active  { border-color: #6366f1; background: #eef2ff; }
    .model-name         { font-weight: 600; font-size: 13px; color: #1e293b; }
    .model-provider     { font-size: 11px; color: #6366f1; font-weight: 500; margin: 2px 0 4px; }
    .model-desc         { font-size: 11px; color: #64748b; line-height: 1.4; }
    .model-tokens       { font-size: 10px; color: #94a3b8; margin-top: 6px; }

    /* ── Slider row ── */
    .setting-row {
      display:     flex;
      align-items: center;
      justify-content: space-between;
      padding:     10px 0;
      border-bottom: 1px solid #f1f5f9;
      gap:         16px;
    }
    .setting-row:last-child { border-bottom: none; }
    .setting-label  { font-size: 13px; font-weight: 500; color: #1e293b; }
    .setting-desc   { font-size: 11px; color: #94a3b8; margin-top: 2px; }
    .setting-value  {
      font-size:     12px;
      font-weight:   600;
      color:         #6366f1;
      min-width:     48px;
      text-align:    right;
    }
    input[type="range"] {
      width:          140px;
      accent-color:   #6366f1;
    }
    .toggle {
      position:  relative;
      width:     40px;
      height:    22px;
      cursor:    pointer;
    }
    .toggle input { opacity: 0; width: 0; height: 0; }
    .toggle-track {
      position:      absolute;
      inset:         0;
      border-radius: 99px;
      background:    #e2e8f0;
      transition:    background .2s;
    }
    .toggle input:checked + .toggle-track { background: #6366f1; }
    .toggle-thumb {
      position:      absolute;
      top:           3px;
      left:          3px;
      width:         16px;
      height:        16px;
      border-radius: 50%;
      background:    #fff;
      box-shadow:    0 1px 3px rgba(0,0,0,.2);
      transition:    transform .2s;
    }
    .toggle input:checked ~ .toggle-thumb { transform: translateX(18px); }

    /* ── Save button ── */
    .btn-save {
      margin-top:    20px;
      padding:       10px 28px;
      background:    #6366f1;
      color:         #fff;
      border:        none;
      border-radius: 8px;
      font-size:     14px;
      font-weight:   500;
      cursor:        pointer;
      font-family:   inherit;
      transition:    background .15s;
    }
    .btn-save:hover { background: #4f46e5; }

    /* ── Toast ── */
    .toast {
      margin-top:    12px;
      padding:       10px 16px;
      background:    #dcfce7;
      color:         #166534;
      border-radius: 8px;
      font-size:     13px;
      font-weight:   500;
    }
  `],
  template: `
    <h1>Settings</h1>
    <p class="subtitle">Configure the AI Chat client. Changes are broadcast to all active micro-frontends.</p>

    <!-- Model Selection -->
    <div class="section">
      <div class="section-title">Default Model</div>
      <div class="model-grid">
        @for (model of models; track model.id) {
          <div
            class="model-card"
            [class.active]="selectedModel() === model.id"
            (click)="selectedModel.set(model.id)"
          >
            <div class="model-name">{{ model.name }}</div>
            <div class="model-provider">{{ model.provider }}</div>
            <div class="model-desc">{{ model.description }}</div>
            <div class="model-tokens">{{ model.maxTokens.toLocaleString() }} token context</div>
          </div>
        }
      </div>
    </div>

    <!-- Generation Parameters -->
    <div class="section">
      <div class="section-title">Generation Parameters</div>

      <div class="setting-row">
        <div>
          <div class="setting-label">Temperature</div>
          <div class="setting-desc">Controls randomness. Lower = more deterministic.</div>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <input type="range" min="0" max="2" step="0.1"
            [value]="temperature()"
            (input)="temperature.set(+$any($event.target).value)"
          >
          <span class="setting-value">{{ temperature().toFixed(1) }}</span>
        </div>
      </div>

      <div class="setting-row">
        <div>
          <div class="setting-label">Max Tokens</div>
          <div class="setting-desc">Maximum length of the AI response.</div>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <input type="range" min="256" max="4096" step="256"
            [value]="maxTokens()"
            (input)="maxTokens.set(+$any($event.target).value)"
          >
          <span class="setting-value">{{ maxTokens() }}</span>
        </div>
      </div>

      <div class="setting-row">
        <div>
          <div class="setting-label">Top P</div>
          <div class="setting-desc">Nucleus sampling probability mass.</div>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <input type="range" min="0.1" max="1" step="0.05"
            [value]="topP()"
            (input)="topP.set(+$any($event.target).value)"
          >
          <span class="setting-value">{{ topP().toFixed(2) }}</span>
        </div>
      </div>
    </div>

    <!-- UI Preferences -->
    <div class="section">
      <div class="section-title">Interface</div>

      <div class="setting-row">
        <div>
          <div class="setting-label">Show Timestamps</div>
          <div class="setting-desc">Display message time in the chat view.</div>
        </div>
        <label class="toggle">
          <input type="checkbox" [checked]="showTimestamps()" (change)="showTimestamps.update(v => !v)">
          <div class="toggle-track"></div>
          <div class="toggle-thumb"></div>
        </label>
      </div>

      <div class="setting-row">
        <div>
          <div class="setting-label">Stream Responses</div>
          <div class="setting-desc">Show tokens as they are generated.</div>
        </div>
        <label class="toggle">
          <input type="checkbox" [checked]="streamResponses()" (change)="streamResponses.update(v => !v)">
          <div class="toggle-track"></div>
          <div class="toggle-thumb"></div>
        </label>
      </div>

      <div class="setting-row">
        <div>
          <div class="setting-label">Compact Mode</div>
          <div class="setting-desc">Reduce padding for a denser layout.</div>
        </div>
        <label class="toggle">
          <input type="checkbox" [checked]="compactMode()" (change)="compactMode.update(v => !v)">
          <div class="toggle-track"></div>
          <div class="toggle-thumb"></div>
        </label>
      </div>
    </div>

    <button class="btn-save" (click)="save()">Save &amp; Apply</button>

    @if (saved()) {
      <div class="toast">
        ✓ Settings saved and broadcast to all micro-frontends.
      </div>
    }
  `,
})
export class SettingsComponent {

  readonly models = MODEL_OPTIONS;

  // State managed with Angular signals — no external state library needed
  selectedModel   = signal('gpt-4o');
  temperature     = signal(0.7);
  maxTokens       = signal(1024);
  topP            = signal(0.9);
  showTimestamps  = signal(true);
  streamResponses = signal(true);
  compactMode     = signal(false);
  saved           = signal(false);

  private readonly channel = new BroadcastChannel(CHANNEL_NAME);

  save(): void {
    const config = {
      model:          this.selectedModel(),
      temperature:    this.temperature(),
      maxTokens:      this.maxTokens(),
      topP:           this.topP(),
      showTimestamps: this.showTimestamps(),
      streamResponses: this.streamResponses(),
      compactMode:    this.compactMode(),
    };

    // Broadcast the new settings to all federated micro-frontends
    // listening on the shared BroadcastChannel.
    this.channel.postMessage({ type: 'SETTINGS_CHANGED', config });

    // Also persist to localStorage so settings survive page refresh
    localStorage.setItem('ai-chat-settings', JSON.stringify(config));

    this.saved.set(true);
    setTimeout(() => this.saved.set(false), 3000);
  }
}
