import { describe, it, expect } from "vitest";
import { buildEditModulePrompt, modulePathFor } from "./editModulePure";

describe("modulePathFor", () => {
  it("emits the global path", () => {
    expect(modulePathFor({ scopeKind: "global", moduleId: "orient" })).toBe(
      "Projects/_op-modules/orient.md",
    );
  });

  it("emits the per-project path", () => {
    expect(
      modulePathFor({ scopeKind: "project", projectSlug: "demo", moduleId: "house" }),
    ).toBe("Projects/demo/MODULES/house.md");
  });

  it("throws on empty moduleId", () => {
    expect(() => modulePathFor({ scopeKind: "global", moduleId: "  " })).toThrow();
  });

  it("throws when project scope lacks a slug", () => {
    expect(() => modulePathFor({ scopeKind: "project", moduleId: "x" })).toThrow();
  });
});

describe("buildEditModulePrompt", () => {
  const baseGlobal = {
    moduleId: "orient",
    scopeKind: "global" as const,
    modulePath: "Projects/_op-modules/orient.md",
    repoPath: "/Users/me/Projects/demo",
    vaultBasePath: "/Users/me/Vault",
    hasFrontmatter: false,
  };

  it("includes module id, scope, and path in the header", () => {
    const out = buildEditModulePrompt({ ...baseGlobal, existingContent: null });
    expect(out).toContain("Module id: orient");
    expect(out).toContain("Module scope: global (vault-wide)");
    expect(out).toContain("Module path: Projects/_op-modules/orient.md");
    expect(out).toContain(
      "Module absolute path: /Users/me/Vault/Projects/_op-modules/orient.md",
    );
  });

  it("flags the no-file case so the agent knows to author from scratch", () => {
    const out = buildEditModulePrompt({ ...baseGlobal, existingContent: null });
    expect(out).toContain("no module file yet");
    expect(out).not.toContain("## Current module body");
  });

  it("inlines the existing module body when present", () => {
    const out = buildEditModulePrompt({
      ...baseGlobal,
      hasFrontmatter: true,
      existingContent: "# orient\n\nYou are the orient module.",
    });
    expect(out).toContain("module file exists — refine in place");
    expect(out).toContain("## Current module body");
    expect(out).toContain("You are the orient module.");
  });

  it("highlights missing frontmatter so the agent restores it", () => {
    const out = buildEditModulePrompt({
      ...baseGlobal,
      hasFrontmatter: false,
      existingContent: "# orient\n\nNo frontmatter yet.",
    });
    expect(out).toContain("missing frontmatter");
  });

  it("includes the module schema reference and OBJECT FORM nudge", () => {
    const out = buildEditModulePrompt({ ...baseGlobal, existingContent: null });
    expect(out).toContain("type: workflow-module");
    expect(out).toContain("OBJECT FORM");
  });

  it("renders the per-project scope label with the slug", () => {
    const out = buildEditModulePrompt({
      moduleId: "house",
      scopeKind: "project",
      projectSlug: "demo",
      modulePath: "Projects/demo/MODULES/house.md",
      repoPath: "/Users/me/Projects/demo",
      hasFrontmatter: false,
      existingContent: null,
    });
    expect(out).toContain("Module scope: per-project (demo)");
  });

  it("makes clear no other op-* mutations are allowed in this session", () => {
    const out = buildEditModulePrompt({ ...baseGlobal, existingContent: null });
    expect(out).toMatch(/op-work|op-resolve|op-set-scope/);
    expect(out).toMatch(/Do NOT/);
  });
});
