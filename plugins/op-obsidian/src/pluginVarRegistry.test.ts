import { describe, expect, it } from "vitest";
import {
  PARENT_NONE_SENTINEL,
  PLUGIN_VAR_REGISTRY,
  buildRenderContext,
  type LaunchContext,
  type RenderContext,
} from "./pluginVarRegistry";
import { BASE_PROFILES } from "./agentProfiles";
import type { IssueEntry } from "./types";

const FIXTURE_CTX: RenderContext = {
  id: "OP-194",
  title: "Generic {{var}} renderer + context builder",
  project: "obsidian-projects",
  status: "in-progress",
  priority: "high",
  parent: "OP-184",
  pr_url: "https://github.com/earchibald/obsidian-projects/pull/232",
  github_issue: "https://github.com/earchibald/obsidian-projects/issues/232",
  repo_path: "/Users/me/Projects/obsidian-projects",
  vault_path: "/Users/me/work/Agent-Vault",
  vault_name: "Agent-Vault",
  branch: "worktree-OP-194",
  today: "2026-04-26",
  agent: "claude",
  model: "claude-opus-4-7",
  mode: "implement",
};

const FIXTURE_ENTRY: IssueEntry = {
  path: "Projects/obsidian-projects/ISSUES/OP-194.md",
  type: "issue",
  id: "OP-194",
  project: "obsidian-projects",
  status: "in-progress",
  priority: "high",
  created: "2026-04-26",
  assignee: "earchibald",
  pr: "https://github.com/earchibald/obsidian-projects/pull/232",
  githubIssue: "https://github.com/earchibald/obsidian-projects/issues/232",
  agent: "claude",
  title: "Generic {{var}} renderer + context builder",
  resolvedFolder: false,
};

