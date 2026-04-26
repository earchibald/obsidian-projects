import { App, FuzzySuggestModal, Modal, Setting } from "obsidian";
import { notify } from "./notificationLog";
import type { ProjectInfo } from "./projects";
import type { Priority, CreateIssueInput } from "./createIssue";
import type { IssueEntry } from "./types";
import type { AgentId } from "./agentProfiles";
import type { RelationName } from "./relations";
import {
  validateNewIssueInput,
  validateScaffoldInput,
  validatePrUrl,
  validateGithubIssueUrl,
  validateSha,
  validateSubject,
} from "./modalValidation";

export class AgentPickerModal extends FuzzySuggestModal<AgentId> {
  constructor(
    app: App,
    private agents: AgentId[],
    private defaultId: AgentId,
    private onChoose: (id: AgentId) => void,
  ) {
    super(app);
    this.setPlaceholder(`Pick agent (default: ${defaultId})`);
  }
  getItems(): AgentId[] {
    return this.agents;
  }
  getItemText(a: AgentId): string {
    return a === this.defaultId ? `${a} (default)` : a;
  }
  onChooseItem(a: AgentId): void {
    this.onChoose(a);
  }
}

export class RelationPickerModal extends FuzzySuggestModal<RelationName> {
  constructor(
    app: App,
    private relations: RelationName[],
    private onChoose: (relation: RelationName) => void,
    private placeholder = "Pick relation",
  ) {
    super(app);
    this.setPlaceholder(this.placeholder);
  }
  getItems(): RelationName[] {
    return this.relations;
  }
  getItemText(r: RelationName): string {
    return r;
  }
  onChooseItem(r: RelationName): void {
    this.onChoose(r);
  }
}

export class IssuePickerModal extends FuzzySuggestModal<IssueEntry> {
  constructor(app: App, private items: IssueEntry[], private onChoose: (e: IssueEntry) => void) {
    super(app);
    this.setPlaceholder("Multiple matches — pick one");
  }
  getItems(): IssueEntry[] {
    return this.items;
  }
  getItemText(e: IssueEntry): string {
    return `${e.id} — ${e.title}${e.resolvedFolder ? " (resolved)" : ""}`;
  }
  onChooseItem(e: IssueEntry): void {
    this.onChoose(e);
  }
}

export class ProjectSuggestModal extends FuzzySuggestModal<ProjectInfo> {
  constructor(
    app: App,
    private projects: ProjectInfo[],
    private onChoose: (project: ProjectInfo) => void,
  ) {
    super(app);
    this.setPlaceholder("Select a project…");
  }

  getItems(): ProjectInfo[] {
    return this.projects;
  }

  getItemText(p: ProjectInfo): string {
    return p.prefix ? `${p.slug} (${p.prefix})` : p.slug;
  }

  onChooseItem(p: ProjectInfo): void {
    this.onChoose(p);
  }
}

export type ModulePickerItem =
  | {
      kind: "existing";
      moduleId: string;
      scopeKind: "global" | "project";
      projectSlug?: string;
      label: string;
    }
  | { kind: "new-global"; label: string }
  | { kind: "new-project"; projectSlug: string; label: string };

export class ModulePickerModal extends FuzzySuggestModal<ModulePickerItem> {
  constructor(
    app: App,
    private items: ModulePickerItem[],
    private onChoose: (item: ModulePickerItem) => void,
  ) {
    super(app);
    this.setPlaceholder("Pick a workflow module to edit (or create a new one)…");
  }
  getItems(): ModulePickerItem[] {
    return this.items;
  }
  getItemText(p: ModulePickerItem): string {
    return p.label;
  }
  onChooseItem(p: ModulePickerItem): void {
    this.onChoose(p);
  }
}

export class NewModuleIdModal extends Modal {
  private value = "";

