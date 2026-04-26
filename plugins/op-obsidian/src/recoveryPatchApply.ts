// Vault-side controllers for OP-205 (3e). One job: take the pure plan from
// `recoveryPatch.ts` and apply it via the Obsidian vault adapter. Kept
// separate from `recoveryDialog.ts` so the patch + revert flows are testable
// against a small `VaultLike` interface — no Modal, no DOM, no Notice.

import {
  backupPathFor,
  findLatestBackup,
  formatBackupTimestamp,
  planBadModelPatch,
  type PlanBadModelPatchResult,
} from "./recoveryPatch";

/** Minimum vault surface we use. Subset of `obsidian.Vault` for testing. */
export interface VaultLike {
  read(file: VaultFileLike): Promise<string>;
  modify(file: VaultFileLike, data: string): Promise<void>;
  create(path: string, data: string): Promise<VaultFileLike>;
  trash(file: VaultFileLike, system: boolean): Promise<void>;
  /**
   * Resolve a vault-relative path to a TFile-like handle, or null if it
   * doesn't exist (or isn't a file). Mirrors `app.vault.getAbstractFileByPath`
   * semantics (we cast to TFile at the seam).
   */
  getFileByPath(path: string): VaultFileLike | null;
  /**
   * List sibling vault paths in the same parent folder. Used to find the
   * most recent `.bak-*` for a workflow file.
   */
  listSiblingPaths(parentFolder: string): string[];
}

export interface VaultFileLike {
  path: string;
}

export interface ApplyPatchInput {
  vault: VaultLike;
  workflowFile: VaultFileLike;
  /** Pre-read raw contents (we already have them when planning the diff). */
  raw: string;
  badName: string;
  replacement: string;
  /** Injectable for tests; defaults to `new Date()`. */
  now?: Date;
}

export type ApplyPatchResult =
  | { status: "ok"; backupPath: string; newText: string }
  | { status: "skipped"; reason: PlanBadModelPatchResult };

/**
 * Apply the bad-model patch to a workflow file.
 *
 * Order of operations:
 *   1. Run the pure planner — bail early on `ambiguous` / `not-found`.
 *   2. Write the `.bak-<ts>` backup via `vault.create` BEFORE the modify so
 *      a partial failure leaves the original on disk + a backup exists.
 *      Order is critical for the "always have a path back" guarantee.
 *      If the timestamp-named path already exists (two patches within the
 *      same second), the helper retries with a `-001` / `-002` … counter
 *      suffix rather than throwing EEXIST at the caller.
 *   3. `vault.modify` the workflow file with the new text.
 *
 * Returns the backup path on success so the dialog can display "backup at
 * <path>." On any plan failure we return `skipped` with the planner result
 * — the caller (the modal) renders the diagnostic in-place.
 */
export async function applyBadModelPatch(input: ApplyPatchInput): Promise<ApplyPatchResult> {
  const plan = planBadModelPatch({
    raw: input.raw,
    path: input.workflowFile.path,
    badName: input.badName,
    replacement: input.replacement,
  });
  if (plan.status !== "ok") return { status: "skipped", reason: plan };

  const ts = formatBackupTimestamp(input.now ?? new Date());
  const backupPath = await createBackupUnique(input.vault, input.workflowFile.path, input.raw, ts);
  await input.vault.modify(input.workflowFile, plan.newText);
  return { status: "ok", backupPath, newText: plan.newText };
}

/**
 * Write the backup file, retrying with a `-001` … `-005` counter suffix when
 * the plain timestamp path already exists (race: two patches within the same
 * second, or a leftover from a test).  Throws only on the final attempt or on
 * errors that aren't EEXIST-flavoured.
 */
async function createBackupUnique(
  vault: VaultLike,
  workflowPath: string,
  raw: string,
  baseTimestamp: string,
  maxAttempts = 6,
): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const suffix = i === 0 ? "" : `-${String(i).padStart(3, "0")}`;
    const path = backupPathFor(workflowPath, `${baseTimestamp}${suffix}`);
    try {
      await vault.create(path, raw);
      return path;
    } catch (err) {
      const msg = (err as Error)?.message ?? String(err);
      const isExist = msg.includes("EEXIST") || msg.includes("already exists");
      if (isExist && i < maxAttempts - 1) continue;
      throw err;
    }
  }
  /* istanbul ignore next — unreachable: loop always throws or returns */
  throw new Error("createBackupUnique: all attempts exhausted");
}

export interface RevertLastPatchInput {
  vault: VaultLike;
  workflowFile: VaultFileLike;
}

export type RevertLastPatchResult =
  | { status: "ok"; restoredFromPath: string; trashed: boolean }
  | { status: "no-backup" };

/**
 * Restore the workflow file from its most recent `.bak-*` and trash that
 * backup (system trash). One-step undo: older backups are not touched and
 * survive in-place — to restore them the user moves them manually.
 *
 * "Trashed" status is reported separately because `vault.trash` is the only
 * step that can fail without compromising correctness — the file IS restored
 * even if the trash step throws (we re-throw so callers learn about it).
 */
export async function revertLastWorkflowPatch(
  input: RevertLastPatchInput,
): Promise<RevertLastPatchResult> {
  const folder = parentFolder(input.workflowFile.path);
  const siblings = input.vault.listSiblingPaths(folder);
  const latest = findLatestBackup(siblings, input.workflowFile.path);
  if (!latest) return { status: "no-backup" };

  const bakFile = input.vault.getFileByPath(latest);
  if (!bakFile) return { status: "no-backup" };
  const bakContents = await input.vault.read(bakFile);
  await input.vault.modify(input.workflowFile, bakContents);
  // Restore is now committed. Trash the .bak — if it throws, surface it but
  // don't pretend the restore failed.
  await input.vault.trash(bakFile, true);
  return { status: "ok", restoredFromPath: latest, trashed: true };
}

function parentFolder(path: string): string {
  const i = path.lastIndexOf("/");
  return i < 0 ? "" : path.slice(0, i);
}
