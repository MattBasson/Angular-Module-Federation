/**
 * HistoryComponent — conversation history sidebar.
 *
 * This component is the only exposed surface of the History remote.
 * It is loaded by the shell directly (not via the router) and rendered
 * in the left sidebar using NgComponentOutlet.
 *
 * Cross-MFE communication (BroadcastChannel):
 *  - LISTENING for 'CONVERSATIONS_CHANGED' — when the chat remote creates a
 *    new conversation it broadcasts the updated list. History listens and
 *    re-renders the sidebar. No shared state library needed.
 *
 *  - EMITTING 'SELECT_CONVERSATION' — when the user clicks an item, History
 *    broadcasts the selection. The chat remote listens and loads that
 *    conversation. Again, no direct import between remotes.
 *
 * This demonstrates true micro-frontend decoupling: History and Chat never
 * import each other. They communicate only through a named browser channel.
 *
 * Design note: the component uses the same dark sidebar palette defined in
 * the shell's global styles (:root CSS variables). Because Angular scopes
 * component styles to the component's host element, and the shell's global
 * styles are on <html>/<body>, the CSS variables cascade into the remote
 * component's styles automatically — a small but useful integration detail.
 */
import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  computed,
} from '@angular/core';
import { DatePipe } from '@angular/common';

const CHANNEL_NAME = 'ai-chat-bus';

interface ConversationSummary {
  id:         string;
  title:      string;
  model:      string;
  lastActive: Date;
  preview:    string;
}

// Seed data — mirrors the mock data in ChatService so the UI is coherent
function seedData(): ConversationSummary[] {
  return [
    { id: 'conv-1', title: 'Module Federation basics',   model: 'gpt-4o',        lastActive: new Date(Date.now() - 300_000),  preview: 'What is Module Federation?' },
    { id: 'conv-2', title: 'Angular standalone components', model: 'gpt-4o',     lastActive: new Date(Date.now() - 3_600_000), preview: 'How do standalone components help with MF?' },
    { id: 'conv-3', title: 'Shared singletons',          model: 'claude-sonnet', lastActive: new Date(Date.now() - 10_800_000), preview: 'Why do we need singleton shared modules?' },
  ];
}