  constructor(
    app: App,
    private scopeKind: "global" | "project",
    private projectSlug: string | undefined,
    private onSubmit: (moduleId: string) => void,
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    const where =
      this.scopeKind === "global"
        ? "Projects/_op-modules/"
        : `Projects/${this.projectSlug ?? ""}/MODULES/`;
    contentEl.createEl("h2", { text: "New workflow module" });
    contentEl.createEl("p", {
      text: `The new module will be created at ${where}<id>.md when the agent writes it.`,
      cls: "op-new-module-modal__hint",
    });
    new Setting(contentEl)
      .setName("Module id")
      .setDesc("Filename basename, no .md. Lowercase + hyphens recommended.")
      .addText((t) =>
        t.setPlaceholder("orient").onChange((v) => {
          this.value = v;
        }),
      );
    new Setting(contentEl).addButton((b) =>
      b
        .setButtonText("Create")
        .setCta()
        .onClick(() => {
          const id = this.value.trim();
          if (!id) return;
          this.onSubmit(id);
          this.close();
        }),
    );
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

export interface NewIssueSubmitOptions {
  launchPlan: boolean;
  startFlow: boolean;
}

/**
 * Optional pre-fill for the modal — used by quick-capture (OP-159) and any
 * future caller that already knows the title/scope. `scopeMode` controls how
 * the textarea content is submitted:
 *   - `"bullets"` (default): textarea is split per non-empty line, each line
 *     becomes one scope bullet. Matches the original modal behavior.
 *   - `"body"`: textarea is submitted verbatim as `scopeBody`, preserving
 *     paragraphs, blockquotes, blank lines. Quick-capture uses this so a
 *     selected paragraph round-trips intact.
 */
export interface NewIssueInitial {
  title?: string;
  scopeRaw?: string;
  scopeMode?: "bullets" | "body";
}

export class NewIssueModal extends Modal {
  private title = "";
  private priority: Priority = "med";
  private scopeRaw = "";
  private githubIssue = "";
  private evaluateComplexity = false;
  private scopeMode: "bullets" | "body";

  constructor(
    app: App,
    private project: ProjectInfo,
    private onSubmit: (input: CreateIssueInput, opts: NewIssueSubmitOptions) => void,
    private opts: { autoCreateGithubIssue?: boolean; initial?: NewIssueInitial } = {},
  ) {
    super(app);
    this.title = opts.initial?.title ?? "";
    this.scopeRaw = opts.initial?.scopeRaw ?? "";
    this.scopeMode = opts.initial?.scopeMode ?? "bullets";
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", {
      text: `New issue in ${this.project.slug}${this.project.prefix ? ` (${this.project.prefix})` : ""}`,
    });

    new Setting(contentEl)
      .setName("Title")
      .addText((t) =>
        t
          .setPlaceholder("Short descriptive title")
          .setValue(this.title)
          .onChange((v) => (this.title = v)),
      );

    new Setting(contentEl).setName("Priority").addDropdown((d) =>
      d
        .addOption("low", "low")
        .addOption("med", "med")
        .addOption("high", "high")
        .setValue(this.priority)
        .onChange((v) => (this.priority = v as Priority)),
    );

    const scopeDesc =
      this.scopeMode === "body"
        ? "Captured text — submitted verbatim under ## Scope. Edit as needed."
        : "One bullet per line. e.g. Wire the command / Write unit tests.";
    new Setting(contentEl)
      .setName("Scope (optional)")
      .setDesc(scopeDesc)
      .addTextArea((t) => {
        t.setPlaceholder("e.g.\nWire the command\nWrite unit tests");
        t.setValue(this.scopeRaw);
        t.onChange((v) => (this.scopeRaw = v));
        t.inputEl.rows = 6;
        t.inputEl.style.width = "100%";
      });

    const ghDesc = this.opts.autoCreateGithubIssue
      ? "Leave blank to auto-create a GitHub issue via `gh`."
      : "Paste an existing GitHub issue URL to link.";
    new Setting(contentEl)
      .setName("GitHub issue URL (optional)")
      .setDesc(ghDesc)
      .addText((t) =>
        t
          .setPlaceholder("https://github.com/owner/repo/issues/123")
          .onChange((v) => (this.githubIssue = v)),
      );

    new Setting(contentEl)
      .setName("Evaluate complexity (multi-agent flow)")
      .setDesc(
        "After creating the issue, run the op-evaluate agent headlessly to produce an `## Initial Evaluation` and classify complexity (simple/complex). Equivalent to clicking \"Create and start flow\".",
      )
      .addToggle((t) =>
        t.setValue(this.evaluateComplexity).onChange((v) => (this.evaluateComplexity = v)),
      );

    const doSubmit = (opts: { launchPlan: boolean; startFlow: boolean }): void => {
      const result = validateNewIssueInput({
        title: this.title,
        scopeRaw: this.scopeRaw,
        githubIssue: this.githubIssue,
        priority: this.priority,
      });
      if (!result.ok) {
        notify(result.error);
        return;
      }
      this.close();
      // In "body" mode (quick-capture), submit the textarea content verbatim
      // as `scopeBody` so paragraphs / blockquotes / blank lines round-trip
      // intact. In "bullets" mode (default), keep the legacy bullet split.
      const scopeBody =
        this.scopeMode === "body" && this.scopeRaw.trim().length > 0
          ? this.scopeRaw.replace(/\s+$/g, "")
          : undefined;
      this.onSubmit(
        {
          slug: this.project.slug,
          title: result.value.title,
          priority: result.value.priority,
          scope: scopeBody === undefined ? result.value.scope : undefined,
          scopeBody,
          githubIssue: result.value.githubIssue,
        },
        opts,
      );
    };

    new Setting(contentEl)
      .addButton((b) =>
        b
          .setButtonText("Create issue")
          .setCta()
          .onClick(() =>
            doSubmit({ launchPlan: false, startFlow: this.evaluateComplexity }),
          ),
      )
      .addButton((b) =>
        b
          .setButtonText("Create and plan")
          .setTooltip("Create the issue and launch an agent for it in PLAN MODE")
          .onClick(() => doSubmit({ launchPlan: true, startFlow: false })),
      )
      .addButton((b) =>
        b
          .setButtonText("Create and start flow")
          .setTooltip(
            "Create the issue, then run the op-evaluate agent headlessly to classify complexity.",
          )
          .onClick(() => doSubmit({ launchPlan: false, startFlow: true })),
      )
      .addButton((b) => b.setButtonText("Cancel").onClick(() => this.close()));
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

export class AppendCommitModal extends Modal {
  private sha = "";
  private subject = "";

  constructor(
    app: App,
    private issue: IssueEntry,
    private onSubmit: (sha: string, subject: string) => void,
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: `Append commit to ${this.issue.id}` });

    new Setting(contentEl)
      .setName("SHA")
      .setDesc("7–40 hex characters, e.g. abc1234")
      .addText((t) =>
        t.setPlaceholder("abc1234").onChange((v) => (this.sha = v)),
      );
    new Setting(contentEl)
      .setName("Subject")
      .setDesc("Commit message subject line — the first line of `git log --pretty=%s`, e.g. “fix modal copy”.")
      .addText((t) =>
        t.setPlaceholder("e.g. fix modal copy").onChange((v) => (this.subject = v)),
      );

    new Setting(contentEl)
      .addButton((b) =>
        b
          .setButtonText("Append commit")
          .setCta()
          .onClick(() => {
            const sha = validateSha(this.sha);
            const subject = validateSubject(this.subject);
            if (!sha.ok || !subject.ok) {
              notify("Both SHA and subject are required");
              return;
            }
            this.close();
            this.onSubmit(sha.value, subject.value);
          }),
      )
      .addButton((b) => b.setButtonText("Cancel").onClick(() => this.close()));
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

export class SetPrModal extends Modal {
  private url = "";

  constructor(
    app: App,
    private issue: IssueEntry,
    private onSubmit: (url: string) => void,
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: `Set PR URL on ${this.issue.id}` });

    new Setting(contentEl)
      .setName("PR URL")
      .setDesc("Full GitHub pull request URL, e.g. https://github.com/owner/repo/pull/123")
      .addText((t) =>
        t.setPlaceholder("https://github.com/.../pull/123").onChange((v) => (this.url = v)),
      );

    new Setting(contentEl)
      .addButton((b) =>
        b
          .setButtonText("Set PR URL")
          .setCta()
          .onClick(() => {
            const r = validatePrUrl(this.url);
            if (!r.ok) {
              notify(r.error);
              return;
            }
            this.close();
            this.onSubmit(r.value);
          }),
      )
      .addButton((b) => b.setButtonText("Cancel").onClick(() => this.close()));
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

export class SetGithubIssueModal extends Modal {
  private url = "";

  constructor(
    app: App,
    private issue: IssueEntry,
    private onSubmit: (url: string) => void,
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: `Set GitHub issue URL on ${this.issue.id}` });

    new Setting(contentEl)
      .setName("GitHub issue URL")
      .setDesc("Full GitHub issue URL — the plugin mirrors this issue's status to it.")
      .addText((t) =>
        t
          .setPlaceholder("https://github.com/owner/repo/issues/123")
          .setValue(this.issue.githubIssue ?? "")
          .onChange((v) => (this.url = v)),
      );

    new Setting(contentEl)
      .addButton((b) =>
        b
          .setButtonText("Set GitHub URL")
          .setCta()
          .onClick(() => {
            const u = this.url.trim() || (this.issue.githubIssue ?? "");
            const r = validateGithubIssueUrl(u);
            if (!r.ok) {
              notify(r.error);
              return;
            }
            this.close();
            this.onSubmit(r.value);
          }),
      )
      .addButton((b) => b.setButtonText("Cancel").onClick(() => this.close()));
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

export interface ScaffoldModalInput {
  slug: string;
  prefix: string;
  repoPath?: string;
  seedTitle?: string;
  seedPriority?: Priority;
}

export class ScaffoldProjectModal extends Modal {
  private slug = "";
  private prefix = "";
  private repoPath = "";
  private seedTitle = "";
  private seedPriority: Priority = "med";

  constructor(app: App, private onSubmit: (input: ScaffoldModalInput) => void) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "Scaffold new project" });

