import type { App } from "obsidian";
import { Notice } from "obsidian";
import {
  BadModelSpecError,
  NoInstalledAgentError,
} from "./stepResolver";

// OP-200 (2c) recovery-dialog seam. Today this is a stub that opens the
// op-obsidian Settings tab and surfaces a follow-up Notice describing the
// failing entry. OP-?-3e replaces the body with the interactive picker — the
// signature stays stable so callers (openAgent's actionable Notice, the
// auto-advance failure path in main.ts) don't need to be retouched.
//
// The signature accepts both error classes so callers can route either
// resolver failure through the same seam — the picker UI in 3e will branch on
// `error instanceof BadModelSpecError` vs `NoInstalledAgentError` to render
// the right options.

export interface RecoveryDialogArgs {
  app: App;
  /** Issue id surfaced in the follow-up Notice (e.g. `OP-200`). */
  issueId: string;
  /** Resolver failure that triggered the dialog. */
  error: BadModelSpecError | NoInstalledAgentError;
}

export function openRecoveryDialog(args: RecoveryDialogArgs): void {
  // Open the op-obsidian Settings tab. OP-201 (Child 3a) will deep-link to
  // the Workflows section once that lands; until then, the user sees the
  // settings index and can navigate manually.
  try {
    // `app.setting` is on the runtime App but isn't typed in the public d.ts.
    const setting = (args.app as unknown as { setting?: { open(): void; openTabById(id: string): void } }).setting;
    if (setting) {
      setting.open();
      setting.openTabById("op-obsidian");
    }
  } catch (err) {
    console.warn("[op-obsidian] openRecoveryDialog: failed to open Settings tab:", err);
  }

  // Follow-up Notice with the per-entry detail. Sticky (no auto-dismiss) so
  // the user can read the diagnostic before clicking through to the file.
  const text = describeFailure(args.error);
  new Notice(text, 0);
}

function describeFailure(
  err: BadModelSpecError | NoInstalledAgentError,
): string {
  if (err.name === "NoInstalledAgentError") {
    const e = err as NoInstalledAgentError;
    return (
      `Step "${e.stepId}" has no installed agent. Tried: ${e.attemptedAgents.join(", ")}. ` +
      `Install one of these binaries, or edit the workflow file's agent list.`
    );
  }
  const e = err as BadModelSpecError;
  const aliasHint = e.bad.allowedAliases.length
    ? `Allowed aliases: ${e.bad.allowedAliases.join(", ")}.`
    : "";
  const versionedHint = e.bad.allowedVersioned.length
    ? ` Allowed versioned ids: ${e.bad.allowedVersioned.slice(0, 3).join(", ")}${e.bad.allowedVersioned.length > 3 ? ", …" : ""}.`
    : "";
  if (e.reason === "typo") {
    return (
      `Step "${e.stepId}" model spec has a typo for agent "${e.chosenAgent}": ` +
      `"${e.bad.badName}" is unknown to every registered agent. ${aliasHint}${versionedHint}`
    );
  }
  return (
    `Step "${e.stepId}" model spec has no usable entry for agent "${e.chosenAgent}". ` +
    `"${e.bad.badName}" belongs to a different agent. ${aliasHint}${versionedHint}`
  );
}