describe("PLUGIN_VAR_REGISTRY", () => {
  it("declares an entry for every required always-on var (OP-194 acceptance criterion)", () => {
    const required = [
      "id",
      "title",
      "slug",
      "project",
      "status",
      "priority",
      "parent",
      "repo_path",
      "vault_path",
      "vault_name",
      "branch",
      "pr_url",
      "github_issue",
      "today",
      "agent",
      "model",
      "mode",
    ];
    for (const name of required) {
      expect(PLUGIN_VAR_REGISTRY[name], `missing registry entry for {{${name}}}`).toBeDefined();
    }
  });

  it("each entry's name field matches its key (no key/name drift)", () => {
    for (const [key, entry] of Object.entries(PLUGIN_VAR_REGISTRY)) {
      expect(entry.name).toBe(key);
    }
  });

  it("each entry has a non-empty description and example", () => {
    for (const [name, entry] of Object.entries(PLUGIN_VAR_REGISTRY)) {
      expect(entry.description.length, `${name}.description`).toBeGreaterThan(0);
      expect(entry.example.length, `${name}.example`).toBeGreaterThan(0);
    }
  });

  describe("compute() against a fully populated fixture", () => {
    const cases: Array<[string, string]> = [
      ["id", FIXTURE_CTX.id],
      ["title", FIXTURE_CTX.title],
      ["project", FIXTURE_CTX.project],
      ["status", FIXTURE_CTX.status],
      ["priority", FIXTURE_CTX.priority!],
      ["parent", FIXTURE_CTX.parent as string],
      ["pr_url", FIXTURE_CTX.pr_url!],
      ["github_issue", FIXTURE_CTX.github_issue!],
      ["repo_path", FIXTURE_CTX.repo_path!],
      ["vault_path", FIXTURE_CTX.vault_path],
      ["vault_name", FIXTURE_CTX.vault_name],
      ["branch", FIXTURE_CTX.branch!],
      ["today", FIXTURE_CTX.today],
      ["agent", FIXTURE_CTX.agent],
      ["model", FIXTURE_CTX.model!],
      ["mode", FIXTURE_CTX.mode],
    ];

    for (const [name, expected] of cases) {
      it(`{{${name}}} resolves to the expected fixture value`, () => {
        expect(PLUGIN_VAR_REGISTRY[name].compute(FIXTURE_CTX)).toBe(expected);
      });
    }
  });

  describe("{{slug}} (derived from title)", () => {
    it("renders the fixture title as a kebab-cased branch tail", () => {
      // Fixture title: "Generic {{var}} renderer + context builder"
      expect(PLUGIN_VAR_REGISTRY.slug.compute(FIXTURE_CTX)).toBe(
        "generic-var-renderer-context-builder",
      );
    });

    it("strips a leading `NNb:` task prefix from the title", () => {
      const ctx = { ...FIXTURE_CTX, title: "10b: Authoring tutorials with checked-in examples" };
      expect(PLUGIN_VAR_REGISTRY.slug.compute(ctx)).toBe("authoring-tutorials-with-checked-in");
    });

    it("returns undefined when title collapses to empty (soft-fail contract)", () => {
      // All-punctuation title -> empty slug -> registry returns undefined so the
      // renderer leaves `{{slug}}` verbatim and fires a `missing-var` diagnostic.
      const ctx = { ...FIXTURE_CTX, title: "???" };
      expect(PLUGIN_VAR_REGISTRY.slug.compute(ctx)).toBeUndefined();
    });

    it("returns undefined when title is missing from a Partial ctx", () => {
      // Mirrors the existing `parent`-slot-absent test: undefined vs. empty has
      // a meaning here. Caller didn't supply the field at all.
      expect(PLUGIN_VAR_REGISTRY.slug.compute({})).toBeUndefined();
    });

    it("caps long titles at 40 chars and truncates at the last `-` boundary", () => {
      const ctx = {
        ...FIXTURE_CTX,
        title: "Add slug plugin var and extract shared slugify util and other goodies",
      };
      const out = PLUGIN_VAR_REGISTRY.slug.compute(ctx);
      expect(out).toBeDefined();
      expect(out!.length).toBeLessThanOrEqual(40);
      expect(out!.endsWith("-")).toBe(false);
      expect(out!.startsWith("add-slug-plugin-var")).toBe(true);
    });
  });

  describe("parent sentinel", () => {
    it("returns the literal parent id when present", () => {
      expect(PLUGIN_VAR_REGISTRY.parent.compute({ ...FIXTURE_CTX, parent: "OP-184" })).toBe("OP-184");
    });

    it("returns PARENT_NONE_SENTINEL when parent is null (top-level issue)", () => {
      expect(PLUGIN_VAR_REGISTRY.parent.compute({ ...FIXTURE_CTX, parent: null })).toBe(
        PARENT_NONE_SENTINEL,
      );
    });

    it("the sentinel string lives in the registry export — consumers reference one source", () => {
      // If this check is ever made to pass by hardcoding the prose, that's the bug
      // the test is here to prevent. The sentinel's prose must come from the
      // exported constant, not be re-typed at the assertion site.
      expect(PARENT_NONE_SENTINEL).toBe("(none — this is a top-level issue)");
      expect(PLUGIN_VAR_REGISTRY.parent.compute({ ...FIXTURE_CTX, parent: null })).toBe(
        PARENT_NONE_SENTINEL,
      );
    });

    it("the sentinel describes what 'no parent' means in prose, not an empty string", () => {
      // Defensive: protects against a refactor that sets the sentinel to "" or "—".
      expect(PARENT_NONE_SENTINEL.length).toBeGreaterThan(10);
      expect(PARENT_NONE_SENTINEL).toMatch(/top-level/i);
    });
  });

  describe("optional-field fallthrough", () => {
    const minimal: RenderContext = {
      id: "OP-1",
      title: "t",
      project: "p",
      status: "open",
      parent: null,
      vault_path: "/v",
      vault_name: "V",
      today: "2026-04-26",
      agent: "claude",
      mode: "implement",
    };

    it.each([
      "priority",
      "pr_url",
      "github_issue",
      "repo_path",
      "branch",
      "model",
    ] as const)("{{%s}} returns undefined when ctx slot is undefined", (name) => {
      expect(PLUGIN_VAR_REGISTRY[name].compute(minimal)).toBeUndefined();
    });

    it.each([
      "id",
      "title",
      "slug",
      "project",
      "status",
      "vault_path",
      "vault_name",
      "today",
      "agent",
      "mode",
    ] as const)("{{%s}} returns a string for a required field even on a minimal ctx", (name) => {
      const v = PLUGIN_VAR_REGISTRY[name].compute(minimal);
      expect(typeof v).toBe("string");
      expect(v).not.toBe("");
    });

    it("{{parent}} always returns a string (sentinel or id) — never undefined", () => {
      expect(PLUGIN_VAR_REGISTRY.parent.compute(minimal)).toBe(PARENT_NONE_SENTINEL);
      expect(PLUGIN_VAR_REGISTRY.parent.compute({ ...minimal, parent: "OP-2" })).toBe("OP-2");
    });

    it("{{parent}} returns undefined (not the sentinel) when parent slot is missing from a Partial ctx", () => {
      // parent is required (string | null) in a full RenderContext, but in a
      // Partial<RenderContext> the slot may simply be absent (undefined).
      // undefined means "caller didn't provide the parent field at all" — the
      // renderer treats that as missing-var, not as a confirmed top-level issue.
      // null is the explicit signal that the issue has no parent; only that
      // triggers the sentinel.
      const noParentSlot: Partial<typeof minimal> = { ...minimal };
      delete (noParentSlot as Partial<typeof noParentSlot>).parent;
      expect(PLUGIN_VAR_REGISTRY.parent.compute(noParentSlot)).toBeUndefined();
    });
  });
});

