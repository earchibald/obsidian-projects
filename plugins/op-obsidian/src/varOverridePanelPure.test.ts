import { describe, it, expect } from "vitest";
import {
  buildPanelRows,
  clearLaunchOverride,
  mergeLaunchOverride,
  readLaunchVarsFromFrontmatter,
  type PanelRow,
} from "./varOverridePanelPure";
import type { LoadedModule } from "./composeWorkflowPure";
import type { VarDecl, WorkflowModule } from "./workflowModulePure";

// Tests for the OP-204 (3d) launch-time variable override panel data layer.
// The composer (`composeWorkflowPure.ts`) is the single source of truth for
// resolution; these tests verify that the panel summarises the same chain in
// the same order so the modal and the runtime never disagree.

function makeModule(args: {
  id: string;
  vars?: VarDecl[];
  scope?: string;
  pathPrefix?: "global" | "project";
}): WorkflowModule {
  const path =
    args.pathPrefix === "project"
      ? `Projects/obsidian-projects/MODULES/${args.id}.md`
      : `Projects/_op-modules/${args.id}.md`;
  const source =
    args.pathPrefix === "project"
      ? {
          kind: "project" as const,
          path,
          projectSlug: "obsidian-projects",
        }
      : { kind: "global" as const, path };
  return {
    id: args.id,
    title: args.id,
    scope: args.scope ?? "kickoff",
    order: 0,
    vars: args.vars ?? [],
    source,
  };
}

function makeLoaded(args: { id: string; vars?: VarDecl[]; body?: string }): LoadedModule {
  return { module: makeModule({ id: args.id, vars: args.vars }), body: args.body ?? "" };
}

describe("buildPanelRows — precedence layers", () => {
  it("Module default is the only layer when nothing higher is set", () => {
    const rows = buildPanelRows({
      loadedModules: [
        makeLoaded({ id: "intro", vars: [{ kind: "default", name: "tone", value: "friendly" }] }),
      ],
      globalVars: {},
      projectVars: {},
      launchVars: {},
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      name: "tone",
      currentValue: "friendly",
      currentScope: "module",
      currentScopeLabel: "Module default",
      currentScopeAbbrev: "M",
      hasLaunchOverride: false,
      isUnset: false,
    });
    expect(rows[0].defaults.module).toEqual({ value: "friendly", moduleId: "intro" });
  });

  it("Global default shadows Module default", () => {
    const rows = buildPanelRows({
      loadedModules: [
        makeLoaded({ id: "intro", vars: [{ kind: "default", name: "tone", value: "friendly" }] }),
      ],
      globalVars: { tone: "formal" },
      projectVars: {},
      launchVars: {},
    });
    expect(rows[0]).toMatchObject({
      currentValue: "formal",
      currentScope: "global",
      currentScopeLabel: "Global default",
      currentScopeAbbrev: "G",
    });
    expect(rows[0].defaults.module).toEqual({ value: "friendly", moduleId: "intro" });
    expect(rows[0].defaults.global).toBe("formal");
  });

  it("Project default shadows Global default", () => {
    const rows = buildPanelRows({
      loadedModules: [
        makeLoaded({ id: "intro", vars: [{ kind: "default", name: "tone", value: "friendly" }] }),
      ],
      globalVars: { tone: "formal" },
      projectVars: { tone: "concise" },
      launchVars: {},
    });
    expect(rows[0]).toMatchObject({
      currentValue: "concise",
      currentScope: "project",
      currentScopeLabel: "Project default",
      currentScopeAbbrev: "P",
    });
  });

  it("Launch override wins over every lower layer", () => {
    const rows = buildPanelRows({
      loadedModules: [
        makeLoaded({ id: "intro", vars: [{ kind: "default", name: "tone", value: "friendly" }] }),
      ],
      globalVars: { tone: "formal" },
      projectVars: { tone: "concise" },
      launchVars: { tone: "playful" },
    });
    expect(rows[0]).toMatchObject({
      currentValue: "playful",
      currentScope: "launch",
      currentScopeLabel: "Launch override",
      currentScopeAbbrev: "L",
      hasLaunchOverride: true,
    });
    expect(rows[0].defaults.launch).toBe("playful");
  });

  it("empty-string Launch override is a real distinct value (not 'unset')", () => {
    const rows = buildPanelRows({
      loadedModules: [
        makeLoaded({ id: "intro", vars: [{ kind: "default", name: "tone", value: "friendly" }] }),
      ],
      globalVars: {},
      projectVars: {},
      launchVars: { tone: "" },
    });
    expect(rows[0]).toMatchObject({
      currentValue: "",
      currentScope: "launch",
      hasLaunchOverride: true,
      isUnset: false,
    });
  });

  it("bare declaration with no higher layer leaves the row unset", () => {
    const rows = buildPanelRows({
      loadedModules: [
        makeLoaded({ id: "intro", vars: [{ kind: "bare", name: "tone" }] }),
      ],
      globalVars: {},
      projectVars: {},
      launchVars: {},
    });
    expect(rows[0]).toMatchObject({
      name: "tone",
      currentValue: null,
      currentScope: null,
      isUnset: true,
    });
    expect(rows[0].currentScopeLabel).toBeUndefined();
    expect(rows[0].currentScopeAbbrev).toBeUndefined();
    expect(rows[0].defaults.module).toBeUndefined();
  });
});

