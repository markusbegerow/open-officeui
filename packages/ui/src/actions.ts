export interface PromptAction {
  label: string;
  /** May contain {{variable}} placeholders that are asked for before sending. */
  prompt: string;
}

export const DEFAULT_ACTIONS: PromptAction[] = [
  { label: "Zusammenfassen", prompt: "Fasse den folgenden Text knapp zusammen." },
  { label: "Umschreiben", prompt: "Schreibe den folgenden Text klarer und professioneller um. Gib nur den neuen Text aus." },
  { label: "Korrigieren", prompt: "Korrigiere Rechtschreibung und Grammatik des folgenden Textes. Gib nur den korrigierten Text aus." },
  { label: "Ton ändern", prompt: "Schreibe den folgenden Text im Ton „{{ton}}“ um. Gib nur den neuen Text aus." },
  { label: "Übersetzen", prompt: "Übersetze den folgenden Text ins {{sprache}}. Gib nur die Übersetzung aus." },
];

const VAR = /\{\{\s*([\w\- äöüÄÖÜß]+?)\s*\}\}/g;

/** Unique variable names in order of first appearance. */
export function extractVars(prompt: string): string[] {
  return [...new Set([...prompt.matchAll(VAR)].map((m) => m[1]))];
}

export function fillVars(prompt: string, values: Record<string, string>): string {
  return prompt.replace(VAR, (_, name: string) => values[name] ?? "");
}