@Component({
  selector:   'app-history',
  standalone: true,
  imports:    [DatePipe],
  styles: [`
    :host {
      display:        flex;
      flex-direction: column;
      height:         100%;
      background:     var(--color-sidebar, #1e293b);
      color:          var(--color-text-inv, #f1f5f9);
      overflow:       hidden;
    }

    /* ── Header ── */
    .sidebar-header {
      padding:       16px;
      border-bottom: 1px solid rgba(255,255,255,.07);
      flex-shrink:   0;
    }
    .sidebar-title {
      font-size:   11px;
      font-weight: 600;
      letter-spacing: 1px;
      text-transform: uppercase;
      color:       #94a3b8;
      margin-bottom: 12px;
    }
    .btn-new {
      width:         100%;
      padding:       8px 12px;
      background:    rgba(99,102,241,.2);
      border:        1px solid rgba(99,102,241,.4);
      border-radius: 6px;
      color:         #a5b4fc;
      font-size:     13px;
      font-weight:   500;
      cursor:        pointer;
      text-align:    left;
      transition:    background .15s;
      font-family:   inherit;
    }
    .btn-new:hover { background: rgba(99,102,241,.35); }

    /* ── Search ── */
    .search-wrap {
      padding:     8px 16px 0;
      flex-shrink: 0;
    }
    .search-input {
      width:         100%;
      padding:       7px 10px;
      background:    rgba(255,255,255,.06);
      border:        1px solid rgba(255,255,255,.1);
      border-radius: 6px;
      color:         #f1f5f9;
      font-size:     13px;
      font-family:   inherit;
      outline:       none;
      transition:    border-color .15s;
    }
    .search-input::placeholder { color: #475569; }
    .search-input:focus { border-color: rgba(99,102,241,.6); }

    /* ── List ── */
    .conv-list {
      flex:       1;
      overflow-y: auto;
      padding:    8px 0;
    }
    .conv-list::-webkit-scrollbar { width: 4px; }
    .conv-list::-webkit-scrollbar-track { background: transparent; }
    .conv-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,.15); border-radius: 99px; }

    .conv-item {
      padding:    10px 16px;
      cursor:     pointer;
      transition: background .12s;
      border-left: 3px solid transparent;
    }
    .conv-item:hover  { background: rgba(255,255,255,.05); }
    .conv-item.active {
      background:  rgba(99,102,241,.15);
      border-left-color: #6366f1;
    }
    .conv-item-title {
      font-size:     13px;
      font-weight:   500;
      white-space:   nowrap;
      overflow:      hidden;
      text-overflow: ellipsis;
      color:         #e2e8f0;
    }
    .conv-item.active .conv-item-title { color: #a5b4fc; }
    .conv-item-meta {
      display:     flex;
      align-items: center;
      gap:         8px;
      margin-top:  3px;
    }
    .conv-item-preview {
      font-size:     11px;
      color:         #64748b;
      white-space:   nowrap;
      overflow:      hidden;
      text-overflow: ellipsis;
      flex:          1;
    }
    .conv-item-time {
      font-size:  10px;
      color:      #475569;
      flex-shrink: 0;
    }
    .model-pill {
      font-size:    9px;
      font-weight:  600;
      padding:      1px 6px;
      border-radius: 99px;
      background:   rgba(99,102,241,.2);
      color:        #818cf8;
      flex-shrink:  0;
      text-transform: uppercase;
      letter-spacing: .5px;
    }

    /* ── Empty ── */
    .empty {
      padding:   24px 16px;
      text-align: center;
      color:      #475569;
      font-size:  13px;
    }
  `],
  template: `
    <div class="sidebar-header">
      <div class="sidebar-title">Conversations</div>
      <button class="btn-new" (click)="newConversation()">+ New conversation</button>
    </div>

    <div class="search-wrap">
      <input
        class="search-input"
        type="text"
        placeholder="Search conversations…"
        [value]="searchQuery()"
        (input)="searchQuery.set($any($event.target).value)"
      >
    </div>

    <div class="conv-list">
      @if (filtered().length === 0) {
        <div class="empty">No conversations found</div>
      }
      @for (conv of filtered(); track conv.id) {
        <div
          class="conv-item"
          [class.active]="activeId() === conv.id"
          (click)="select(conv.id)"
        >
          <div class="conv-item-title">{{ conv.title }}</div>
          <div class="conv-item-meta">
            <span class="conv-item-preview">{{ conv.preview }}</span>
            <span class="model-pill">{{ conv.model.split('-')[0] }}</span>
            <span class="conv-item-time">{{ conv.lastActive | date:'shortTime' }}</span>
          </div>
        </div>
      }
    </div>
  `,
})
export class HistoryComponent implements OnInit, OnDestroy {

  conversations = signal<ConversationSummary[]>(seedData());
  activeId      = signal<string>('conv-1');
  searchQuery   = signal('');

  filtered = computed(() => {
    const q = this.searchQuery().toLowerCase();
    return q
      ? this.conversations().filter(c =>
          c.title.toLowerCase().includes(q) || c.preview.toLowerCase().includes(q)
        )
      : this.conversations();
  });

  private readonly channel = new BroadcastChannel(CHANNEL_NAME);

  ngOnInit(): void {
    this.channel.onmessage = (event: MessageEvent) => {
      const { type } = event.data;

      if (type === 'CONVERSATIONS_CHANGED') {
        // Chat remote broadcasted a new conversation list
        this.conversations.set(event.data.conversations as ConversationSummary[]);
      }

      if (type === 'CONVERSATION_UPDATED') {
        // A conversation was updated (new message sent)
        // Bump its lastActive time so it floats to the top on next sort
        this.conversations.update(list =>
          list.map(c =>
            c.id === event.data.conversationId
              ? { ...c, lastActive: new Date() }
              : c
          )
        );
      }
    };
  }

  ngOnDestroy(): void {
    this.channel.close();
  }

  select(id: string): void {
    this.activeId.set(id);
    // Emit selection so the Chat remote can load the right conversation
    this.channel.postMessage({ type: 'SELECT_CONVERSATION', conversationId: id });
  }

  newConversation(): void {
    // Let the Chat remote create the conversation — it owns that state.
    // We just broadcast the intent.
    this.channel.postMessage({ type: 'NEW_CONVERSATION' });
  }
}
