// Pure helpers for the op-audit JSONL writer. Splitting the encode + rotation
// logic from the obsidian-bound writer (`auditLog.ts`) keeps it vitest-friendly
// and lets the bypass detector reuse the same encoding path.

export const AUDIT_LOG_PATH = "Projects/_scratch/op-audit.jsonl";
export const AUDIT_ROTATE_BYTES = 10 * 1024 * 1024; // 10 MB
export const AUDIT_MAX_BACKUPS = 5;

export interface AuditEntry {
  // ISO 8601 UTC timestamp (milliseconds precision).
  ts: string;
  // op-* command name, or "bypass" for unattributed Projects/**/*.md writes.
  cmd: string;
  // Issue id when the call targets one. Optional for project-level commands.
  issue?: string;
  // Project slug when the call targets one (scaffold/doc-create).
  project?: string;
  // Vault-relative paths the call wrote to. Empty array when the write was a
  // no-op (e.g. op-append-commit when the sha is already present).
  paths?: string[];
  // Section name for body-section writes (Plan/Notes/Summary/Tasks/etc.).
  section?: string;
  // Byte-size delta of the primary written file. Optional — handlers that
  // can't cheaply compute it omit it rather than guessing.
  before_size?: number;
  after_size?: number;
  // Set on bypass detection lines.
  bypass?: true;
  // Free-form one-liner. Used by handlers to surface non-fatal warnings into
  // the audit trail (e.g. "github_close_failed").
  note?: string;
}

/**
 * Encode an audit entry as a single JSONL line. `ts` is set by the caller —
 * usually `new Date().toISOString()`. Callers must NOT include trailing
 * newline; the encoder appends it. Always emits a trailing `\n` so concatenated
 * appends form a valid JSONL stream.
 *
 * Field order is alphabetical for stability (greppable diffs in the seed
 * harness assertions).
 */
export function encodeAuditLine(entry: AuditEntry): string {
  const ordered: Record<string, unknown> = {};
  for (const key of Object.keys(entry).sort()) {
    const v = (entry as Record<string, unknown>)[key];
    if (v === undefined) continue;
    ordered[key] = v;
  }
  return JSON.stringify(ordered) + "\n";
}

/**
 * Decide whether the log should rotate before appending `lineLen` bytes,
 * given the current file size. Pure so callers can test the threshold without
 * touching the vault.
 */
export function shouldRotate(currentSize: number, lineLen: number): boolean {
  return currentSize + lineLen > AUDIT_ROTATE_BYTES;
}

/**
 * Compute the rotation rename plan. Returns an ordered list of `[from, to]`
 * pairs the writer must execute (in order). The current `op-audit.jsonl` is
 * always renamed to `op-audit-1.jsonl`; existing backups bubble up by one
 * (cap = AUDIT_MAX_BACKUPS — anything past N is dropped by the writer).
 *
 * Returned paths are vault-relative; caller adapts to its FS API.
 */
export function rotationPlan(
  basePath: string = AUDIT_LOG_PATH,
  maxBackups: number = AUDIT_MAX_BACKUPS,
): Array<[string, string]> {
  const stem = basePath.replace(/\.jsonl$/, "");
  const plan: Array<[string, string]> = [];
  for (let i = maxBackups - 1; i >= 1; i--) {
    plan.push([`${stem}-${i}.jsonl`, `${stem}-${i + 1}.jsonl`]);
  }
  plan.push([basePath, `${stem}-1.jsonl`]);
  return plan;
}
