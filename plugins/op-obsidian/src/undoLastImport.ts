import { App, TFile, TFolder, normalizePath } from "obsidian";
import type { OpSettings } from "./settingsPure";
import {
  TRANSACTION_HISTORY_DIR,
  parseTransaction,
  type TransactionRecord,
} from "./exportImportPure";
import { currentProjectsRoot, importHistoryDirPath, statusPathFor } from "./projectPaths";

// IO seam for `op-undo-last-import` (OP-187 / Child 4 of OP-181).
// Reverses the most recent transaction record in `Projects/_op-import-history/`:
//   - Trash imported module files at their landed paths.
//   - Restore any backed-up originals from `<ts>.bak/<vault-relative-path>`.
//   - Remove vars this import added (`preexisting=false`); preserve those
//     flagged `preexisting=true` (they predated the import).
//   - Trash the transaction record itself + its bak directory so the
//     **next** undo doesn't replay this one.
//
// One-step undo only — older imports require manual revert from the same
// record format (the spec is explicit on this).

export interface UndoResult {
  status: "ok" | "no-history";
  /** Vault-relative path of the transaction record that was reversed (when ok). */
  transactionPath?: string;
  /** Modules trashed from their landed paths. */
  modulesReverted: string[];
  /** Backed-up originals restored to their pre-import state. */
  originalsRestored: string[];
  /** Vars removed (only those with `preexisting=false` in the tx record). */
  varsRemoved: Array<{ name: string; scopeKind: "global" | "project"; projectSlug?: string }>;
  /** Vars left alone because they predated the import (`preexisting=true`). */
  varsPreserved: Array<{ name: string; scopeKind: "global" | "project"; projectSlug?: string }>;
}

/**
 * Run the undo. Idempotent in the "no history" branch; on a healthy run, the
 * transaction record is trashed at the end so a second undo is a no-op.
 */
export async function undoLastImport(
  app: App,
  settings: OpSettings,
  saveSettings: () => Promise<void>,
): Promise<UndoResult> {
  const latest = await findLatestTransaction(app);
  if (!latest) {
    return {
      status: "no-history",
      modulesReverted: [],
      originalsRestored: [],
      varsRemoved: [],
      varsPreserved: [],
    };
  }
  const { file, record } = latest;

  // 1. Trash imported module files at their landed paths.
  const modulesReverted: string[] = [];
  for (const m of record.modulesLanded) {
    const target = app.vault.getAbstractFileByPath(normalizePath(m.targetPath));
    if (target instanceof TFile) {
      await app.vault.trash(target, true); // system trash
      modulesReverted.push(m.targetPath);
    }
  }

  // 2. Restore originals from the backup directory.
  const originalsRestored: string[] = [];
  for (const m of record.modulesLanded) {
    if (!m.overwrote || !m.backupPath) continue;
    const backup = app.vault.getAbstractFileByPath(normalizePath(m.backupPath));
    if (!(backup instanceof TFile)) continue;
    const restoredContent = await app.vault.read(backup);
    const targetPath = normalizePath(m.targetPath);
    // Re-create folders if the trash above (or earlier work) removed them.
    const dir = targetPath.slice(0, targetPath.lastIndexOf("/"));
    await ensureFolderRecursive(app, dir);
    const existing = app.vault.getAbstractFileByPath(targetPath);
    if (existing instanceof TFile) {
      await app.vault.modify(existing, restoredContent);
    } else {
      await app.vault.create(targetPath, restoredContent);
    }
    originalsRestored.push(m.targetPath);
  }

  // 3. Roll back vars. Only `preexisting=false` rows.
  const varsRemoved: UndoResult["varsRemoved"] = [];
  const varsPreserved: UndoResult["varsPreserved"] = [];
  for (const v of record.varsWritten) {
    if (v.preexisting) {
      const entry = { name: v.name, scopeKind: v.scopeKind } as UndoResult["varsPreserved"][number];
      if (v.projectSlug) entry.projectSlug = v.projectSlug;
      varsPreserved.push(entry);
      continue;
    }
    if (v.scopeKind === "global") {
      delete settings.workflowVars[v.name];
      varsRemoved.push({ name: v.name, scopeKind: "global" });
      continue;
    }
    // project scope
    if (!v.projectSlug) continue;
    const statusPath = normalizePath(
      statusPathFor(v.projectSlug, currentProjectsRoot(app)),
    );
    const statusFile = app.vault.getAbstractFileByPath(statusPath);
    if (!(statusFile instanceof TFile)) continue;
    await app.fileManager.processFrontMatter(
      statusFile,
      (fm: Record<string, unknown>) => {
        const existing = fm.vars;
        if (!existing || typeof existing !== "object" || Array.isArray(existing)) return;
        const map = { ...(existing as Record<string, unknown>) };
        delete map[v.name];
        if (Object.keys(map).length === 0) {
          delete fm.vars;
        } else {
          fm.vars = map;
        }
      },
    );
    varsRemoved.push({ name: v.name, scopeKind: "project", projectSlug: v.projectSlug });
  }
  await saveSettings();

  // 4. Trash the transaction record + its bak directory so undo is one-step.
  await app.vault.trash(file, true);
  const bakDirPath = file.path.replace(/\.json$/, ".bak");
  const bakDir = app.vault.getAbstractFileByPath(normalizePath(bakDirPath));
  if (bakDir && !(bakDir instanceof TFile)) {
    // TFolder
    await app.vault.trash(bakDir as TFolder, true);
  }

  return {
    status: "ok",
    transactionPath: file.path,
    modulesReverted,
    originalsRestored,
    varsRemoved,
    varsPreserved,
  };
}

/**
 * Find the latest transaction record by filename (which sorts naturally
 * because `transactionFilename` is `YYYYMMDD-HHmmss`). Falls back to mtime
 * for a stable secondary key.
 */
async function findLatestTransaction(
  app: App,
): Promise<{ file: TFile; record: TransactionRecord } | null> {
  const dir = app.vault.getAbstractFileByPath(
    normalizePath(importHistoryDirPath(currentProjectsRoot(app))),
  );
  if (!dir || dir instanceof TFile) return null;
  // TFolder duck-typed (`children` array).
  const children = (dir as { children?: Array<unknown> }).children ?? [];
  const candidates: TFile[] = children.filter(
    (c): c is TFile => c instanceof TFile && c.path.endsWith(".json"),
  );
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.path.localeCompare(a.path));
  for (const candidate of candidates) {
    const raw = await app.vault.read(candidate);
    const result = parseTransaction(raw);
    if (result.record) return { file: candidate, record: result.record };
    // Skip corrupted records — try the next-most-recent one. We don't throw
    // because a stray file in the history dir shouldn't permanently block
    // undo for legitimate later imports.
  }
  return null;
}

async function ensureFolderRecursive(app: App, path: string): Promise<void> {
  if (!path) return;
  const norm = normalizePath(path);
  const parts = norm.split("/");
  let cumulative = "";
  for (const part of parts) {
    if (!part) continue;
    cumulative = cumulative ? `${cumulative}/${part}` : part;
    if (!app.vault.getAbstractFileByPath(cumulative)) {
      await app.vault.createFolder(cumulative);
    }
  }
}
