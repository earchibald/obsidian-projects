import { describe, it, expect } from "vitest";
import {
  applyBadModelPatch,
  revertLastWorkflowPatch,
  type VaultLike,
  type VaultFileLike,
} from "./recoveryPatchApply";

class FakeVault implements VaultLike {
  files = new Map<string, string>();
  trashed: string[] = [];

  setFile(path: string, data: string): VaultFileLike {
    this.files.set(path, data);
    return { path };
  }

  async read(file: VaultFileLike): Promise<string> {
    const v = this.files.get(file.path);
    if (v === undefined) throw new Error(`fake-vault: ENOENT ${file.path}`);
    return v;
  }

  async modify(file: VaultFileLike, data: string): Promise<void> {
    if (!this.files.has(file.path)) throw new Error(`fake-vault: ENOENT ${file.path}`);
    this.files.set(file.path, data);
  }

  async create(path: string, data: string): Promise<VaultFileLike> {
    if (this.files.has(path)) throw new Error(`fake-vault: EEXIST ${path}`);
    this.files.set(path, data);
    return { path };
  }

  async trash(file: VaultFileLike): Promise<void> {
    this.files.delete(file.path);
    this.trashed.push(file.path);
  }

  getFileByPath(path: string): VaultFileLike | null {
    return this.files.has(path) ? { path } : null;
  }

  listSiblingPaths(parentFolder: string): string[] {
    const prefix = parentFolder ? `${parentFolder}/` : "";
    return [...this.files.keys()].filter((p) => p.startsWith(prefix) && !p.slice(prefix.length).includes("/"));
  }
}

const FM = `---\ntype: workflow\nschema: 1\nproject: foo\ndefault_agent: claude\ndefault_model: opuss\n---\n# WORKFLOW\n`;
const W = "Projects/foo/WORKFLOW.md";

describe("applyBadModelPatch", () => {
  it("writes a .bak-<ts> then modifies the workflow file (in that order)", async () => {
    const vault = new FakeVault();
    vault.setFile(W, FM);
    const r = await applyBadModelPatch({
      vault,
      workflowFile: { path: W },
      raw: FM,
      badName: "opuss",
      replacement: "claude-opus-4-7",
      now: new Date(Date.UTC(2026, 3, 26, 12, 34, 56)),
    });
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    expect(r.backupPath).toBe(`${W}.bak-20260426-123456`);
    expect(vault.files.get(r.backupPath)).toBe(FM); // backup carries the ORIGINAL
    expect(vault.files.get(W)).toContain("default_model: claude-opus-4-7");
    expect(vault.files.get(W)).not.toContain("opuss");
  });

  it("returns skipped when the bad name is ambiguous (no .bak created)", async () => {
    const fm = `---\ndefault_model: opuss\nsteps:\n  - step: kickoff\n    model: opuss\n---\n`;
    const vault = new FakeVault();
    vault.setFile(W, fm);
    const r = await applyBadModelPatch({
      vault,
      workflowFile: { path: W },
      raw: fm,
      badName: "opuss",
      replacement: "claude-opus-4-7",
    });
    expect(r.status).toBe("skipped");
    if (r.status !== "skipped") return;
    expect(r.reason.status).toBe("ambiguous");
    // No backup should exist.
    expect([...vault.files.keys()].some((p) => p.includes(".bak-"))).toBe(false);
    // Workflow file should be untouched.
    expect(vault.files.get(W)).toBe(fm);
  });

  it("returns skipped when the bad name is not found in frontmatter", async () => {
    const fm = `---\ndefault_model: opus\n---\n`;
    const vault = new FakeVault();
    vault.setFile(W, fm);
    const r = await applyBadModelPatch({
      vault,
      workflowFile: { path: W },
      raw: fm,
      badName: "opuss",
      replacement: "claude-opus-4-7",
    });
    expect(r.status).toBe("skipped");
    if (r.status !== "skipped") return;
    expect(r.reason.status).toBe("not-found");
  });
});

describe("revertLastWorkflowPatch", () => {
  it("restores the file from the latest .bak-* and trashes the backup", async () => {
    const vault = new FakeVault();
    const original = "ORIGINAL\n";
    const patched = "PATCHED\n";
    const olderBak = `${W}.bak-20260101-000000`;
    const newerBak = `${W}.bak-20260426-123456`;
    vault.setFile(W, patched);
    vault.setFile(olderBak, "older content\n");
    vault.setFile(newerBak, original);

    const r = await revertLastWorkflowPatch({
      vault,
      workflowFile: { path: W },
    });
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    expect(r.restoredFromPath).toBe(newerBak);
    expect(vault.files.get(W)).toBe(original);
    // The newer .bak is gone, the older one stays.
    expect(vault.files.has(newerBak)).toBe(false);
    expect(vault.files.has(olderBak)).toBe(true);
    expect(vault.trashed).toEqual([newerBak]);
  });

  it("returns no-backup when the workflow has never been patched", async () => {
    const vault = new FakeVault();
    vault.setFile(W, "any content\n");
    const r = await revertLastWorkflowPatch({
      vault,
      workflowFile: { path: W },
    });
    expect(r.status).toBe("no-backup");
  });

  it("ignores .bak-* belonging to other workflow files", async () => {
    const vault = new FakeVault();
    vault.setFile(W, "current\n");
    vault.setFile("Projects/foo/OTHER.md.bak-20260426-000000", "decoy\n");
    const r = await revertLastWorkflowPatch({
      vault,
      workflowFile: { path: W },
    });
    expect(r.status).toBe("no-backup");
  });
});
