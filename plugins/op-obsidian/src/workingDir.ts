import { App, Modal, Setting, TFile } from "obsidian";
import type { OpSettings } from "./settings";
import type { IssueEntry } from "./types";

export interface ResolvedWorkingDir {
  path: string;
  source: "frontmatter" | "setting" | "prompt";
}

export async function resolveWorkingDir(
  app: App,
  settings: OpSettings,
  entry: IssueEntry,
  saveSettings: () => Promise<void>,
): Promise<ResolvedWorkingDir | undefined> {
  const fromFrontmatter = readRepoPathFromStatus(app, entry.project);
  if (fromFrontmatter) return { path: fromFrontmatter, source: "frontmatter" };

  const fromSettings = settings.workingDirs[entry.project];
  if (fromSettings) return { path: fromSettings, source: "setting" };

  const picked = await promptForWorkingDir(app, entry.project);
  if (!picked) return undefined;
  if (picked.persist) {
    settings.workingDirs[entry.project] = picked.path;
    await saveSettings();
  }
  return { path: picked.path, source: "prompt" };
}

function readRepoPathFromStatus(app: App, slug: string): string | undefined {
  const path = `Projects/${slug}/STATUS.md`;
  const f = app.vault.getAbstractFileByPath(path);
  if (!(f instanceof TFile)) return undefined;
  const fm = app.metadataCache.getFileCache(f)?.frontmatter;
  const v = fm?.repo_path;
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

interface PromptResult {
  path: string;
  persist: boolean;
}

function promptForWorkingDir(app: App, slug: string): Promise<PromptResult | undefined> {
  return new Promise((resolve) => {
    new WorkingDirModal(app, slug, resolve).open();
  });
}

class WorkingDirModal extends Modal {
  private path = "";
  private persist = true;
  private settled = false;

  constructor(app: App, private slug: string, private onDone: (r: PromptResult | undefined) => void) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: `Working directory for ${this.slug}` });
    contentEl.createEl("p", {
      text: "Absolute path to the project's git repo. Used as cwd when launching the agent.",
      cls: "setting-item-description",
    });

    new Setting(contentEl).setName("Path").addText((t) => {
      t.setPlaceholder("/Users/you/Projects/…").onChange((v) => (this.path = v));
      t.inputEl.style.width = "100%";
    });

    new Setting(contentEl)
      .setName("Remember this mapping")
      .addToggle((t) => t.setValue(this.persist).onChange((v) => (this.persist = v)));

    new Setting(contentEl)
      .addButton((b) =>
        b
          .setButtonText("Use")
          .setCta()
          .onClick(() => {
            const p = this.path.trim();
            if (!p) return;
            this.settled = true;
            this.close();
            this.onDone({ path: p, persist: this.persist });
          }),
      )
      .addButton((b) => b.setButtonText("Cancel").onClick(() => this.close()));
  }

  onClose(): void {
    this.contentEl.empty();
    if (!this.settled) this.onDone(undefined);
  }
}
