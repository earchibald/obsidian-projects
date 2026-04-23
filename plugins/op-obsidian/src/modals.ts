import { App, FuzzySuggestModal, Modal, Notice, Setting } from "obsidian";
import type { ProjectInfo } from "./projects";
import type { Priority, CreateIssueInput } from "./createIssue";
import type { IssueEntry } from "./types";
import type { AgentId } from "./agentProfiles";

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

export class NewIssueModal extends Modal {
  private title = "";
  private priority: Priority = "med";
  private scopeRaw = "";
  private githubIssue = "";

  constructor(
    app: App,
    private project: ProjectInfo,
    private onSubmit: (input: CreateIssueInput, andPlan: boolean) => void,
    private opts: { autoCreateGithubIssue?: boolean } = {},
  ) {
    super(app);
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
        t.setPlaceholder("Short descriptive title").onChange((v) => (this.title = v)),
      );

    new Setting(contentEl).setName("Priority").addDropdown((d) =>
      d
        .addOption("low", "low")
        .addOption("med", "med")
        .addOption("high", "high")
        .setValue(this.priority)
        .onChange((v) => (this.priority = v as Priority)),
    );

    new Setting(contentEl)
      .setName("Scope (optional)")
      .setDesc("One bullet per line. e.g. Wire the command / Write unit tests.")
      .addTextArea((t) => {
        t.setPlaceholder("e.g.\nWire the command\nWrite unit tests");
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

    const doSubmit = (andPlan: boolean): void => {
      if (!this.title.trim()) {
        new Notice("Title is required");
        return;
      }
      const scope = this.scopeRaw
        .split("\n")
        .map((l) => l.replace(/^\s*[-*]\s*/, "").trim())
        .filter((l) => l.length > 0);
      const gh = this.githubIssue.trim();
      if (gh && !/^https?:\/\//i.test(gh)) {
        new Notice("GitHub URL must start with http(s)://");
        return;
      }
      this.close();
      this.onSubmit(
        {
          slug: this.project.slug,
          title: this.title.trim(),
          priority: this.priority,
          scope,
          githubIssue: gh || undefined,
        },
        andPlan,
      );
    };

    new Setting(contentEl)
      .addButton((b) =>
        b
          .setButtonText("Create issue")
          .setCta()
          .onClick(() => doSubmit(false)),
      )
      .addButton((b) =>
        b
          .setButtonText("Create and plan")
          .setTooltip("Create the issue and launch an agent for it in PLAN MODE")
          .onClick(() => doSubmit(true)),
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
      .setDesc("Commit message subject line")
      .addText((t) =>
        t.setPlaceholder("e.g. fix modal copy").onChange((v) => (this.subject = v)),
      );

    new Setting(contentEl)
      .addButton((b) =>
        b
          .setButtonText("Append commit")
          .setCta()
          .onClick(() => {
            if (!this.sha.trim() || !this.subject.trim()) {
              new Notice("Both SHA and subject are required");
              return;
            }
            this.close();
            this.onSubmit(this.sha.trim(), this.subject.trim());
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
      .setDesc("Full GitHub pull request URL")
      .addText((t) =>
        t.setPlaceholder("https://github.com/.../pull/123").onChange((v) => (this.url = v)),
      );

    new Setting(contentEl)
      .addButton((b) =>
        b
          .setButtonText("Set PR URL")
          .setCta()
          .onClick(() => {
            if (!/^https?:\/\//i.test(this.url.trim())) {
              new Notice("URL must start with http(s)://");
              return;
            }
            this.close();
            this.onSubmit(this.url.trim());
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
            if (!/^https?:\/\//i.test(u)) {
              new Notice("URL must start with http(s)://");
              return;
            }
            this.close();
            this.onSubmit(u);
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
      .setDesc("Lowercase, hyphen-separated — becomes the folder under Projects/")
      .addText((t) =>
        t.setPlaceholder("my-project").onChange((v) => (this.slug = v)),
      );

    new Setting(contentEl)
      .setName("Prefix")
      .setDesc("Uppercase issue-ID prefix, e.g. MP")
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
            const slug = this.slug.trim();
            const prefix = this.prefix.trim();
            if (!slug || !prefix) {
              new Notice("Slug and prefix are required");
              return;
            }
            const seedTitle = this.seedTitle.trim() || undefined;
            const repoPath = this.repoPath.trim() || undefined;
            if (repoPath && !repoPath.startsWith("/")) {
              new Notice("Repo path must be absolute (start with /)");
              return;
            }
            this.close();
            this.onSubmit({
              slug,
              prefix,
              repoPath,
              seedTitle,
              seedPriority: seedTitle ? this.seedPriority : undefined,
            });
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
      new Notice("Enter a query");
      return;
    }
    this.close();
    this.onSubmit(v);
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
