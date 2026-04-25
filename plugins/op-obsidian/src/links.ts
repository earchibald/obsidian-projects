import { App, TFile } from "obsidian";
import type { IssueStore } from "./issueStore";
import type { IssueEntry } from "./types";
import {
  computeApply,
  computeMigrate,
  computeRemove,
  getRelation,
  scanDrift,
  validateLinkArgs,
  type Cleanup,
  type DriftEntry,
  type RelationName,
  RELATIONS,
  RELATION_NAMES,
} from "./relations";

// Obsidian-bound glue for the two-way linking verbs. Each public function
// resolves the issue ids via the IssueStore (covers ISSUES/ + RESOLVED ISSUES/
// uniformly), reads frontmatter snapshots from the metadata cache, hands off
// to the pure functions in `relations.ts`, then applies the resulting delta
// via `app.fileManager.processFrontMatter` (per-file serialization, same
// path as the rest of the plugin's frontmatter writes).
//
// Concurrency: a single applyLink call awaits each side's processFrontMatter
// sequentially, so a competing call on either file blocks naturally on the
// per-file lock obsidian provides. No new locking is introduced here.

export interface LinkArgs {
  srcId: string;
  dstId: string;
  relation: string;
}

export interface ApplyLinkResult {
  ok: true;
  command: "op-set-link" | "op-remove-link";
  srcId: string;
  dstId: string;
  relation: RelationName;
  srcPath: string;
  dstPath: string;
  changed: boolean;
  /** Issue ids whose inverse list was trimmed because of a many-to-one reparent. */
  cleaned: string[];
}

export async function applyLink(
  app: App,
  store: IssueStore,
  args: LinkArgs,
): Promise<ApplyLinkResult> {
  const { srcId, dstId, relation } = validateLinkArgs(args);
  const srcEntry = resolveOrThrow(store, srcId);
  const dstEntry = resolveOrThrow(store, dstId);
  const srcFile = requireFile(app, srcEntry.path);
  const dstFile = requireFile(app, dstEntry.path);

  const srcFmSnap = readFm(app, srcFile);
  const dstFmSnap = readFm(app, dstFile);
  const planned = computeApply({
    srcFm: srcFmSnap,
    dstFm: dstFmSnap,
    srcId,
    dstId,
    relation: relation.name,
  });

  // Apply src/dst writes even when changed=false but cleanups exist (won't
  // happen in practice for a fresh apply, but treat the two flags
  // independently so future relations don't trip on it).
  if (planned.changed) {
    await writeFmDelta(app, srcFile, srcFmSnap, planned.srcFmNext);
    await writeFmDelta(app, dstFile, dstFmSnap, planned.dstFmNext);
  }

  const cleaned: string[] = [];
  for (const c of planned.cleanups) {
    const ok = await applyCleanup(app, store, c);
    if (ok) cleaned.push(c.holderId);
  }

  return {
    ok: true,
    command: "op-set-link",
    srcId,
    dstId,
    relation: relation.name,
    srcPath: srcEntry.path,
    dstPath: dstEntry.path,
    changed: planned.changed || cleaned.length > 0,
    cleaned,
  };
}

export async function removeLink(
  app: App,
  store: IssueStore,
  args: LinkArgs,
): Promise<ApplyLinkResult> {
  const { srcId, dstId, relation } = validateLinkArgs(args);
  const srcEntry = resolveOrThrow(store, srcId);
  const dstEntry = resolveOrThrow(store, dstId);
  const srcFile = requireFile(app, srcEntry.path);
  const dstFile = requireFile(app, dstEntry.path);

  const srcFmSnap = readFm(app, srcFile);
  const dstFmSnap = readFm(app, dstFile);
  const planned = computeRemove({
    srcFm: srcFmSnap,
    dstFm: dstFmSnap,
    srcId,
    dstId,
    relation: relation.name,
  });

  if (planned.changed) {
    await writeFmDelta(app, srcFile, srcFmSnap, planned.srcFmNext);
    await writeFmDelta(app, dstFile, dstFmSnap, planned.dstFmNext);
  }

  return {
    ok: true,
    command: "op-remove-link",
    srcId,
    dstId,
    relation: relation.name,
    srcPath: srcEntry.path,
    dstPath: dstEntry.path,
    changed: planned.changed,
    cleaned: [],
  };
}

/**
 * Enumerate the issues currently linked from `srcId` under `relation`. Returns
 * resolved IssueEntry rows so callers can present them in a picker; ids that
 * point at a missing/unresolved file are dropped silently (link drift is the
 * `op-link-check` command's job, not this picker's). Used by the `op-remove-link`
 * palette flow to constrain the target picker.
 */
export function listLinkedTargets(
  app: App,
  store: IssueStore,
  srcId: string,
  relation: string,
): IssueEntry[] {
  const def = getRelation(relation);
  const srcEntry = store.byId(srcId);
  if (!srcEntry || srcEntry.type !== "issue") return [];
  const file = app.vault.getAbstractFileByPath(srcEntry.path);
  if (!(file instanceof TFile)) return [];
  const fm = readFm(app, file);
  const ids: string[] = [];
  if (def.isList) {
    const v = fm[def.name];
    if (Array.isArray(v)) {
      for (const x of v) {
        if (typeof x === "string" && x.length > 0) ids.push(x);
      }
    }
  } else {
    const v = fm[def.name];
    if (typeof v === "string" && v.length > 0) ids.push(v);
  }
  const out: IssueEntry[] = [];
  for (const id of ids) {
    const entry = store.byId(id);
    if (entry && entry.type === "issue") out.push(entry);
  }
  return out;
}

