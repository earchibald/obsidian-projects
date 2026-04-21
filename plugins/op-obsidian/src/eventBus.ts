import type { LifecycleEvent, LifecycleEventKind } from "./types";

type Handler = (ev: LifecycleEvent) => void;

export class EventBus {
  private handlers = new Map<LifecycleEventKind | "*", Set<Handler>>();

  on(kind: LifecycleEventKind | "*", handler: Handler): () => void {
    let set = this.handlers.get(kind);
    if (!set) {
      set = new Set();
      this.handlers.set(kind, set);
    }
    set.add(handler);
    return () => set!.delete(handler);
  }

  emit(ev: LifecycleEvent): void {
    this.handlers.get(ev.kind)?.forEach((h) => h(ev));
    this.handlers.get("*")?.forEach((h) => h(ev));
  }

  clear(): void {
    this.handlers.clear();
  }
}
