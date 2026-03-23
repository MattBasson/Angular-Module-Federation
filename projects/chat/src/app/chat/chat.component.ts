/**
 * ChatComponent — the main AI chat interface.
 *
 * This is the primary exposed surface of the Chat remote. The shell loads it
 * via the router (Pattern A) using the CHAT_ROUTES exposed module.
 * It can also be loaded directly as a component (Pattern B) via the
 * './ChatComponent' exposure — useful for embedding chat in a widget.
 *
 * This component demonstrates:
 *  - Angular 18 signals for local UI state (no NgRx / extra libraries)
 *  - Reactive computed values derived from signals
 *  - New template control flow (@if, @for) — cleaner than *ngIf/*ngFor
 *  - Auto-scroll to latest message using an ElementRef
 *  - Submitting on Enter key without a form
 */
import {
  Component,
  inject,
  signal,
  AfterViewChecked,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe }    from '@angular/common';
import { ChatService } from './chat.service';

@Component({
  selector:   'app-chat',
  standalone: true,
  imports:    [FormsModule, DatePipe],
  styles: [`
    :host {
      display:        flex;
      flex-direction: column;
      height:         100%;
      background:     #f8fafc;
    }

    /* ── Conversation header ── */
    .chat-header {
      display:         flex;
      align-items:     center;
      justify-content: space-between;
      padding:         12px 24px;
      background:      #fff;
      border-bottom:   1px solid #e2e8f0;
      flex-shrink:     0;
    }
    .chat-title {
      font-size:   15px;
      font-weight: 600;
      color:       #1e293b;
    }
    .model-badge {
      font-size:    11px;
      font-weight:  500;
      color:        #6366f1;
      background:   #eef2ff;
      padding:      3px 10px;
      border-radius: 99px;
    }
    .btn-new {
      font-size:     12px;
      font-weight:   500;
      color:         #fff;
      background:    #6366f1;
      border:        none;
      padding:       7px 14px;
      border-radius: 6px;
      cursor:        pointer;
      transition:    background .15s;
    }
    .btn-new:hover { background: #4f46e5; }

    /* ── Messages ── */
    .messages {
      flex:       1;
      overflow-y: auto;
      padding:    24px;
      display:    flex;
      flex-direction: column;
      gap:        16px;
    }
    .message {
      display:    flex;
      gap:        12px;
      max-width:  820px;
      align-self: flex-start;
    }
    .message.user {
      align-self:      flex-end;
      flex-direction:  row-reverse;
    }
    .avatar {
      width:         36px;
      height:        36px;
      border-radius: 50%;
      display:       flex;
      align-items:   center;
      justify-content: center;
      font-size:     16px;
      flex-shrink:   0;
    }
    .message.assistant .avatar { background: #eef2ff; }
    .message.user       .avatar { background: #6366f1; color: #fff; }

    .bubble {
      padding:       12px 16px;
      border-radius: 12px;
      line-height:   1.6;
      font-size:     14px;
      max-width:     600px;
    }
    .message.assistant .bubble {
      background: #fff;
      color:      #1e293b;
      box-shadow: 0 1px 3px rgba(0,0,0,.07);
      border-radius: 2px 12px 12px 12px;
    }
    .message.user .bubble {
      background:   #6366f1;
      color:        #fff;
      border-radius: 12px 2px 12px 12px;
    }
    .timestamp {
      font-size: 10px;
      color:     #94a3b8;
      margin-top: 4px;
    }
    .message.user .timestamp { text-align: right; }

    /* ── Typing indicator ── */
    .typing {
      display:     flex;
      align-items: center;
      gap:         4px;
      padding:     12px 16px;
      background:  #fff;
      border-radius: 2px 12px 12px 12px;
      box-shadow:  0 1px 3px rgba(0,0,0,.07);
      align-self:  flex-start;
    }
    .dot {
      width:         7px;
      height:        7px;
      border-radius: 50%;
      background:    #94a3b8;
      animation:     bounce .9s infinite;
    }
    .dot:nth-child(2) { animation-delay: .15s; }
    .dot:nth-child(3) { animation-delay: .3s; }
    @keyframes bounce {
      0%, 60%, 100% { transform: translateY(0); }
      30%            { transform: translateY(-6px); }
    }

    /* ── Empty state ── */
    .empty-state {
      flex:            1;
      display:         flex;
      flex-direction:  column;
      align-items:     center;
      justify-content: center;
      color:           #94a3b8;
      gap:             12px;
    }
    .empty-icon { font-size: 48px; }
    .empty-title { font-size: 18px; font-weight: 600; color: #64748b; }
    .empty-sub   { font-size: 13px; }

    /* ── Input area ── */
    .input-area {
      padding:       16px 24px;
      background:    #fff;
      border-top:    1px solid #e2e8f0;
      flex-shrink:   0;
    }
    .input-row {
      display:       flex;
      gap:           10px;
      align-items:   flex-end;
      background:    #f8fafc;
      border:        1px solid #e2e8f0;
      border-radius: 12px;
      padding:       8px 8px 8px 16px;
      transition:    border-color .2s;
    }
    .input-row:focus-within { border-color: #6366f1; }
    textarea {
      flex:       1;
      border:     none;
      background: transparent;
      resize:     none;
      outline:    none;
      font-family: inherit;
      font-size:  14px;
      color:      #1e293b;
      line-height: 1.5;
      max-height: 120px;
      min-height: 24px;
    }
    textarea::placeholder { color: #94a3b8; }
    .btn-send {
      width:         36px;
      height:        36px;
      border:        none;
      border-radius: 8px;
      background:    #6366f1;
      color:         #fff;
      cursor:        pointer;
      display:       flex;
      align-items:   center;
      justify-content: center;
      font-size:     18px;
      flex-shrink:   0;
      transition:    background .15s, transform .1s;
    }
    .btn-send:hover:not(:disabled) { background: #4f46e5; }
    .btn-send:active:not(:disabled) { transform: scale(.95); }
    .btn-send:disabled { opacity: .4; cursor: not-allowed; }
    .input-hint {
      font-size: 11px;
      color:     #94a3b8;
      margin-top: 6px;
      text-align: right;
    }
  `],
  template: `
    <!-- ── Header ── -->
    <div class="chat-header">
      <div>
        <div class="chat-title">
          {{ svc.activeConversation()?.title ?? 'New Conversation' }}
        </div>
      </div>
      <div style="display:flex;gap:10px;align-items:center">
        <span class="model-badge">{{ svc.activeConversation()?.model ?? 'gpt-4o' }}</span>
        <button class="btn-new" (click)="svc.newConversation()">+ New chat</button>
      </div>
    </div>

    <!-- ── Messages ── -->
    <div class="messages" #messageContainer>

      @if (svc.messages().length === 0) {
        <div class="empty-state">
          <div class="empty-icon">✦</div>
          <div class="empty-title">Start a conversation</div>
          <div class="empty-sub">Ask anything — this is a Module Federation demo</div>
        </div>
      }

      @for (msg of svc.messages(); track msg.id) {
        <div class="message" [class.user]="msg.role === 'user'" [class.assistant]="msg.role === 'assistant'">
          <div class="avatar">
            {{ msg.role === 'user' ? '👤' : '✦' }}
          </div>
          <div>
            <div class="bubble">{{ msg.content }}</div>
            <div class="timestamp">{{ msg.timestamp | date:'shortTime' }}</div>
          </div>
        </div>
      }

      @if (svc.isTyping()) {
        <div class="typing">
          <div class="dot"></div>
          <div class="dot"></div>
          <div class="dot"></div>
        </div>
      }
    </div>

    <!-- ── Input ── -->
    <div class="input-area">
      <div class="input-row">
        <textarea
          [(ngModel)]="inputText"
          placeholder="Message AI Chat…"
          rows="1"
          (keydown.enter)="onEnter($event)"
          [disabled]="svc.isTyping()"
        ></textarea>
        <button
          class="btn-send"
          (click)="send()"
          [disabled]="!inputText().trim() || svc.isTyping()"
          title="Send (Enter)"
        >➤</button>
      </div>
      <div class="input-hint">Enter to send · Shift+Enter for new line</div>
    </div>
  `,
})
export class ChatComponent implements AfterViewChecked {

  protected readonly svc = inject(ChatService);

  inputText = signal('');

  @ViewChild('messageContainer') private msgContainer!: ElementRef<HTMLElement>;

  private shouldScroll = false;

  async send(): Promise<void> {
    const text = this.inputText();
    if (!text.trim()) return;
    this.inputText.set('');
    this.shouldScroll = true;
    await this.svc.sendMessage(text);
    this.shouldScroll = true;
  }

  onEnter(event: KeyboardEvent): void {
    if (!event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      const el = this.msgContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
      this.shouldScroll = false;
    }
  }
}