describe("buildRenderContext", () => {
  const launch: LaunchContext = {
    mode: "implement",
    model: "claude-opus-4-7",
    branch: "worktree-OP-194",
    repo_path: "/Users/me/Projects/obsidian-projects",
    vault_path: "/Users/me/work/Agent-Vault",
    vault_name: "Agent-Vault",
    today: "2026-04-26",
    parent: "OP-184",
  };

  it("flattens IssueEntry + AgentProfile + LaunchContext into a RenderContext", () => {
    const ctx = buildRenderContext({
      entry: FIXTURE_ENTRY,
      profile: BASE_PROFILES.claude,
      launch,
    });
    expect(ctx).toMatchObject({
      id: "OP-194",
      title: FIXTURE_ENTRY.title,
      project: "obsidian-projects",
      status: "in-progress",
      priority: "high",
      parent: "OP-184",
      pr_url: FIXTURE_ENTRY.pr,
      github_issue: FIXTURE_ENTRY.githubIssue,
      repo_path: launch.repo_path,
      vault_path: launch.vault_path,
      vault_name: launch.vault_name,
      branch: launch.branch,
      today: launch.today,
      agent: "claude",
      model: launch.model,
      mode: launch.mode,
    });
  });

  it("threads parent: null through to the RenderContext for top-level issues", () => {
    const ctx = buildRenderContext({
      entry: FIXTURE_ENTRY,
      profile: BASE_PROFILES.claude,
      launch: { ...launch, parent: null },
    });
    expect(ctx.parent).toBeNull();
  });

  it("maps IssueEntry.pr → pr_url and IssueEntry.githubIssue → github_issue", () => {
    const ctx = buildRenderContext({
      entry: FIXTURE_ENTRY,
      profile: BASE_PROFILES.claude,
      launch,
    });
    expect(ctx.pr_url).toBe(FIXTURE_ENTRY.pr);
    expect(ctx.github_issue).toBe(FIXTURE_ENTRY.githubIssue);
  });

  it("uses AgentProfile.id as the agent value (not the binary or label)", () => {
    const ctx = buildRenderContext({
      entry: FIXTURE_ENTRY,
      profile: BASE_PROFILES.gemini,
      launch,
    });
    expect(ctx.agent).toBe("gemini");
  });

  it("does no I/O — pure assembly given the inputs", () => {
    // Tautological-feeling test, but it pins the contract: the function does
    // not reach for a clock, vault, or filesystem. Any future regression that
    // adds an `await` or a `new Date()` will be caught by static signature
    // (sync return) and by the property: same inputs → same output.
    const a = buildRenderContext({ entry: FIXTURE_ENTRY, profile: BASE_PROFILES.claude, launch });
    const b = buildRenderContext({ entry: FIXTURE_ENTRY, profile: BASE_PROFILES.claude, launch });
    expect(a).toEqual(b);
  });
});