describe("buildPanelRows — multiple modules + ordering", () => {
  it("lowest-id module wins the Module-default tie-break", () => {
    const rows = buildPanelRows({
      loadedModules: [
        makeLoaded({ id: "z-late", vars: [{ kind: "default", name: "tone", value: "late" }] }),
        makeLoaded({ id: "a-early", vars: [{ kind: "default", name: "tone", value: "early" }] }),
      ],
      globalVars: {},
      projectVars: {},
      launchVars: {},
    });
    expect(rows[0].defaults.module).toEqual({ value: "early", moduleId: "a-early" });
    expect(rows[0].currentValue).toBe("early");
  });

  it("first object-form description wins when multiple modules declare the same var", () => {
    const rows = buildPanelRows({
      loadedModules: [
        makeLoaded({
          id: "a-early",
          vars: [{ kind: "object", name: "tone", default: "soft", description: "voice tone" }],
        }),
        makeLoaded({
          id: "z-late",
          vars: [{ kind: "object", name: "tone", default: "loud", description: "different desc" }],
        }),
      ],
      globalVars: {},
      projectVars: {},
      launchVars: {},
    });
    expect(rows[0].description).toBe("voice tone");
  });

  it("rows are alphabetically sorted by name", () => {
    const rows = buildPanelRows({
      loadedModules: [
        makeLoaded({
          id: "intro",
          vars: [
            { kind: "bare", name: "zeta" },
            { kind: "bare", name: "alpha" },
            { kind: "bare", name: "mid" },
          ],
        }),
      ],
      globalVars: {},
      projectVars: {},
      launchVars: {},
    });
    expect(rows.map((r) => r.name)).toEqual(["alpha", "mid", "zeta"]);
  });

  it("includes rows for names declared only at Global / Project / Launch", () => {
    const rows = buildPanelRows({
      loadedModules: [],
      globalVars: { only_global: "g" },
      projectVars: { only_project: "p" },
      launchVars: { only_launch: "l" },
    });
    expect(rows).toHaveLength(3);
    expect(rows.find((r) => r.name === "only_global")?.currentScope).toBe("global");
    expect(rows.find((r) => r.name === "only_project")?.currentScope).toBe("project");
    expect(rows.find((r) => r.name === "only_launch")?.currentScope).toBe("launch");
  });
});