    new Setting(contentEl)
      .setName("Slug")
      .setDesc("Lowercase, hyphen-separated — becomes the folder under Projects/. e.g. “jira-bases”, “my-project”.")
      .addText((t) =>
        t.setPlaceholder("my-project").onChange((v) => (this.slug = v)),
      );

    new Setting(contentEl)
      .setName("Prefix")
      .setDesc("Uppercase issue-ID prefix (2–4 letters, A–Z only). Issues will be named <PREFIX>-1, <PREFIX>-2, … — e.g. MP, JB, OP.")
      .addText((t) => t.setPlaceholder("MP").onChange((v) => (this.prefix = v)));

    new Setting(contentEl)
      .setName("Repo path (optional)")
      .setDesc("Absolute path to the code repo — written to STATUS.md as repo_path, used by op:open-agent as the working directory")
      .addText((t) =>
        t
          .setPlaceholder("/Users/you/Projects/my-project")
          .onChange((v) => (this.repoPath = v)),
      );

    new Setting(contentEl)
      .setName("Seed issue title (optional)")
      .setDesc("If set, creates the first issue (PREFIX-1) with this title.")
      .addText((t) =>
        t.setPlaceholder("Leave blank to skip").onChange((v) => (this.seedTitle = v)),
      );

    new Setting(contentEl)
      .setName("Seed priority")
      .setDesc("Only used when a seed title is set.")
      .addDropdown((d) =>
      d
        .addOption("low", "low")
        .addOption("med", "med")
        .addOption("high", "high")
        .setValue(this.seedPriority)
        .onChange((v) => (this.seedPriority = v as Priority)),
    );

