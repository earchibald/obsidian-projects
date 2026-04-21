import { Plugin, Notice } from "obsidian";

export default class OpPlugin extends Plugin {
  async onload(): Promise<void> {
    this.addCommand({
      id: "op-ping",
      name: "op: ping (scaffold placeholder)",
      callback: () => {
        new Notice("op-obsidian loaded — commands coming in OP-21+");
      },
    });
  }
}
