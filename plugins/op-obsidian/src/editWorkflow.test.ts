import { describe, it, expect } from "vitest";
import { buildEditWorkflowPrompt } from "./editWorkflowPure";

describe("buildEditWorkflowPrompt", () => {
  const base = {
    slug: "my-project",
    workflowPath: "Projects/my-project/WORKFLOW.md",
    repoPath: "/Users/me/Projects/my-project",
    vaultBasePath: "/Users/me/work/Vault",
  };

  it("includes the modern schema reference (type: workflow, schema: 1, list-or-keyed-map model)", () => {
    const out = buildEditWorkflowPrompt({ ...base, existingContent: null });
    expect(out).toContain("## Workflow schema reference");
    expect(out).toContain("type: workflow");
    expect(out).toContain("schema: 1");
    expect(out).toContain("default_agent");
    expect(out).toContain("default_model");
    expect(out).toContain("per-agent keyed map");
    expect(out).toContain("op: switch workflow model: to per-agent map");
  });

  it("includes the project slug, workflow path, and working dir in the header", () => {
    const out = buildEditWorkflowPrompt({ ...base, existingContent: null });
    expect(out).toContain("Project: my-project");
    expect(out).toContain("Workflow path: Projects/my-project/WORKFLOW.md");
    expect(out).toContain("Working dir: /Users/me/Projects/my-project");
  });

  it("renders the absolute workflow path when vaultBasePath is given", () => {
    const out = buildEditWorkflowPrompt({ ...base, existingContent: null });
    expect(out).toContain(
      "Workflow absolute path: /Users/me/work/Vault/Projects/my-project/WORKFLOW.md",
    );
  });

  it("flags the no-WORKFLOW case so the agent knows to author from scratch", () => {
    const out = buildEditWorkflowPrompt({ ...base, existingContent: null });
    expect(out).toContain("no WORKFLOW.md yet");
    expect(out).not.toContain("## Current WORKFLOW.md");
  });

  it("inlines the existing WORKFLOW.md content when present", () => {
    const out = buildEditWorkflowPrompt({
      ...base,
      existingContent: "Branching: feature → main via PR.\nVersion: bump per issue.",
    });
    expect(out).toContain("WORKFLOW.md exists — refine in place");
    expect(out).toContain("## Current WORKFLOW.md");
    expect(out).toContain("Branching: feature → main via PR.");
  });

  it("omits the Current WORKFLOW.md section when existingContent is empty whitespace", () => {
    const out = buildEditWorkflowPrompt({
      ...base,
      existingContent: "   \n\n",
    });
    expect(out).not.toContain("## Current WORKFLOW.md");
  });

  it("includes the interview instructions block", () => {
    const out = buildEditWorkflowPrompt({ ...base, existingContent: null });
    expect(out).toContain("## What to do");
    expect(out).toMatch(/Interview the user/);
    expect(out).toMatch(/branching/i);
  });

  it("makes clear no other op-* mutations are allowed in this session", () => {
    const out = buildEditWorkflowPrompt({ ...base, existingContent: null });
    expect(out).toMatch(/op-work|op-resolve|op-set-scope/);
    expect(out).toMatch(/Do NOT/);
  });
});