describe("buildPanelRows — referenced flag", () => {
  it("isReferenced is false when referencedNames is omitted", () => {
    const rows = buildPanelRows({
      loadedModules: [
        makeLoaded({ id: "intro", vars: [{ kind: "default", name: "tone", value: "friendly" }] }),
      ],
      globalVars: {},
      projectVars: {},
      launchVars: {},
    });
    expect(rows[0].isReferenced).toBe(false);
  });

  it("isReferenced mirrors the referencedNames set", () => {
    const rows = buildPanelRows({
      loadedModules: [
        makeLoaded({
          id: "intro",
          vars: [
            { kind: "bare", name: "used" },
            { kind: "bare", name: "unused" },
          ],
        }),
      ],
      globalVars: {},
      projectVars: {},
      launchVars: {},
      referencedNames: new Set(["used"]),
    });
    expect(rows.find((r) => r.name === "used")?.isReferenced).toBe(true);
    expect(rows.find((r) => r.name === "unused")?.isReferenced).toBe(false);
  });
});

describe("mergeLaunchOverride / clearLaunchOverride", () => {
  it("merge returns a new map with the value applied; original is untouched", () => {
    const before = { tone: "friendly" };
    const after = mergeLaunchOverride(before, "tone", "playful");
    expect(after).toEqual({ tone: "playful" });
    expect(before).toEqual({ tone: "friendly" });
    expect(after).not.toBe(before);
  });

  it("merge preserves empty string as a distinct value", () => {
    expect(mergeLaunchOverride({}, "tone", "")).toEqual({ tone: "" });
  });

  it("clear is a no-op on an absent key (returns same reference)", () => {
    const before = { tone: "playful" };
    const after = clearLaunchOverride(before, "missing");
    expect(after).toBe(before);
  });

  it("clear removes the key and returns a new map", () => {
    const before = { tone: "playful", other: "x" };
    const after = clearLaunchOverride(before, "tone");
    expect(after).toEqual({ other: "x" });
    expect(before).toEqual({ tone: "playful", other: "x" });
  });

  it("clear removes a key whose value is empty string", () => {
    const before = { tone: "" };
    const after = clearLaunchOverride(before, "tone");
    expect(after).toEqual({});
  });

  it("after merge → clear, current resolution falls back to the next layer", () => {
    let launch: Record<string, string> = {};
    launch = mergeLaunchOverride(launch, "tone", "playful");

    const withOverride = buildPanelRows({
      loadedModules: [
        makeLoaded({ id: "intro", vars: [{ kind: "default", name: "tone", value: "friendly" }] }),
      ],
      globalVars: {},
      projectVars: {},
      launchVars: launch,
    });
    expect(withOverride[0].currentScope).toBe("launch");
    expect(withOverride[0].currentValue).toBe("playful");

    launch = clearLaunchOverride(launch, "tone");
    const withoutOverride = buildPanelRows({
      loadedModules: [
        makeLoaded({ id: "intro", vars: [{ kind: "default", name: "tone", value: "friendly" }] }),
      ],
      globalVars: {},
      projectVars: {},
      launchVars: launch,
    });
    expect(withoutOverride[0].currentScope).toBe("module");
    expect(withoutOverride[0].currentValue).toBe("friendly");
  });
});

describe("readLaunchVarsFromFrontmatter", () => {
  it("returns {} when raw is missing or unusable", () => {
    expect(readLaunchVarsFromFrontmatter(undefined)).toEqual({});
    expect(readLaunchVarsFromFrontmatter(null)).toEqual({});
    expect(readLaunchVarsFromFrontmatter("not an object")).toEqual({});
    expect(readLaunchVarsFromFrontmatter([1, 2, 3])).toEqual({});
  });

  it("preserves string values verbatim", () => {
    expect(readLaunchVarsFromFrontmatter({ tone: "playful", mood: "" })).toEqual({
      tone: "playful",
      mood: "",
    });
  });

  it("stringifies numbers and booleans (YAML-typed scalars)", () => {
    expect(
      readLaunchVarsFromFrontmatter({ count: 3, enabled: true, disabled: false }),
    ).toEqual({ count: "3", enabled: "true", disabled: "false" });
  });

  it("drops nested objects, arrays, and dates (no implicit JSON serialisation)", () => {
    expect(
      readLaunchVarsFromFrontmatter({
        ok: "yes",
        nested: { a: 1 },
        arr: [1],
        when: new Date(),
        nul: null,
      }),
    ).toEqual({ ok: "yes" });
  });
});
