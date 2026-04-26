import { describe, it, expect } from "vitest";
import {
  extractVarReferences,
  formatExportFile,
  parseImportFile,
  parseTransaction,
  planImport,
  serializeTransaction,
  transactionFilename,
  type TransactionRecord,
} from "./exportImportPure";
import type { WorkflowModule } from "./workflowModulePure";

// All tests are pure: no Obsidian, no vault, no I/O. The `parseImportFile`
// suite injects a tiny YAML parser so we don't pull a real one in.

const SOURCE = { kind: "global" as const, path: "Projects/_op-modules/orient.md" };

function mod(over: Partial<WorkflowModule> = {}): WorkflowModule {
  return {
    id: "orient",
    title: "Orient",
    scope: "kickoff",
    project: undefined,
    agent: undefined,
    order: 0,
    vars: [],
    source: SOURCE,
    ...over,
  };
}

describe("formatExportFile", () => {
  it("emits required-only frontmatter for a minimal module", () => {
    const out = formatExportFile({ module: mod(), body: "Hello, world.\n" });
    expect(out).toBe(
      [
        "---",
        "id: orient",
        "title: Orient",
        "type: workflow-module",
        "scope: kickoff",
        "---",
        "",
        "Hello, world.",
        "",
      ].join("\n"),
    );
  });

  it("includes optional fields only when populated", () => {
    const out = formatExportFile({
      module: mod({ project: "demo", agent: "claude", order: 5 }),
      body: "Body.\n",
    });
    expect(out).toContain("project: demo");
    expect(out).toContain("agent: claude");
    expect(out).toContain("order: 5");
  });

  it("emits each VarDecl form in canonical YAML", () => {
    const out = formatExportFile({
      module: mod({
        vars: [
          { kind: "bare", name: "alpha" },
          { kind: "default", name: "beta", value: "two" },
          { kind: "default", name: "empty", value: "" },
          { kind: "object", name: "gamma", default: "three", description: "Tone" },
          { kind: "object", name: "delta" },
        ],
      }),
      body: "x",
    });
    expect(out).toContain("- alpha");
    expect(out).toContain("- beta=two");
    expect(out).toContain("- empty=");
    expect(out).toContain('- { name: gamma, default: three, description: Tone }');
    expect(out).toContain("- { name: delta }");
  });

  it("quotes title containing a colon", () => {
    const out = formatExportFile({
      module: mod({ title: "Edge: case" }),
      body: "x",
    });
    expect(out).toContain('title: "Edge: case"');
  });

  it("respects overrideProject (clear via null, set via string)", () => {
    const cleared = formatExportFile({
      module: mod({ project: "old-slug" }),
      body: "x",
      overrideProject: null,
    });
    expect(cleared).not.toContain("project:");

    const renamed = formatExportFile({
      module: mod({ project: "old-slug" }),
      body: "x",
      overrideProject: "new-slug",
    });
    expect(renamed).toContain("project: new-slug");
  });
});

describe("extractVarReferences", () => {
  it("returns distinct names in document order", () => {
    expect(
      extractVarReferences("Hello {{vars.tone}} and {{vars.lang}}—again {{vars.tone}}!"),
    ).toEqual(["tone", "lang"]);
  });

  it("tolerates whitespace inside the braces", () => {
    expect(extractVarReferences("see {{ vars.foo }}")).toEqual(["foo"]);
  });

  it("ignores plugin-var refs without the vars. prefix", () => {
    expect(extractVarReferences("ID is {{id}} but tone {{vars.tone}}")).toEqual(["tone"]);
  });

  it("returns empty list for an empty body", () => {
    expect(extractVarReferences("")).toEqual([]);
  });
});

