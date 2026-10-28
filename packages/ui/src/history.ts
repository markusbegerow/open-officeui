import type { ChatMessage } from "@open-officeui/core";

export const HISTORY_KEY = "open-officeui.history";
const KEY = HISTORY_KEY;
export const MAX_CHATS = 50;

export interface StoredChat {
  id: string;
  title: string;
  updated: number;
  messages: ChatMessage[];
}

export const newChatId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function chatTitle(messages: ChatMessage[]): string {
  const first = messages.find((m) => m.role === "user")?.content ?? "";
  // user messages may carry the host context after a "---" line; the title is the instruction only
  const line = first.split("\n---\n")[0].trim().replace(/\s+/g, " ");
  return line.length > 48 ? `${line.slice(0, 47)}…` : line;
}

export function loadChats(): StoredChat[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as StoredChat[];
  } catch {
    // storage unavailable or corrupt
  }
  return [];
}

function persist(chats: StoredChat[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(chats));
  } catch {
    // storage unavailable or quota exceeded
  }
}

/** Insert or update a chat, newest first, capped at MAX_CHATS. Empty chats are not stored. */
export function upsertChat(chats: StoredChat[], id: string, messages: ChatMessage[]): StoredChat[] {
  if (!messages.some((m) => m.content)) return chats;
  const entry: StoredChat = { id, title: chatTitle(messages), updated: Date.now(), messages };
  const next = [entry, ...chats.filter((c) => c.id !== id)].slice(0, MAX_CHATS);
  persist(next);
  return next;
}

export function deleteChat(chats: StoredChat[], id: string): StoredChat[] {
  const next = chats.filter((c) => c.id !== id);
  persist(next);
  return next;
}

export function searchChats(chats: StoredChat[], query: string): StoredChat[] {
  const q = query.trim().toLowerCase();
  if (!q) return chats;
  return chats.filter((c) => c.title.toLowerCase().includes(q) || c.messages.some((m) => m.content.toLowerCase().includes(q)));
}
