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

/**
 * OP-204 (3d): extract per-launch user-var overrides from URI params for
 * `obsidian://op-open-agent`. Two accepted forms — both can be combined; the
 * packed form wins on duplicates because it's the more explicit affordance.
 *
 *   1. **Prefixed keys**: `?var.tone=playful&var.reviewer=alice` — every key
 *      matching `^var\.([A-Za-z_][A-Za-z0-9_-]*)$` is copied into the map
 *      with the `var.` prefix stripped. Each key is unique so Obsidian's
 *      last-wins collapse never mangles them.
 *   2. **Packed key**: `?vars=tone=playful%0Areviewer=alice` — a single
 *      `vars` key carrying newline-or-comma-separated `name=value` entries,
 *      split via {@link collectRepeated}. The first `=` per entry separates
 *      name from value; subsequent `=` characters are part of the value.
 *
 * Empty string is preserved as a distinct value (matches the composer's
 * "empty Launch override wins" semantics). Malformed names — empty,
 * non-conforming to `[A-Za-z_][A-Za-z0-9_-]*`, or `var.` keys with no name
 * after the dot — are silently dropped rather than thrown so a typo in one
 * param doesn't sink the whole launch.
 */
export function parseLaunchVarsFromUri(
  params: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = {};
  const nameRe = /^[A-Za-z_][A-Za-z0-9_-]*$/;

  for (const [key, value] of Object.entries(params)) {
    if (!key.startsWith("var.")) continue;
    const name = key.slice(4);
    if (!name || !nameRe.test(name)) continue;
    if (typeof value !== "string") continue;
    out[name] = value;
  }

  for (const entry of collectRepeated(params, "vars")) {
    const eq = entry.indexOf("=");
    if (eq < 0) continue;
    const name = entry.slice(0, eq).trim();
    if (!name || !nameRe.test(name)) continue;
    out[name] = entry.slice(eq + 1);
  }

  return out;
}
