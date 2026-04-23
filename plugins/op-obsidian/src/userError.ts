import { Notice } from "obsidian";

// Pair every user-visible failure with a one-line "what to do next" hint.
// The composed text is what the Notice shows AND what we return, so tests can
// assert on the exact message the user sees without having to stub Notice.
export function formatUserError(message: string, hint?: string): string {
  const m = message.trim();
  const h = hint?.trim();
  return h ? `${m}\n→ ${h}` : m;
}

// Default timeout: 8s for plain errors, 12s when a hint is present — hints are
// actionable and users need longer to read them.
export function userError(message: string, hint?: string): string {
  const text = formatUserError(message, hint);
  const timeoutMs = hint ? 12000 : 8000;
  new Notice(text, timeoutMs);
  console.warn("[op-obsidian]", text);
  return text;
}
