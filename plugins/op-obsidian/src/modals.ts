import { App, FuzzySuggestModal, Modal, Notice, Setting } from "obsidian";
import type { ProjectInfo } from "./projects";
import type { Priority, CreateIssueInput } from "./createIssue";
import type { IssueEntry } from "./types";

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

  constructor(
    app: App,
    private project: ProjectInfo,
    private onSubmit: (input: CreateIssueInput) => void,
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
      .setName("Scope (one bullet per line, optional)")
      .addTextArea((t) => {
        t.setPlaceholder("e.g.\nWire the command\nWrite unit tests");
        t.onChange((v) => (this.scopeRaw = v));
        t.inputEl.rows = 6;
        t.inputEl.style.width = "100%";
      });

    new Setting(contentEl)
      .addButton((b) =>
        b
          .setButtonText("Create")
          .setCta()
          .onClick(() => {
            if (!this.title.trim()) {
              new Notice("Title is required");
              return;
            }
            const scope = this.scopeRaw
              .split("\n")
              .map((l) => l.replace(/^\s*[-*]\s*/, "").trim())
              .filter((l) => l.length > 0);
            this.close();
            this.onSubmit({
              slug: this.project.slug,
              title: this.title.trim(),
              priority: this.priority,
              scope,
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
      .addButton((b) => b.setButtonText("Find").setCta().onClick(() => this.submit()))
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
