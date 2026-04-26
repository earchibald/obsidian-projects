/**
 * Pure resolver for the note-level primary action chip (OP-151 / §2 of OP-149).
 *
 * Both the CM6 widget and the Reading-mode post-processor consume this. Keeps
 * the chip-state matrix in one place so the two renderers can never drift —
 * test coverage in `noteChipState.test.ts` walks every row.
 *
 * The resolver is intentionally unaware of Obsidian APIs; callers feed it the
 * frontmatter shape they already have plus a single `isAgentLive` boolean
 * (probed from tmux at render time) and get back a fully-described chip.
 */

import type { IssueStatus } from "./types";

/** Subset of issue frontmatter the chip cares about. Mirrors `IssueEntry` but
 * stays decoupled so the resolver doesn't pull in the whole store type tree. */
export interface ChipFrontmatter {
  id?: string;
  type?: string;
  status?: string;
  agent?: string;
  githubIssue?: string;
}

/** Stable identifier for the primary action; renderers map this to a click
 * handler that invokes the matching `op-*` palette command. */
export type ChipAction =
  | "start-agent"
  | "reattach-fresh"
  | "attach-session"
  | "reopen";

/** One overflow-menu entry. `command` is an Obsidian command id passed to
 * `app.commands.executeCommandById`. `requireActive` toggles whether the
 * chip menu builder should expect the issue note to be the active leaf
 * before dispatch (most do; `open-github-issue` doesn't). */
export interface ChipMenuItem {
  key: string;
  label: string;
  command: string;
  icon?: string;
}

/** Resolved chip description handed to the renderers. `null` from
 * {@link resolveChipState} means "do not render anything" — Source mode,
 * non-issue notes, or notes with malformed frontmatter. */
export interface ChipState {
  action: ChipAction;
  primaryLabel: string;
  primaryIcon: string;
  primaryCommand: string;
  /** Modifier classes to apply to the chip (`primary`, `stale`, `reopen`). */
  variant: "primary" | "stale" | "reopen";
  menu: ChipMenuItem[];
  /** Issue id pulled from frontmatter, surfaced for renderer use (titles,
   * `data-issue-id` attributes, click logging). Always non-empty when state
   * is non-null. */
  issueId: string;
  /** Status used by the resolver, normalized — surfaced so the strip helper
   * can reuse it without re-parsing. */
  status: IssueStatus;
}

/** Loose check: does this frontmatter shape describe an issue note we
 * should decorate? Both the resolver and the codeblock fence guard call
 * this so the gate logic only lives once. */
export function isIssueFrontmatter(fm: ChipFrontmatter | null | undefined): boolean {
  if (!fm) return false;
  if (fm.type !== "issue") return false;
  if (typeof fm.id !== "string" || !fm.id.match(/^[A-Z]+-\d+$/)) return false;
  return true;
}

/** Normalize free-form `status:` strings to a known {@link IssueStatus}, or
 * return `null` for unknown values so the caller can decline to render. */
function normalizeStatus(raw: string | undefined): IssueStatus | null {
  switch (raw) {
    case "open":
    case "in-progress":
    case "blocked":
    case "resolved":
    case "wontfix":
      return raw;
    default:
      return null;
  }
}

const RESOLVE_MENU: ChipMenuItem = {
  key: "resolve",
  label: "Resolve…",
  command: "op-close-current-issue",
  icon: "check-circle",
};

const APPEND_COMMIT_MENU: ChipMenuItem = {
  key: "append-commit",
  label: "Append last commit",
  command: "op-append-commit",
  icon: "git-commit",
};

const SET_PR_MENU: ChipMenuItem = {
  key: "set-pr",
  label: "Set PR…",
  command: "op-set-pr",
  icon: "git-pull-request",
};

/**
 * Resolve the chip state for one issue note. Returns `null` to suppress
 * rendering — the renderers must respect that and remove any prior decoration
 * from the DOM.
 *
 * The chip-state matrix lives in OP-151's body verbatim; tests in
 * `noteChipState.test.ts` walk every row.
 */
export function resolveChipState(
  fm: ChipFrontmatter | null | undefined,
  isAgentLive: boolean,
): ChipState | null {
  if (!isIssueFrontmatter(fm)) return null;
  const status = normalizeStatus(fm!.status);
  if (!status) return null;
  const id = fm!.id!;
  const hasAgent = typeof fm!.agent === "string" && fm!.agent.trim().length > 0;
  const githubIssue = typeof fm!.githubIssue === "string" && fm!.githubIssue.trim().length > 0;

  if (status === "resolved" || status === "wontfix") {
    const menu: ChipMenuItem[] = [];
    if (githubIssue) {
      menu.push({
        key: "open-github-issue",
        label: "Open linked GitHub issue ↗",
        command: "op-open-github-issue",
        icon: "external-link",
      });
    }
    return {
      action: "reopen",
      primaryLabel: "↺ Reopen",
      primaryIcon: "rotate-ccw",
      primaryCommand: "op-reopen-issue",
      variant: "reopen",
      menu,
      issueId: id,
      status,
    };
  }

  if (status === "in-progress" && hasAgent && isAgentLive) {
    return {
      action: "attach-session",
      primaryLabel: "▶ Attach session",
      primaryIcon: "play",
      primaryCommand: "op-attach-current",
      variant: "primary",
      menu: [APPEND_COMMIT_MENU, SET_PR_MENU, RESOLVE_MENU],
      issueId: id,
      status,
    };
  }

  if (status === "in-progress" && hasAgent && !isAgentLive) {
    return {
      action: "reattach-fresh",
      primaryLabel: "↻ Re-attach (start fresh)",
      primaryIcon: "rotate-cw",
      primaryCommand: "op-open-agent",
      variant: "stale",
      menu: [
        {
          key: "clear-stale-agent",
          label: "Clear stale agent",
          command: "op-clear-agent",
          icon: "x",
        },
        RESOLVE_MENU,
      ],
      issueId: id,
      status,
    };
  }

  if (status === "open" && hasAgent && !isAgentLive) {
    return {
      action: "reattach-fresh",
      primaryLabel: "↻ Re-attach (start fresh)",
      primaryIcon: "rotate-cw",
      primaryCommand: "op-open-agent",
      variant: "stale",
      menu: [
        {
          key: "clear-stale-agent",
          label: "Clear stale agent",
          command: "op-clear-agent",
          icon: "x",
        },
        RESOLVE_MENU,
      ],
      issueId: id,
      status,
    };
  }

  // status === "open" / "in-progress without agent" / "blocked" — chip
  // launches an agent. `op-work` runs first inside `op-open-agent` for an
  // open issue, so the chip can call `op-open-agent` for both open and
  // in-progress-without-agent rows.
  const startMenu: ChipMenuItem[] =
    status === "in-progress"
      ? [APPEND_COMMIT_MENU, SET_PR_MENU, RESOLVE_MENU]
      : [
          {
            key: "set-priority",
            label: "Set priority…",
            command: "op-set-priority",
            icon: "flag",
          },
          {
            key: "edit-scope",
            label: "Edit scope…",
            command: "op-set-scope",
            icon: "edit",
          },
          {
            key: "resolve-wontfix",
            label: "Resolve as wontfix…",
            command: "op-close-current-issue",
            icon: "x-circle",
          },
        ];
  return {
    action: "start-agent",
    primaryLabel: "▶ Start agent",
    primaryIcon: "play",
    primaryCommand: "op-open-agent",
    variant: "primary",
    menu: startMenu,
    issueId: id,
    status,
  };
}
