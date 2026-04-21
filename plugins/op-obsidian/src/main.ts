import { Notice, Plugin } from "obsidian";
import { EventBus } from "./eventBus";
import { IssueStore } from "./issueStore";
import type { LifecycleEvent } from "./types";

export default class OpPlugin extends Plugin {
  bus!: EventBus;
  store!: IssueStore;

  async onload(): Promise<void> {
    this.bus = new EventBus();
    this.store = new IssueStore(this.app, this.bus);
    this.addChild(this.store);

    this.bus.on("*", (ev: LifecycleEvent) => {
      console.debug("[op-obsidian]", ev.kind, "entry" in ev ? ev.entry.path : ev.path);
    });

    this.addCommand({
      id: "op-ping",
      name: "op: ping (scaffold placeholder)",
      callback: () => {
        new Notice("op-obsidian loaded");
      },
    });

    this.addCommand({
      id: "op-dump-store",
      name: "op: dev — dump IssueStore to console",
      callback: () => {
        const issues = this.store.issues();
        const tasks = this.store.tasks();
        console.log("[op-obsidian] IssueStore dump", {
          issues: issues.length,
          tasks: tasks.length,
          entries: [...issues, ...tasks],
        });
        new Notice(`op: ${issues.length} issues, ${tasks.length} tasks (see console)`);
      },
    });

    this.addCommand({
      id: "op-rebuild-store",
      name: "op: dev — rebuild IssueStore",
      callback: () => {
        this.store.rebuild();
        new Notice("op: store rebuilt");
      },
    });
  }

  onunload(): void {
    this.bus?.clear();
  }
}
