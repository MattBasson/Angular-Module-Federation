/**
 * Shared model for chat messages.
 * In a real application this might live in a shared library or be fetched
 * from an API contract (OpenAPI/Protobuf). Here it is co-located with the
 * feature that owns it.
 */
export type MessageRole = 'user' | 'assistant';

export interface Message {
  id:        string;
  role:      MessageRole;
  content:   string;
  timestamp: Date;
}

export interface Conversation {
  id:       string;
  title:    string;
  messages: Message[];
  model:    string;
  lastActive: Date;
}