    new Setting(contentEl)
      .addButton((b) =>
        b
          .setButtonText("Scaffold project")
          .setCta()
          .onClick(() => {
            const r = validateScaffoldInput({
              slug: this.slug,
              prefix: this.prefix,
              repoPath: this.repoPath,
              seedTitle: this.seedTitle,
              seedPriority: this.seedPriority,
            });
            if (!r.ok) {
              notify(r.error);
              return;
            }
            this.close();
            this.onSubmit(r.value);
          }),
      )
      .addButton((b) => b.setButtonText("Cancel").onClick(() => this.close()));
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

export class FindIssueModal extends Modal {
  private raw = "";

  constructor(app: App, private onSubmit: (raw: string) => void) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "Find issue" });
    contentEl.createEl("p", {
      text: "Enter PREFIX, PREFIX-N, slug, or slug N",
      cls: "setting-item-description",
    });

    new Setting(contentEl).setName("Query").addText((t) => {
      t.setPlaceholder("e.g. OP-22, OP, jira-bases 3").onChange((v) => (this.raw = v));
      t.inputEl.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter") {
          ev.preventDefault();
          this.submit();
        }
      });
    });

    new Setting(contentEl)
      .addButton((b) => b.setButtonText("Find issue").setCta().onClick(() => this.submit()))
      .addButton((b) => b.setButtonText("Cancel").onClick(() => this.close()));
  }

  private submit(): void {
    const v = this.raw.trim();
    if (!v) {
      notify("Enter a query");
      return;
    }
    this.close();
    this.onSubmit(v);
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
