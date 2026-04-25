import { App, Platform, SuggestModal } from "obsidian";
import type { IssueEntry } from "./types";
import {
  decidePickAndActAction,
  matchesPickAndActQuery,
  shouldIncludeResolved,
  type PickAndActAction,
} from "./pickAndActDispatch";

/**
 * Handler map the modal calls when a user picks an issue + action. The plugin
 * passes its own bound methods (open issue, launch agent, etc.) so the modal
 * stays decoupled from the plugin internals.
 */
export interface PickAndActHandlers {
  open: (entry: IssueEntry) => void | Promise<void>;
  launch: (entry: IssueEntry) => void | Promise<void>;
  plan: (entry: IssueEntry) => void | Promise<void>;
  resolve: (entry: IssueEntry) => void | Promise<void>;
  commit: (entry: IssueEntry) => void | Promise<void>;
}

/**
 * `op: pick & act` modal — fuzzy-pick an issue and dispatch one of five
 * actions via modifier-enter. See {@link decidePickAndActAction} for the
 * action keymap and {@link shouldIncludeResolved} for the resolved-issue
 * inclusion convention.
 */
export class PickAndActModal extends SuggestModal<IssueEntry> {
  private currentQuery = "";

  constructor(
    app: App,
    private getIssues: () => IssueEntry[],
    private handlers: PickAndActHandlers,
  ) {
    super(app);
    this.setPlaceholder("Pick an issue — ↵ open · ⌘↵ launch · ⌥↵ plan · ⇧↵ resolve · ⌃↵ commit");
    this.appendFooterHint();
  }

  getSuggestions(query: string): IssueEntry[] {
    this.currentQuery = query;
    const issues = this.getIssues();
    const filtered = issues.filter((entry) => {
      if (entry.resolvedFolder && !shouldIncludeResolved(query, entry.id)) {
        return false;
      }
      const haystack = `${entry.id} ${entry.title} ${entry.project}`;
      return matchesPickAndActQuery(haystack, query);
    });
    // Sort: open + in-progress first, then resolved at the bottom; within each
    // bucket, numerically descending by issue number (most recent first).
    return filtered.sort((a, b) => {
      const aResolved = a.resolvedFolder ? 1 : 0;
      const bResolved = b.resolvedFolder ? 1 : 0;
      if (aResolved !== bResolved) return aResolved - bResolved;
      return numericIdSuffix(b.id) - numericIdSuffix(a.id);
    });
  }

  renderSuggestion(entry: IssueEntry, el: HTMLElement): void {
    el.addClass("op-pick-and-act__row");
    const main = el.createSpan({ cls: "op-pick-and-act__main" });
    main.createSpan({ cls: "op-pick-and-act__id", text: entry.id });
    main.createSpan({ cls: "op-pick-and-act__title", text: ` ${entry.title}` });
    const status = entry.resolvedFolder ? "resolved" : entry.status;
    el.createSpan({
      cls: `op-pick-and-act__status op-pick-and-act__status--${status}`,
      text: status,
    });
  }

  onChooseSuggestion(entry: IssueEntry, evt: MouseEvent | KeyboardEvent): void {
    const action = decidePickAndActAction(
      {
        metaKey: evt.metaKey,
        shiftKey: evt.shiftKey,
        altKey: evt.altKey,
        ctrlKey: evt.ctrlKey,
      },
      Platform.isMacOS,
    );
    void this.dispatch(action, entry);
  }

  private async dispatch(action: PickAndActAction, entry: IssueEntry): Promise<void> {
    const handler = this.handlers[action];
    await handler(entry);
  }

  /**
   * Append a static footer hint to the modal so the action keymap is always
   * visible. Obsidian's stock modals use `.prompt-instructions` for this; we
   * follow the same convention so the footer inherits theme styling.
   */
  private appendFooterHint(): void {
    const inst = this.modalEl.createDiv({ cls: "prompt-instructions op-pick-and-act__hint" });
    const items: Array<[string, string]> = [
      ["↵", "open"],
      ["⌘↵", "launch"],
      ["⌥↵", "plan"],
      ["⇧↵", "resolve"],
      ["⌃↵", "commit"],
    ];
    for (const [keys, label] of items) {
      const item = inst.createDiv({ cls: "prompt-instruction" });
      item.createSpan({ cls: "prompt-instruction-command", text: keys });
      item.createSpan({ text: ` ${label}` });
    }
    inst.createDiv({
      cls: "prompt-instruction op-pick-and-act__hint-note",
      text: "Resolved issues appear only on exact-ID match (e.g. OP-72).",
    });
  }
}

function numericIdSuffix(id: string): number {
  const m = id.match(/-(\d+)$/);
  return m ? parseInt(m[1], 10) : 0;
}
