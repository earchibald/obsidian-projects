// Obsidian decodes URI params with `decodeURIComponent`, which leaves `+`
// untouched. Senders that build URLs with `URLSearchParams.toString()` (the
// most common JS path) emit spaces as `+`, so titles and scope bullets arrive
// with literal `+` characters. Apply URLSearchParams-style decoding here at
// the dispatch boundary. Lossy for genuine `+` characters — senders must
// encode those as `%2B` to survive, matching standard form-URL semantics.
export function normalizeUriParams<T extends Record<string, string>>(params: T): T {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    out[k] = typeof v === "string" ? v.replace(/\+/g, " ") : v;
  }
  return out as T;
}

// Obsidian's protocol API hands handlers a `Record<string, string>` —
// repeated query keys (e.g. `?scope=a&scope=b`) are collapsed last-wins before
// we see them, so we cannot recover multi-value params from inside a handler.
// Senders that need to pass a list must pack it into a single param with
// newlines (`%0A`) or commas as the delimiter; this helper splits on either.
export function collectRepeated(params: Record<string, string>, key: string): string[] {
  const single = params[key];
  if (!single) return [];
  return single
    .split(/[\n,]/)
    .map((l) => l.trim())
    .filter(Boolean);
}
