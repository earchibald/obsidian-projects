/**
 * Pure dispatch helper for the `op: pick & act` modal (OP-152).
 *
 * The modal extends Obsidian's `SuggestModal<IssueEntry>`; its
 * `onChooseSuggestion(entry, evt)` callback receives a `MouseEvent` (mouse pick)
 * or `KeyboardEvent` (keyboard pick). This module decides which action to run
 * based on the modifier-key state, so the decision logic is testable without
 * pulling in Obsidian or the DOM.
 *
 * Action map (matches the spec's footer hint):
 *   ↵ open · ⌘↵ launch · ⌥↵ plan · ⇧↵ resolve · ⌃↵ commit
 */

export type PickAndActAction =
  | "open"
  | "launch"
  | "plan"
  | "resolve"
  | "commit";

export interface ModifierState {
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  ctrlKey?: boolean;
}

/**
 * Decide which action to run for a pick & act selection.
 *
 * Modifier precedence is intentional:
 *   - Cmd/Ctrl (`metaKey` on macOS, `ctrlKey` elsewhere) → "launch"
 *   - Alt → "plan"
 *   - Shift → "resolve"
 *   - Ctrl on macOS (without Cmd) → "commit"
 *   - Anything else → "open"
 *
 * Two modifiers held together (e.g. Cmd+Shift) take the higher-precedence
 * one ("launch" wins over "resolve") because the spec describes each binding
 * as a single decisive action and gives no instruction for combinations.
 *
 * On macOS, `Cmd↵` arrives as `metaKey: true` and `Ctrl↵` as `ctrlKey: true`.
 * On Linux/Windows, `Ctrl↵` arrives as `ctrlKey: true` and there is no `Cmd`,
 * so we treat `ctrlKey` as the "launch" modifier instead of "commit". The
 * spec's footer hint uses macOS glyphs but the binding is conceptually
 * "platform-mod for launch, raw-ctrl for commit".
 */
export function decidePickAndActAction(
  evt: ModifierState,
  isMacOS: boolean,
): PickAndActAction {
  if (isMacOS) {
    if (evt.metaKey) return "launch";
    if (evt.altKey) return "plan";
    if (evt.shiftKey) return "resolve";
    if (evt.ctrlKey) return "commit";
    return "open";
  }
  // Non-macOS: Ctrl plays the Cmd role. We surface "commit" only if the user
  // explicitly held Ctrl+Alt (a deliberate two-modifier combination) — there
  // is no separate "raw-ctrl" surface on non-Mac platforms.
  if (evt.ctrlKey && evt.altKey) return "commit";
  if (evt.ctrlKey) return "launch";
  if (evt.altKey) return "plan";
  if (evt.shiftKey) return "resolve";
  return "open";
}

/**
 * Fuzzy-match a query against an issue's id + title + project. Pure so it can
 * be unit-tested independently of Obsidian's `prepareFuzzySearch`.
 *
 * Matching rules:
 *  - Empty query → match (the modal shows everything).
 *  - Query is split on whitespace; every token must appear (case-insensitive)
 *    somewhere in `${id} ${title} ${project}`.
 *  - We don't return a score — Obsidian's modal will sort by insertion order,
 *    which we control via the caller's pre-sort.
 */
export function matchesPickAndActQuery(
  haystack: string,
  query: string,
): boolean {
  if (!query.trim()) return true;
  const hay = haystack.toLowerCase();
  for (const token of query.trim().split(/\s+/)) {
    if (!hay.includes(token.toLowerCase())) return false;
  }
  return true;
}

/**
 * Decide whether resolved issues should be included in pick & act results
 * for this query. The spec's convention: resolved issues appear only when
 * the query exactly matches an issue ID (case-insensitive).
 */
export function shouldIncludeResolved(query: string, issueId: string): boolean {
  return query.trim().toLowerCase() === issueId.toLowerCase();
}
