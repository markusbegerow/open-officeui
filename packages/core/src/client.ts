import { readDeltas } from "./sse";
import type { ChatMessage, ModelInfo, ServerConfig } from "./types";

const trimSlash = (u: string) => u.replace(/\/+$/, "");

export async function signIn(baseUrl: string, email: string, password: string): Promise<string> {
  const res = await fetch(`${trimSlash(baseUrl)}/api/v1/auths/signin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`Login fehlgeschlagen (${res.status})`);
  const json = await res.json();
  if (typeof json?.token !== "string") throw new Error("Login: kein Token erhalten");
  return json.token;
}

export async function listModels(cfg: ServerConfig): Promise<ModelInfo[]> {
  const res = await fetch(`${trimSlash(cfg.baseUrl)}/api/models`, {
    headers: { Authorization: `Bearer ${cfg.token}` },
  });
  if (!res.ok) throw new Error(`Modelle laden fehlgeschlagen (${res.status})`);
  const json = await res.json();
  return (json?.data ?? []).map((m: { id: string; name?: string }) => ({ id: m.id, name: m.name ?? m.id }));
}

export interface StreamOptions {
  signal?: AbortSignal;
  /** Prepended as a system message when non-empty. */
  systemPrompt?: string;
  temperature?: number;
}

export async function* streamChat(
  cfg: ServerConfig,
  model: string,
  messages: ChatMessage[],
  opts: StreamOptions = {},
): AsyncGenerator<string> {
  const system = opts.systemPrompt?.trim();
  const body: Record<string, unknown> = {
    model,
    messages: system ? [{ role: "system", content: system }, ...messages] : messages,
    stream: true,
  };
  if (opts.temperature !== undefined) body.temperature = opts.temperature;
  const res = await fetch(`${trimSlash(cfg.baseUrl)}/api/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.token}` },
    body: JSON.stringify(body),
    signal: opts.signal,
  });
  if (!res.ok || !res.body) throw new Error(`Chat fehlgeschlagen (${res.status})`);
  yield* readDeltas(res.body);
}