describe("parseImportFile", () => {
  // A toy YAML parser that handles only what these tests need: scalar
  // key:value lines, type: workflow-module, and the small `vars:` shapes the
  // export bundles produce.
  function tinyYaml(block: string): Record<string, unknown> | null {
    const out: Record<string, unknown> = {};
    let i = 0;
    const lines = block.split("\n");
    while (i < lines.length) {
      const line = lines[i];
      if (!line || /^\s*#/.test(line)) {
        i++;
        continue;
      }
      const m = /^([A-Za-z_][A-Za-z0-9_-]*)\s*:\s*(.*)$/.exec(line);
      if (!m) {
        i++;
        continue;
      }
      const key = m[1];
      const rest = m[2];
      if (rest === "" && key === "vars") {
        const arr: unknown[] = [];
        i++;
        while (i < lines.length && /^\s*-\s+/.test(lines[i])) {
          const item = lines[i].replace(/^\s*-\s+/, "");
          if (item.startsWith("{")) {
            // toy object form: { name: foo, default: "bar", description: baz }
            const obj: Record<string, string> = {};
            const inner = item.replace(/^\{|\}$/g, "");
            for (const pair of inner.split(/,\s*/)) {
              const km = /^([A-Za-z_]+)\s*:\s*(.*)$/.exec(pair.trim());
              if (km) obj[km[1]] = unquote(km[2].trim());
            }
            arr.push(obj);
          } else {
            arr.push(item);
          }
          i++;
        }
        out[key] = arr;
        continue;
      }
      out[key] = unquote(rest);
      // YAML auto-coerce integers (matches obsidian metadataCache for `order:`)
      if (/^-?\d+$/.test(rest)) out[key] = Number(rest);
      i++;
    }
    return out;
  }
  function unquote(v: string): string {
    if (v.startsWith('"') && v.endsWith('"')) {
      return v.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
    }
    return v;
  }

  it("parses a freshly-formatted bundle round-trippably", () => {
    const original = mod({
      title: "Orient",
      vars: [
        { kind: "bare", name: "reviewer" },
        { kind: "default", name: "tone", value: "concise" },
      ],
    });
    const raw = formatExportFile({
      module: original,
      body: "Hello {{vars.tone}} {{vars.reviewer}}.\n",
    });
    const parsed = parseImportFile({
      sourcePath: "in.md",
      raw,
      parseFrontmatter: tinyYaml,
    });
    expect(parsed.module).not.toBeNull();
    expect(parsed.module!.id).toBe("orient");
    expect(parsed.module!.scope).toBe("kickoff");
    expect(parsed.referencedVars).toEqual(["tone", "reviewer"]);
    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.body.trim()).toBe("Hello {{vars.tone}} {{vars.reviewer}}.");
  });

  it("emits a malformed-frontmatter diagnostic when the fence is missing", () => {
    const parsed = parseImportFile({
      sourcePath: "no-fm.md",
      raw: "no frontmatter here\n",
      parseFrontmatter: tinyYaml,
    });
    expect(parsed.module).toBeNull();
    expect(parsed.diagnostics[0]?.code).toBe("malformed-frontmatter");
    expect(parsed.diagnostics[0]?.extra?.path).toBe("no-fm.md");
  });

  it("returns null module + diagnostic when type is not workflow-module", () => {
    const raw = ["---", "id: x", "title: Y", "type: workflow", "scope: k", "---", "", "body"].join(
      "\n",
    );
    const parsed = parseImportFile({
      sourcePath: "wrong-type.md",
      raw,
      parseFrontmatter: tinyYaml,
    });
    expect(parsed.module).toBeNull();
    expect(parsed.diagnostics.some((d) => /must be `workflow-module`/.test(d.message))).toBe(true);
  });
});

