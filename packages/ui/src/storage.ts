import type { Lang } from "./i18n";
import { DEFAULT_ACTIONS, type PromptAction } from "./actions";
import { HISTORY_KEY } from "./history";

const KEY = "open-officeui.settings";

export type Theme = "system" | "light" | "dark";
export type SendKey = "enter" | "ctrl-enter";

export interface Settings {
  baseUrl: string;
  token: string;
  model: string;
  systemPrompt: string;
  /** null = server default */
  temperature: number | null;
  lang: Lang;
  theme: Theme;
  sendKey: SendKey;
  actions: PromptAction[];
}

export const DEFAULT_SETTINGS: Settings = {
  baseUrl: "",
  token: "",
  model: "",
  systemPrompt: "",
  temperature: null,
  lang: "de",
  theme: "system",
  sendKey: "enter",
  actions: DEFAULT_ACTIONS,
};

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    // storage unavailable
  }
  return { ...DEFAULT_SETTINGS };
}

/** Removes settings (incl. the token) and chat history from this browser profile. */
export function clearAllData(): void {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(HISTORY_KEY);
  } catch {
    // storage unavailable
  }
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // storage unavailable
  }
}
