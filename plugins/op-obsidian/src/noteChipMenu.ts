import { App, Menu } from "obsidian";
import type { ChipMenuItem, ChipState } from "./noteChipState";

/**
 * Build and show the overflow menu for a note-level chip (OP-151).
 *
 * Each entry dispatches by Obsidian command id via
 * `app.commands.executeCommandById` so business logic stays in one place
 * (no duplicated handlers that drift from the palette command). The menu
 * uses Obsidian's `Menu` class directly — same affordance pattern as the
 * sidebar context menu (OP-163).
 *
 * Dispatch caveat: most `op-*` commands are `checkCallback`-shaped and
 * inspect `app.workspace.getActiveFile()` to find the target issue. Before
 * showing the menu we make sure the issue note is the active leaf
 * (callers pass the issue path; this is normally true because the click
 * came from inside the note's own editor pane). When dispatch returns
 * `false` (Obsidian's signal that the command opted out), we surface a
 * subtle `Notice` so the user isn't left wondering why nothing happened.
 */
export function showChipMenu(
  app: App,
  state: ChipState,
  ev: MouseEvent,
): void {
  const menu = new Menu();
  for (const item of state.menu) {
    menu.addItem((mi) => {
      mi.setTitle(item.label);
      if (item.icon) mi.setIcon(item.icon);
      mi.onClick(() => dispatchChipCommand(app, item));
    });
  }
  // Show below the chip (anchor to mouse click) — matches the sidebar
  // context-menu UX. `showAtMouseEvent` handles outside-click dismissal.
  menu.showAtMouseEvent(ev);
}

/**
 * Run a chip command by id. Falls back to a Notice when the command is
 * absent or refused — keeps the chip from looking broken when, e.g.,
 * `op-clear-agent` lands in a future PR but the chip rendered against an
 * older command list.
 */
export function dispatchChipCommand(app: App, item: ChipMenuItem): void {
  // `executeCommandById` returns `false` when the command id is unknown
  // *or* its checkCallback declines (no active issue note, etc).
  const ok = (app as unknown as {
    commands: { executeCommandById: (id: string) => boolean };
  }).commands.executeCommandById(item.command);
  if (!ok) {
    // Defer the import: `notify` lives in notificationLog.ts which pulls in
    // the Obsidian app — keep this module dependency-light for tests.
    void notifyMissingCommand(item);
  }
}

async function notifyMissingCommand(item: ChipMenuItem): Promise<void> {
  const { notify } = await import("./notificationLog");
  notify(`op: ${item.command} unavailable — open the issue note first.`);
}
