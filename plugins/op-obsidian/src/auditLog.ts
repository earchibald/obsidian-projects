import { App, normalizePath } from "obsidian";
import {
  AUDIT_LOG_PATH,
  AUDIT_MAX_BACKUPS,
  encodeAuditLine,
  rotationPlan,
  shouldRotate,
  type AuditEntry,
} from "./auditLogPure";
import { currentProjectsRoot, scratchFilePath } from "./projectPaths";

export type AuditEntryInput = Omit<AuditEntry, "ts"> & { ts?: string };

/**
 * Append one JSONL line to `Projects/_scratch/op-audit.jsonl`. Rotates the
 * file at 10 MB (cascade up to `op-audit-5.jsonl`, then drop). Best-effort:
 * failures are logged to console but do NOT propagate to the caller — the
 * audit trail is a side-effect on the success path of mutating op-* commands,
 * never the source of truth.
 *
 * The plugin populates `inFlightOpWritePaths` on `main.ts` before each
 * mutation and clears it after; this writer is unaware of that — it just
 * writes the line.
 */
export async function appendAuditLine(app: App, input: AuditEntryInput): Promise<void> {
  try {
    const entry: AuditEntry = { ts: input.ts ?? new Date().toISOString(), ...input };
    const line = encodeAuditLine(entry);

    const adapter = app.vault.adapter;
    const path = normalizePath(
      scratchFilePath("op-audit.jsonl", currentProjectsRoot(app)),
    );
    const folder = path.split("/").slice(0, -1).join("/");
    if (folder && !(await adapter.exists(folder))) {
      await adapter.mkdir(folder);
    }

    let currentSize = 0;
    if (await adapter.exists(path)) {
      const stat = await adapter.stat(path);
      currentSize = stat?.size ?? 0;
    }

    if (shouldRotate(currentSize, line.length)) {
      await rotate(adapter, path);
    }

    if (await adapter.exists(path)) {
      const prior = await adapter.read(path);
      await adapter.write(path, prior + line);
    } else {
      await adapter.write(path, line);
    }
  } catch (err) {
    console.error("[op-obsidian] audit append failed", err);
  }
}

interface VaultAdapterLike {
  exists(p: string): Promise<boolean>;
  read(p: string): Promise<string>;
  write(p: string, s: string): Promise<void>;
  rename(from: string, to: string): Promise<void>;
  remove(p: string): Promise<void>;
  mkdir(p: string): Promise<void>;
  stat(p: string): Promise<{ size: number } | null>;
}

async function rotate(adapter: VaultAdapterLike, basePath: string): Promise<void> {
  const plan = rotationPlan(basePath, AUDIT_MAX_BACKUPS);
  // The oldest-numbered backup that's about to be overwritten by the cascade
  // gets dropped — drop it explicitly so the rename below doesn't fail on a
  // FS that refuses to overwrite.
  const oldest = `${basePath.replace(/\.jsonl$/, "")}-${AUDIT_MAX_BACKUPS}.jsonl`;
  if (await adapter.exists(oldest)) {
    try {
      await adapter.remove(oldest);
    } catch (err) {
      console.warn("[op-obsidian] audit rotate remove-oldest failed", err);
    }
  }
  for (const [from, to] of plan) {
    if (!(await adapter.exists(from))) continue;
    try {
      // Some Obsidian adapters refuse rename-over; remove dest first.
      if (await adapter.exists(to)) {
        await adapter.remove(to);
      }
      await adapter.rename(from, to);
    } catch (err) {
      console.warn("[op-obsidian] audit rotate rename failed", from, "->", to, err);
    }
  }
}
