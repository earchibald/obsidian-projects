import { describe, it, expect } from "vitest";
import {
  ensureManagedFolderShape,
  shouldRunMigration,
} from "./migrateAddManagedFlag";

describe("ensureManagedFolderShape", () => {
  it("matches ISSUES/RESOLVED ISSUES/TASKS", () => {
    expect(ensureManagedFolderShape("Projects/foo/ISSUES/X-1.md")).toBe(true);
    expect(
      ensureManagedFolderShape("Projects/foo/RESOLVED ISSUES/X-1.md"),
    ).toBe(true);
    expect(ensureManagedFolderShape("Projects/foo/TASKS/X-1.1 t.md")).toBe(true);
  });
  it("rejects out-of-scope paths", () => {
    expect(ensureManagedFolderShape("Projects/foo/STATUS.md")).toBe(false);
    expect(ensureManagedFolderShape("Projects/foo/foo.base")).toBe(false);
    expect(ensureManagedFolderShape("Projects/foo/DOCS/x.md")).toBe(false);
    expect(ensureManagedFolderShape("Projects/_scratch/x.md")).toBe(false);
    expect(ensureManagedFolderShape("Projects/All Projects.md")).toBe(false);
  });
});

describe("shouldRunMigration", () => {
  it("runs when last-migrated is unset", () => {
    expect(shouldRunMigration("0.88.0", undefined)).toBe(true);
  });
  it("runs on version mismatch", () => {
    expect(shouldRunMigration("0.88.0", "0.87.0")).toBe(true);
  });
  it("skips on exact match", () => {
    expect(shouldRunMigration("0.88.0", "0.88.0")).toBe(false);
  });
  it("never runs with empty current version", () => {
    expect(shouldRunMigration("", "0.87.0")).toBe(false);
  });
});
