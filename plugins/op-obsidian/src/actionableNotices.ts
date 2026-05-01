import { Notice } from "obsidian";

/**
 * One inline action link rendered after the Notice text. Clicking dismisses
 * the Notice and runs `onClick`.
 */
export interface NoticeAction {
  label: string;
  onClick: () => void;
}

export interface ActionableNoticeOptions {
  /** Leading prose. Plain text only. */
  text: string;
  /** Inline action links rendered after the text, joined by " · ". */
  actions?: NoticeAction[];
  /**
   * Override duration (ms). Default: `10_000` (10 s auto-dismiss) regardless
   * of whether actions are present. Pass `0` explicitly for a sticky notice.
   */
  duration?: number;
}

export function durationForActions(actions: NoticeAction[], override?: number): number {
  if (typeof override === "number") return override;
  return 10_000;
}

/**
 * Show an actionable Notice — `text · [action1] · [action2] · …`.
 * Each action link is a real `<a class="op-notice-action">`; clicking it
 * runs `onClick` then dismisses the Notice.
 */
export function showActionableNotice(opts: ActionableNoticeOptions): Notice {
  const actions = opts.actions ?? [];
  const frag = document.createDocumentFragment();
  frag.appendChild(document.createTextNode(opts.text));

  let notice: Notice | undefined;
  for (const action of actions) {
    frag.appendChild(document.createTextNode(" · "));
    const link = document.createElement("a");
    link.textContent = `[${action.label}]`;
    link.classList.add("op-notice-action");
    link.addEventListener("click", (ev) => {
      ev.preventDefault();
      try {
        action.onClick();
      } finally {
        notice?.hide();
      }
    });
    frag.appendChild(link);
  }

  notice = new Notice(frag, durationForActions(actions, opts.duration));
  return notice;
}