export interface LinkCheckResult {
  ok: true;
  command: "op-link-check";
  scanned: number;
  drift: DriftEntry[];
  /** Drift entries that were repaired (only populated when repair=true). */
  repaired: DriftEntry[];
  /** Drift entries that could not be repaired (e.g. dangling-target). */
  unrepaired: DriftEntry[];
}

export async function linkCheck(
  app: App,
  store: IssueStore,
  opts: { repair?: boolean } = {},
): Promise<LinkCheckResult> {
  const issues = store.issues();
  const snapshot = new Map<string, Record<string, unknown>>();
  for (const e of issues) {
    const file = app.vault.getAbstractFileByPath(e.path);
    if (file instanceof TFile) {
      snapshot.set(e.id, readFm(app, file));
    }
  }

  const drift = scanDrift(snapshot);

  if (!opts.repair || drift.length === 0) {
    return {
      ok: true,
      command: "op-link-check",
      scanned: issues.length,
      drift,
      repaired: [],
      unrepaired: drift.filter((d) => d.problem === "dangling-target"),
    };
  }

  const repaired: DriftEntry[] = [];
  const unrepaired: DriftEntry[] = [];
  // Re-scan after each repair: applyLink only touches two files, so an O(n^2)
  // worst case is bounded by the drift count, not the issue count. In the
  // overwhelming common case repair count is tiny.
  for (const d of drift) {
    if (d.problem === "dangling-target") {
      unrepaired.push(d);
      continue;
    }
    try {
      await applyLink(app, store, {
        srcId: d.issueId,
        dstId: d.target,
        relation: d.relation,
      });
      repaired.push(d);
    } catch (err) {
      console.warn("[op-obsidian] link-check repair failed", d, err);
      unrepaired.push(d);
    }
  }

  return {
    ok: true,
    command: "op-link-check",
    scanned: issues.length,
    drift,
    repaired,
    unrepaired,
  };
}

export interface MigrateLinksResult {
  ok: true;
  command: "op-migrate-links";
  scanned: number;
  rewrites: Array<{ issueId: string; path: string; diff: string[] }>;
}

export async function migrateLinks(
  app: App,
  store: IssueStore,
): Promise<MigrateLinksResult> {
  const issues = store.issues();
  const rewrites: MigrateLinksResult["rewrites"] = [];
  for (const e of issues) {
    const file = app.vault.getAbstractFileByPath(e.path);
    if (!(file instanceof TFile)) continue;
    const fm = readFm(app, file);
    const result = computeMigrate(fm);
    if (!result.changed) continue;

    await app.fileManager.processFrontMatter(file, (live) => {
      if ("parent_issue" in live) delete live.parent_issue;
      if ("subissues" in live) delete live.subissues;
      if ("parent" in result.fmNext) live.parent = result.fmNext.parent;
      if ("children" in result.fmNext) live.children = result.fmNext.children;
    });
    rewrites.push({ issueId: e.id, path: e.path, diff: result.diff });
  }

  return { ok: true, command: "op-migrate-links", scanned: issues.length, rewrites };
}

// ---------- internal helpers ----------

function resolveOrThrow(store: IssueStore, id: string): IssueEntry {
  const entry = store.byId(id);
  if (!entry) {
    throw new Error(
      `Issue not found: ${id}. Both ISSUES/ and RESOLVED ISSUES/ are searched — check the id.`,
    );
  }
  if (entry.type !== "issue") {
    throw new Error(`Expected issue, got ${entry.type}: ${id}`);
  }
  return entry;
}

function requireFile(app: App, path: string): TFile {
  const f = app.vault.getAbstractFileByPath(path);
  if (!(f instanceof TFile)) throw new Error(`Issue file not found on disk: ${path}`);
  return f;
}

function readFm(app: App, file: TFile): Record<string, unknown> {
  const fm = app.metadataCache.getFileCache(file)?.frontmatter;
  return fm ? { ...fm } : {};
}

/**
 * Apply the difference between `before` and `after` to the live fm under
 * `processFrontMatter`. Only the keys that actually differ are touched; keys
 * present in `before` but missing from `after` are deleted.
 */
async function writeFmDelta(
  app: App,
  file: TFile,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): Promise<void> {
  const setKeys: string[] = [];
  const deleteKeys: string[] = [];
  for (const k of Object.keys(after)) {
    if (!fmValueEquals(before[k], after[k])) setKeys.push(k);
  }
  for (const k of Object.keys(before)) {
    if (!(k in after)) deleteKeys.push(k);
  }
  if (setKeys.length === 0 && deleteKeys.length === 0) return;
  await app.fileManager.processFrontMatter(file, (live) => {
    for (const k of setKeys) live[k] = after[k];
    for (const k of deleteKeys) delete live[k];
  });
}

async function applyCleanup(
  app: App,
  store: IssueStore,
  c: Cleanup,
): Promise<boolean> {
  const entry = store.byId(c.holderId);
  if (!entry || entry.type !== "issue") {
    console.warn("[op-obsidian] applyCleanup: holder not found", c);
    return false;
  }
  const file = app.vault.getAbstractFileByPath(entry.path);
  if (!(file instanceof TFile)) return false;
  let didChange = false;
  await app.fileManager.processFrontMatter(file, (fm) => {
    const v = fm[c.field];
    if (!Array.isArray(v)) return;
    const next = v.filter(
      (x: unknown) => !(typeof x === "string" && x === c.remove),
    );
    if (next.length === v.length) return;
    if (next.length === 0) {
      delete fm[c.field];
    } else {
      fm[c.field] = next;
    }
    didChange = true;
  });
  return didChange;
}

function fmValueEquals(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }
  return false;
}

export { RELATIONS, RELATION_NAMES };
export type { RelationName } from "./relations";