describe("planImport", () => {
  const baseModule = mod({
    vars: [
      { kind: "default", name: "tone", value: "concise" },
      { kind: "bare", name: "reviewer" },
      { kind: "object", name: "lang", default: "en", description: "ISO code" },
    ],
  });
  const baseBody = "Hi {{vars.tone}} {{vars.reviewer}} ({{vars.lang}}).";

  it("targets the global path when scope=global", () => {
    const plan = planImport({
      module: baseModule,
      body: baseBody,
      targetScope: "global",
      globalVars: {},
      projectVars: {},
    });
    expect(plan.targetPath).toBe("Projects/_op-modules/orient.md");
    expect(plan.rewrittenProject).toBeNull();
    expect(plan.originalProject).toBeNull();
  });

  it("targets the per-project path and rewrites project: when scope=project", () => {
    const plan = planImport({
      module: mod({ project: "old-slug" }),
      body: baseBody,
      targetScope: "project",
      targetProjectSlug: "new-slug",
      globalVars: {},
      projectVars: {},
    });
    expect(plan.targetPath).toBe("Projects/new-slug/MODULES/orient.md");
    expect(plan.originalProject).toBe("old-slug");
    expect(plan.rewrittenProject).toBe("new-slug");
  });

  it("throws when scope=project lacks a slug", () => {
    expect(() =>
      planImport({
        module: baseModule,
        body: baseBody,
        targetScope: "project",
        globalVars: {},
        projectVars: {},
      }),
    ).toThrow(/targetProjectSlug is required/);
  });

  it("prompts for vars with no higher-precedence value, pre-filled from inline default", () => {
    const plan = planImport({
      module: baseModule,
      body: baseBody,
      targetScope: "global",
      globalVars: {},
      projectVars: {},
    });
    const names = plan.promptsNeeded.map((p) => p.name).sort();
    expect(names).toEqual(["lang", "reviewer", "tone"]);
    const tone = plan.promptsNeeded.find((p) => p.name === "tone")!;
    expect(tone.prefill).toBe("concise");
    expect(tone.hasModuleDefault).toBe(true);
    const reviewer = plan.promptsNeeded.find((p) => p.name === "reviewer")!;
    expect(reviewer.prefill).toBe("");
    expect(reviewer.hasModuleDefault).toBe(false);
    const lang = plan.promptsNeeded.find((p) => p.name === "lang")!;
    expect(lang.description).toBe("ISO code");
  });

  it("project precedence shadows the prompt, recorded as preexisting", () => {
    const plan = planImport({
      module: baseModule,
      body: baseBody,
      targetScope: "project",
      targetProjectSlug: "demo",
      globalVars: { reviewer: "global-rev" },
      projectVars: { tone: "playful" },
    });
    const namesPrompted = plan.promptsNeeded.map((p) => p.name);
    // tone shadowed by projectVars; reviewer shadowed by globalVars; only lang remains.
    expect(namesPrompted).toEqual(["lang"]);
    const writes = plan.varsToWrite.sort((a, b) => a.name.localeCompare(b.name));
    expect(writes).toEqual([
      {
        name: "reviewer",
        value: "global-rev",
        scopeKind: "global",
        preexisting: true,
      },
      {
        name: "tone",
        value: "playful",
        scopeKind: "project",
        projectSlug: "demo",
        preexisting: true,
      },
    ]);
  });

  it("uses supplied varAnswers instead of prompting; lands them at target scope", () => {
    const plan = planImport({
      module: baseModule,
      body: baseBody,
      targetScope: "project",
      targetProjectSlug: "demo",
      varAnswers: { tone: "loud", reviewer: "@me", lang: "fr" },
      globalVars: {},
      projectVars: {},
    });
    expect(plan.promptsNeeded).toEqual([]);
    const writes = plan.varsToWrite.sort((a, b) => a.name.localeCompare(b.name));
    expect(writes).toEqual([
      { name: "lang", value: "fr", scopeKind: "project", projectSlug: "demo", preexisting: false },
      {
        name: "reviewer",
        value: "@me",
        scopeKind: "project",
        projectSlug: "demo",
        preexisting: false,
      },
      { name: "tone", value: "loud", scopeKind: "project", projectSlug: "demo", preexisting: false },
    ]);
  });

  it("preserves an empty-string answer as a real value", () => {
    const plan = planImport({
      module: baseModule,
      body: baseBody,
      targetScope: "global",
      varAnswers: { tone: "", reviewer: "x", lang: "y" },
      globalVars: {},
      projectVars: {},
    });
    expect(plan.varsToWrite.find((v) => v.name === "tone")?.value).toBe("");
  });

  it("flags undeclared body refs without aborting the plan", () => {
    const plan = planImport({
      module: mod({ vars: [] }),
      body: "Use {{vars.unknown}}.",
      targetScope: "global",
      globalVars: {},
      projectVars: {},
    });
    expect(plan.undeclaredVarRefs).toEqual(["unknown"]);
    expect(plan.promptsNeeded).toEqual([]);
  });

  it("records overwrite + backupRelPath when a target file already exists", () => {
    const plan = planImport({
      module: mod(),
      body: "x",
      targetScope: "global",
      globalVars: {},
      projectVars: {},
      existingTargetPath: "Projects/_op-modules/orient.md",
    });
    expect(plan.overwrite).toBe(true);
    expect(plan.backupRelPath).toBe("Projects/_op-modules/orient.md");
  });
});

describe("transaction record round-trip", () => {
  const sample: TransactionRecord = {
    version: 1,
    timestamp: "2026-04-26T12:00:00.000Z",
    command: "op-import-module",
    modulesLanded: [
      {
        sourcePath: "/tmp/in.md",
        targetPath: "Projects/foo/MODULES/x.md",
        scopeKind: "project",
        projectSlug: "foo",
        originalProject: "bar",
        rewrittenProject: "foo",
        overwrote: true,
        backupPath: "Projects/_op-import-history/20260426-120000.bak/Projects/foo/MODULES/x.md",
      },
    ],
    varsWritten: [
      { name: "tone", value: "concise", scopeKind: "global", preexisting: false },
      {
        name: "reviewer",
        value: "alice",
        scopeKind: "project",
        projectSlug: "foo",
        preexisting: false,
      },
    ],
  };

  it("serializes and parses faithfully", () => {
    const raw = serializeTransaction(sample);
    const result = parseTransaction(raw);
    expect(result.error).toBeUndefined();
    expect(result.record).toEqual(sample);
  });

  it("rejects unknown versions", () => {
    const result = parseTransaction(JSON.stringify({ ...sample, version: 99 }));
    expect(result.record).toBeNull();
    expect(result.error).toMatch(/version/);
  });

  it("rejects malformed JSON", () => {
    const result = parseTransaction("{not json");
    expect(result.record).toBeNull();
    expect(result.error).toMatch(/JSON/);
  });
});

describe("transactionFilename", () => {
  it("formats local timestamp with second resolution", () => {
    // Construct a fixed local-time date — verify the components without
    // depending on the test runner's TZ.
    const d = new Date(2026, 3, 26, 9, 5, 7); // April 26 2026 09:05:07 local
    expect(transactionFilename(d)).toBe("20260426-090507");
  });
});
