import { App, TFile } from "obsidian";

export interface MigrateAddManagedFlagResult {
  scanned: number;
  patched: number;
  alreadyFlagged: number;
  skipped: number;
  patchedPaths: string[];
}

const MANAGED_FOLDERS = /^Projects\/[^/]+\/(ISSUES|RESOLVED ISSUES|TASKS)\//;

/**
 * Idempotent sweep: add `op_managed: true` to the frontmatter of every
 * `*.md` under `Projects/<slug>/{ISSUES,RESOLVED ISSUES,TASKS}/` that isn't
 * already flagged. Used as a one-shot migration on first plugin startup
 * after upgrading to a build that introduces the discipline.
 *
 * STATUS.md, .base files, aggregate views (`Projects/All Projects.md`,
 * `Projects/all-projects.base`), and `_scratch/` are explicitly out of scope —
 * they're either not agent-edited or read-only by convention.
 */
export async function migrateAddManagedFlag(
  app: App,
): Promise<MigrateAddManagedFlagResult> {
  const result: MigrateAddManagedFlagResult = {
    scanned: 0,
    patched: 0,
    alreadyFlagged: 0,
    skipped: 0,
    patchedPaths: [],
  };
  const files = app.vault.getMarkdownFiles();
  for (const file of files) {
    if (!MANAGED_FOLDERS.test(file.path)) {
      continue;
    }
    result.scanned += 1;
    try {
      let alreadyFlagged = false;
      await app.fileManager.processFrontMatter(file, (fm) => {
        if (fm.op_managed === true) {
          alreadyFlagged = true;
          return;
        }
        fm.op_managed = true;
      });
      if (alreadyFlagged) {
        result.alreadyFlagged += 1;
      } else {
        result.patched += 1;
        result.patchedPaths.push(file.path);
      }
    } catch (err) {
      console.error("[op-obsidian] migrateAddManagedFlag failed for", file.path, err);
      result.skipped += 1;
    }
  }
  return result;
}

/**
 * Return true when {@link migrateAddManagedFlag} has not yet been run for the
 * current plugin version. Comparison is exact-string — any version bump
 * triggers a re-run, which is fine because the migration is idempotent.
 */
export function shouldRunMigration(
  currentVersion: string,
  lastMigratedVersion: string | undefined,
): boolean {
  if (!currentVersion) return false;
  return lastMigratedVersion !== currentVersion;
}

export function ensureManagedFolderShape(p: string): boolean {
  return MANAGED_FOLDERS.test(p);
}

// Re-exported for tests.
export { MANAGED_FOLDERS };
