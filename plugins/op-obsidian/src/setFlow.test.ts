import { describe, it, expect, vi } from "vitest";

const { FakeTFile } = vi.hoisted(() => {
  class FakeTFile {
    path: string;
    constructor(path: string) {
      this.path = path;
    }
  }
  return { FakeTFile };
});

vi.mock("obsidian", () => ({ TFile: FakeTFile }));

import { setFlow, validateFlow, validateComplexity } from "./setFlow";
import type { IssueEntry } from "./types";

function makeApp(initial: Record<string, unknown>) {
  const path = "Projects/x/ISSUES/OP-1 t.md";
  const file = new FakeTFile(path);
  const fm: Record<string, unknown> = { ...initial };
  return {
    fm,
    app: {
      vault: {
        getAbstractFileByPath: (p: string) => (p === path ? file : null),
      },
      fileManager: {
        processFrontMatter: async (
          _f: unknown,
          cb: (fm: Record<string, unknown>) => void,
        ) => {
          cb(fm);
        },
      },
    } as any,
  };
}

function issue(): IssueEntry {
  return {
    path: "Projects/x/ISSUES/OP-1 t.md",
    type: "issue",
    id: "OP-1",
    project: "x",
    status: "open",
    title: "t",
    resolvedFolder: false,
  };
}

describe("setFlow", () => {
  it("writes flow and complexity to frontmatter", async () => {
    const { app, fm } = makeApp({});
    const res = await setFlow(app, issue(), { flow: "planning", complexity: "complex" });
    expect(fm.flow).toBe("planning");
    expect(fm.complexity).toBe("complex");
    expect(res).toMatchObject({
      issueId: "OP-1",
      flow: "planning",
      complexity: "complex",
    });
  });

  it("leaves untouched keys alone (no-op when key absent from input)", async () => {
    const { app, fm } = makeApp({ flow: "evaluate", complexity: "simple" });
    await setFlow(app, issue(), { flow: "planning" });
    expect(fm.flow).toBe("planning");
    expect(fm.complexity).toBe("simple");
  });

  it("accepts complexity without flow", async () => {
    const { app, fm } = makeApp({ flow: "evaluate" });
    await setFlow(app, issue(), { complexity: "complex" });
    expect(fm.flow).toBe("evaluate");
    expect(fm.complexity).toBe("complex");
  });

  it("clears a field when passed null", async () => {
    const { app, fm } = makeApp({ flow: "evaluate", complexity: "simple" });
    await setFlow(app, issue(), { flow: null });
    expect("flow" in fm).toBe(false);
    expect(fm.complexity).toBe("simple");
  });

  it("throws when neither flow nor complexity provided", async () => {
    const { app } = makeApp({});
    await expect(setFlow(app, issue(), {})).rejects.toThrow(/at least one of flow or complexity/);
  });

  it("accepts free-form flow values (post-OP-188 workflow walker enforces)", async () => {
    const { app, fm } = makeApp({});
    // Custom step id from a user-authored workflow file. Pre-OP-188 this
    // would have thrown; post-OP-188 the orchestrator's workflow-file walker
    // is what decides whether the step is valid for the project.
    await setFlow(app, issue(), { flow: "kickoff" });
    expect(fm.flow).toBe("kickoff");
  });
  it("rejects whitespace-only flow values", async () => {
    const { app } = makeApp({});
    await expect(setFlow(app, issue(), { flow: "   " })).rejects.toThrow(/Invalid flow/);
  });

  it("rejects flow values containing embedded newlines", async () => {
    const { app } = makeApp({});
    // OP-188 security: a URI-encoded newline (%0A) in a flow parameter must
    // not reach frontmatter — it can't match any workflow step id and could
    // produce multi-line YAML strings on round-trip.
    await expect(setFlow(app, issue(), { flow: "plan\nevil_key: value" })).rejects.toThrow(
      /newlines/,
    );
    await expect(setFlow(app, issue(), { flow: "plan\revil" })).rejects.toThrow(/newlines/);
  });

  it("rejects invalid complexity values", async () => {
    const { app } = makeApp({});
    await expect(
      setFlow(app, issue(), { complexity: "gnarly" as any }),
    ).rejects.toThrow(/Invalid complexity/);
  });

  it("throws when issue file not found", async () => {
    const { app } = makeApp({});
    const missing = { ...issue(), path: "does-not-exist.md" };
    await expect(setFlow(app, missing, { flow: "done" })).rejects.toThrow(/not found on disk/);
  });
});

describe("validation helpers", () => {
  it("accepts both legacy and canonical flow step ids and any user-defined id", () => {
    // OP-188: the validator is intentionally lax — it only enforces non-empty
    // trim. Both legacy enum values (`planning`, `implementation`,
    // `finalization`) and canonical ids (`plan`, `implement`, `finalize`) and
    // user-defined ids (e.g. `kickoff`, `lint-pass`) all pass. The workflow
    // walker is the actual semantic gate.
    for (const v of [
      "evaluate",
      "planning",
      "plan",
      "implementation",
      "implement",
      "review",
      "finalization",
      "finalize",
      "done",
      "kickoff",
      "lint-pass",
    ]) {
      expect(() => validateFlow(v)).not.toThrow();
    }
    expect(() => validateFlow("")).toThrow();
    expect(() => validateFlow("   ")).toThrow();
    expect(() => validateFlow("plan\nevil")).toThrow(/newlines/);
    expect(() => validateFlow("plan\revil")).toThrow(/newlines/);
  });

  it("accepts every schema complexity value", () => {
    for (const v of ["simple", "complex"]) {
      expect(() => validateComplexity(v)).not.toThrow();
    }
    expect(() => validateComplexity("epic")).toThrow();
  });
});
