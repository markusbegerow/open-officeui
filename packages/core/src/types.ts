export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ModelInfo {
  id: string;
  name: string;
}

export interface ServerConfig {
  baseUrl: string;
  token: string;
}

/** Thin abstraction over the Office.js APIs of one host application. */
export interface HostAdapter {
  hostName: string;
  /** Selected text, or the whole content when nothing is selected. */
  getContext(): Promise<string>;
  /** Insert text at the cursor / after the selection. */
  insert(text: string): Promise<void>;
  /** Replace the current selection. */
  replaceSelection(text: string): Promise<void>;
  /** Open a link outside the task pane; the UI falls back to window.open. */
  openUrl?(url: string): void;
}
