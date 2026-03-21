/**
 * ChatService — manages conversation state and mock AI responses.
 *
 * In a real application this would call an LLM API (OpenAI, Anthropic, etc.).
 * Here we simulate streaming responses with a delay to demonstrate the UI
 * patterns without requiring external dependencies.
 *
 * Cross-MFE event bus:
 * BroadcastChannel is a browser-native pub/sub mechanism that works across
 * same-origin iframes, tabs, and — crucially — across independently-bootstrapped
 * micro-frontend applications in the same tab. When the History remote emits a
 * 'SELECT_CONVERSATION' event, this service picks it up and loads that
 * conversation, even though History and Chat are completely separate Angular
 * applications running in the same page.
 *
 * This pattern keeps remotes decoupled: neither remote imports from the other.
 */
import { Injectable, OnDestroy, signal, computed } from '@angular/core';
import { Message, Conversation } from './message.model';

const CHANNEL_NAME = 'ai-chat-bus';

const MOCK_RESPONSES = [
  "That's a great question! Module Federation allows multiple independently-deployed JavaScript applications to share code at runtime. It's a webpack feature that lets you build micro-frontends that feel like a single app.",
  "Angular 18 standalone components pair beautifully with Module Federation. Each remote exposes standalone components or route arrays — no NgModules needed.",
  "The key insight with Module Federation is that shared singletons prevent duplicate library instances. If both the shell and a remote include @angular/core, webpack ensures only one copy runs.",
  "The `remoteEntry.js` file is the contract surface of a federated module. It describes what the remote exposes and what shared modules it expects, without revealing implementation details.",
  "BroadcastChannel is an excellent way to communicate between federated micro-frontends. It's browser-native, synchronous within a tab, and keeps your MFEs decoupled from shared state libraries.",
  "For production Module Federation, you'd typically deploy each remote to its own CDN path or subdomain, and load the manifest from an environment-specific config endpoint.",
];

function uuid(): string {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

function mockConversations(): Conversation[] {
  return [
    {
      id:    'conv-1',
      title: 'Module Federation basics',
      model: 'gpt-4o',
      lastActive: new Date(Date.now() - 1000 * 60 * 5),
      messages: [
        { id: uuid(), role: 'user',      content: 'What is Module Federation?', timestamp: new Date() },
        { id: uuid(), role: 'assistant', content: MOCK_RESPONSES[0],            timestamp: new Date() },
      ],
    },
    {
      id:    'conv-2',
      title: 'Angular standalone components',
      model: 'gpt-4o',
      lastActive: new Date(Date.now() - 1000 * 60 * 60),
      messages: [
        { id: uuid(), role: 'user',      content: 'How do standalone components help with MF?', timestamp: new Date() },
        { id: uuid(), role: 'assistant', content: MOCK_RESPONSES[1],                             timestamp: new Date() },
      ],
    },
    {
      id:    'conv-3',
      title: 'Shared singletons',
      model: 'claude-sonnet',
      lastActive: new Date(Date.now() - 1000 * 60 * 60 * 3),
      messages: [
        { id: uuid(), role: 'user',      content: 'Why do we need singleton shared modules?', timestamp: new Date() },
        { id: uuid(), role: 'assistant', content: MOCK_RESPONSES[2],                           timestamp: new Date() },
      ],
    },
  ];
}

@Injectable({ providedIn: 'root' })
export class ChatService implements OnDestroy {

  private readonly conversations = signal<Conversation[]>(mockConversations());
  private readonly activeId      = signal<string>('conv-1');
  readonly isTyping              = signal(false);

  readonly activeConversation = computed(() =>
    this.conversations().find(c => c.id === this.activeId()) ?? null
  );

  readonly messages = computed(() =>
    this.activeConversation()?.messages ?? []
  );

  // Listen for conversation-selection events from the History remote.
  private readonly channel = new BroadcastChannel(CHANNEL_NAME);

  constructor() {
    this.channel.onmessage = (event: MessageEvent) => {
      const { type } = event.data ?? {};
      if (type === 'SELECT_CONVERSATION') {
        this.selectConversation(event.data.conversationId as string);
      }
      if (type === 'NEW_CONVERSATION') {
        this.newConversation();
      }
    };
  }

  ngOnDestroy(): void {
    this.channel.close();
  }

  selectConversation(id: string): void {
    const exists = this.conversations().some(c => c.id === id);
    if (exists) this.activeId.set(id);
  }

  async sendMessage(content: string): Promise<void> {
    if (!content.trim()) return;

    const conv = this.activeConversation();
    if (!conv) return;

    // Add user message immediately
    const userMsg: Message = { id: uuid(), role: 'user', content: content.trim(), timestamp: new Date() };
    this.conversations.update(convs =>
      convs.map(c => c.id === conv.id
        ? { ...c, messages: [...c.messages, userMsg], lastActive: new Date() }
        : c
      )
    );

    // Simulate AI thinking
    this.isTyping.set(true);
    await new Promise(r => setTimeout(r, 800 + Math.random() * 1200));
    this.isTyping.set(false);

    const aiContent = MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)];
    const aiMsg: Message = { id: uuid(), role: 'assistant', content: aiContent, timestamp: new Date() };

    this.conversations.update(convs =>
      convs.map(c => c.id === conv.id
        ? { ...c, messages: [...c.messages, aiMsg], lastActive: new Date() }
        : c
      )
    );

    // Notify other remotes that a new message arrived (History can update its preview)
    this.channel.postMessage({ type: 'CONVERSATION_UPDATED', conversationId: conv.id });
  }

  newConversation(): void {
    const id = `conv-${uuid()}`;
    const newConv: Conversation = {
      id,
      title:      'New conversation',
      model:      'gpt-4o',
      lastActive: new Date(),
      messages:   [],
    };
    this.conversations.update(convs => [newConv, ...convs]);
    this.activeId.set(id);
    this.channel.postMessage({ type: 'CONVERSATIONS_CHANGED', conversations: this.conversations() });
  }

  getConversationsSummary() {
    return this.conversations().map(c => ({
      id:         c.id,
      title:      c.title,
      model:      c.model,
      lastActive: c.lastActive,
      preview:    c.messages.at(-1)?.content.slice(0, 60) ?? '—',
    }));
  }
}
