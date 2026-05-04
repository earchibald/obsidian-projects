#!/usr/bin/env node
//
// Regenerate the auto-generated tables inside docs/workflow-modules/reference/
// from the canonical TypeScript sources (`pluginVarRegistry.ts`,
// `modelRegistry.ts`).
//
// Default: rewrite the affected pages between sentinel markers and exit 0.
// `--check`: rewrite, then `git diff --exit-code` against the affected paths
// and exit non-zero if anything moved — the CI guard for OP-213.
//
// Sentinel markers in markdown:
//
//   <!-- AUTO-GENERATED:<key> -->
//   ...table content...
//   <!-- /AUTO-GENERATED:<key> -->
//
// Everything outside the sentinels is hand-written and never touched. Adding
// a new key: add a `BLOCKS[<key>] = …` entry below and a matching pair of
// sentinel comments in the target page. Forgetting one half is a hard error.
//
// We deliberately do NOT load TypeScript via tsx/esbuild — the generator
// reads the source file as text and pulls the literal initializer entries
// via narrow regexes. This keeps the script dependency-free and matches the
// ergonomics of `bump-version.mjs`. A future refactor of the registry shape
// will break this script loudly (with a pointer at the expected pattern)
// rather than silently — which is the desired failure mode.

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, "..");

// ---------------------------------------------------------------------------
// CLI parsing
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const checkMode = args.includes("--check");
const unknown = args.filter((a) => a !== "--check");
if (unknown.length > 0) {
  fail(`Unknown argument(s): ${unknown.join(" ")}\nUsage: node scripts/check-workflow-docs.mjs [--check]`);
}

// Tests can override the registry source paths by setting these env vars.
// Production CI never sets them.
const PLUGIN_VAR_REGISTRY_PATH =
  process.env.OP_DOCS_PLUGIN_VAR_REGISTRY ||
  join(REPO_ROOT, "plugins/op-obsidian/src/pluginVarRegistry.ts");
const MODEL_REGISTRY_PATH =
  process.env.OP_DOCS_MODEL_REGISTRY ||
  join(REPO_ROOT, "plugins/op-obsidian/src/modelRegistry.ts");

const REFERENCE_DIR = join(REPO_ROOT, "docs/workflow-modules/reference");

// Sentinel patterns reused by the balance pre-check and the replacement engine.
// A key is one or more word characters or hyphens: `[\w-]+`.
const SENTINEL_OPEN_RE = /<!-- AUTO-GENERATED:([\w-]+) -->/g;
const SENTINEL_CLOSE_RE = /<!-- \/AUTO-GENERATED:([\w-]+) -->/g;
const SENTINEL_BLOCK_RE = /<!-- AUTO-GENERATED:([\w-]+) -->([\s\S]*?)<!-- \/AUTO-GENERATED:\1 -->/g;

// ---------------------------------------------------------------------------
// Source extraction — pluginVarRegistry.ts
// ---------------------------------------------------------------------------

/**
 * Pull the `PARENT_NONE_SENTINEL` string constant verbatim. The constant is a
 * single-line literal — `export const PARENT_NONE_SENTINEL = "...";`.
 */
function extractParentNoneSentinel(src) {
  const m = src.match(/export const PARENT_NONE_SENTINEL\s*=\s*"((?:[^"\\]|\\.)*)";/);
  if (!m) {
    fail(
      `${rel(PLUGIN_VAR_REGISTRY_PATH)}: could not find \`export const PARENT_NONE_SENTINEL = "...";\`. ` +
        `If the constant was renamed, update this generator's extractParentNoneSentinel().`,
    );
  }
  return JSON.parse(`"${m[1]}"`);
}

/**
 * Walk the `PLUGIN_VAR_REGISTRY = Object.freeze({ … })` initializer and pull
 * one record per entry. Each entry has the literal shape:
 *
 *   <key>: {
 *     name: "...",
 *     description: "..." | `template ${WITH_INTERP}`,
 *     example: "...",
 *     compute: (ctx) => ...,
 *   },
 *
 * `description` may be a template-literal that interpolates a constant
 * (currently only `${PARENT_NONE_SENTINEL}`). The generator resolves the
 * known constants and renders the string verbatim. Unknown interpolations
 * are an error — the generator should never produce ambiguous output.
 */
function extractPluginVars(src, sentinels) {
  const startKey = /export const PLUGIN_VAR_REGISTRY[^=]*=\s*Object\.freeze\(\s*\{/;
  const startMatch = src.match(startKey);
  if (!startMatch) {
    fail(
      `${rel(PLUGIN_VAR_REGISTRY_PATH)}: could not find \`export const PLUGIN_VAR_REGISTRY = Object.freeze({\`. ` +
        `If the registry shape changed, update this generator's extractPluginVars().`,
    );
  }
  const startIdx = startMatch.index + startMatch[0].length;
  const block = sliceBalanced(src, startIdx - 1, "{", "}");

  const entries = [];
  // Match each entry: <name>: { name: "...", description: <str>, example: "...", compute: <expr>, },
  //
  // The trailing compute expression is a single arrow body. We don't need its
  // value — only the metadata fields. Conservative regex: `name`, `description`,
  // `example` keys with string-or-template-literal values, in that order.
  const entryRe =
    /(?<key>\w+)\s*:\s*\{\s*name\s*:\s*"(?<name>(?:[^"\\]|\\.)*)"\s*,\s*description\s*:\s*(?<descRaw>"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`)\s*,\s*example\s*:\s*"(?<example>(?:[^"\\]|\\.)*)"\s*,\s*compute\s*:/g;

  let m;
  while ((m = entryRe.exec(block)) !== null) {
    const description = renderStringOrTemplate(m.groups.descRaw, sentinels);
    entries.push({
      key: m.groups.key,
      name: JSON.parse(`"${m.groups.name}"`),
      description,
      example: JSON.parse(`"${m.groups.example}"`),
    });
  }

  // Count `compute:` occurrences in the block as a proxy for the number of
  // entries. Each entry has exactly one `compute:` field. If we captured fewer
  // entries than there are `compute:` fields, some entries were skipped because
  // their keys are in a different order — that's a silent partial failure that
  // the `entries.length === 0` guard alone would not catch.
  // Note: TypeScript object literals use bare (unquoted) property names, so
  // `compute:` always appears without quotes — the \b word boundary is correct.
  const computeCount = (block.match(/\bcompute\s*:/g) || []).length;
  if (entries.length === 0) {
    fail(
      `${rel(PLUGIN_VAR_REGISTRY_PATH)}: PLUGIN_VAR_REGISTRY parsed to zero entries — the regex no longer matches the source shape. ` +
        `Update extractPluginVars().`,
    );
  }
  if (entries.length < computeCount) {
    fail(
      `${rel(PLUGIN_VAR_REGISTRY_PATH)}: extracted ${entries.length} of ${computeCount} entries — ` +
        `some entries have keys in the wrong order (expected: name, description, example, compute). ` +
        `Reorder the keys or update extractPluginVars() if the registry shape changed.`,
    );
  }
  return entries;
}

/**
 * Render a JS string literal or backtick-template literal verbatim. Only the
 * named template-substitution constants in `subs` are honored; any other
 * `${…}` expression is an error so we never silently emit a broken table.
 */
function renderStringOrTemplate(raw, subs) {
  if (raw.startsWith('"')) {
    return JSON.parse(raw);
  }
  // Template literal: strip the backticks, walk char-by-char so backslash
  // escapes (`\``, `\\`, `\$`, `\n`, `\t`) are decoded the same way the JS
  // engine would and `${EXPR}` substitutions are resolved against `subs`.
  // Order matters: a raw-text replace pass would misinterpret an escaped
  // `\${literal}`. Walking eats one escape at a time and only treats an
  // unescaped `${…}` as a substitution.
  const inner = raw.slice(1, -1);
  let out = "";
  let i = 0;
  while (i < inner.length) {
    const c = inner[i];
    if (c === "\\" && i + 1 < inner.length) {
      const next = inner[i + 1];
      switch (next) {
        case "`":
        case "\\":
        case "$":
          out += next;
          break;
        case "n":
          out += "\n";
          break;
        case "t":
          out += "\t";
          break;
        case "r":
          out += "\r";
          break;
        default:
          // Unknown escape — fail loudly rather than passing through the raw
          // `\X` text, which would produce broken or misleading table content.
          // Either decode the escape in renderStringOrTemplate() or replace
          // the template literal with a plain string.
          fail(
            `${rel(PLUGIN_VAR_REGISTRY_PATH)}: unrecognized escape sequence \`\\${next}\` ` +
              `in template literal: ${JSON.stringify(raw)}. ` +
              `Add the escape to renderStringOrTemplate(), or replace the template with a plain string.`,
          );
      }
      i += 2;
      continue;
    }
    if (c === "$" && inner[i + 1] === "{") {
      const end = inner.indexOf("}", i + 2);
      if (end === -1) {
        fail(
          `${rel(PLUGIN_VAR_REGISTRY_PATH)}: unterminated \${…} substitution in template literal: ${JSON.stringify(raw)}.`,
        );
      }
      const name = inner.slice(i + 2, end).trim();
      if (!Object.prototype.hasOwnProperty.call(subs, name)) {
        fail(
          `${rel(PLUGIN_VAR_REGISTRY_PATH)}: template literal references \${${name}} but the generator does not know how to resolve it. ` +
            `Add it to the substitution map in extractPluginVars(), or replace the template with a plain string.`,
        );
      }
      out += subs[name];
      i = end + 1;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Source extraction — modelRegistry.ts
// ---------------------------------------------------------------------------

/**
 * Pull `{ <agent>: { aliases: { … }, versioned: <SET_NAME> } }` from
 * `MODEL_REGISTRY` and resolve each `versioned: SET_NAME` against the
 * top-level `const SET_NAME = new Set<string>([ … ])` declarations.
 */
function extractModelRegistry(src) {
  const versionedSets = extractVersionedSets(src);

  const startKey = /export const MODEL_REGISTRY[^=]*=\s*\{/;
  const startMatch = src.match(startKey);
  if (!startMatch) {
    fail(
      `${rel(MODEL_REGISTRY_PATH)}: could not find \`export const MODEL_REGISTRY = {\`. ` +
        `Update extractModelRegistry() if the registry shape changed.`,
    );
  }
  const startIdx = startMatch.index + startMatch[0].length;
  const block = sliceBalanced(src, startIdx - 1, "{", "}");

  // Per-agent records: <agent>: { aliases: { ... }, versioned: SET_NAME, },
  // The agent key may be a bare identifier (`claude`) or a quoted string
  // when the id contains characters TypeScript can't use unquoted, e.g.
  // hyphens (`"claude-ds"`).
  const agents = [];
  const agentRe =
    /(?:"(?<quotedAgent>[\w-]+)"|(?<bareAgent>\w+))\s*:\s*\{\s*aliases\s*:\s*\{(?<aliases>[^{}]*)\}\s*,\s*versioned\s*:\s*(?<setName>\w+)\s*,?\s*\}/g;

  let m;
  while ((m = agentRe.exec(block)) !== null) {
    const agent = m.groups.quotedAgent ?? m.groups.bareAgent;
    const aliasMap = parseAliasMap(m.groups.aliases, agent);
    const versioned = versionedSets[m.groups.setName];
    if (!versioned) {
      fail(
        `${rel(MODEL_REGISTRY_PATH)}: agent \`${agent}\` references versioned set \`${m.groups.setName}\` ` +
          `but no top-level \`const ${m.groups.setName} = new Set<string>([ … ])\` was found.`,
      );
    }
    agents.push({
      agent,
      aliases: aliasMap,
      versioned,
    });
  }

  // Count `versioned:` occurrences in the block as a proxy for the number of
  // agent entries. Each agent record has exactly one `versioned:` field.
  // Fewer captured agents than `versioned:` fields means a partial extraction
  // due to key ordering — the `agents.length === 0` guard alone misses this.
  // Note: TypeScript object literals use bare (unquoted) property names, so
  // `versioned:` always appears without quotes — the \b word boundary is correct.
  const versionedCount = (block.match(/\bversioned\s*:/g) || []).length;
  if (agents.length === 0) {
    fail(
      `${rel(MODEL_REGISTRY_PATH)}: MODEL_REGISTRY parsed to zero agents — the regex no longer matches the source shape. ` +
        `Update extractModelRegistry().`,
    );
  }
  if (agents.length < versionedCount) {
    fail(
      `${rel(MODEL_REGISTRY_PATH)}: extracted ${agents.length} of ${versionedCount} agents — ` +
        `some agent records have keys in the wrong order (expected: aliases, versioned). ` +
        `Reorder the keys or update extractModelRegistry() if the registry shape changed.`,
    );
  }
  return agents;
}

function extractVersionedSets(src) {
  const out = {};
  const re = /const\s+(\w+)\s*=\s*new Set<string>\(\s*\[([\s\S]*?)\]\s*\)/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const setName = m[1];
    const body = m[2];
    const ids = [];
    const idRe = /"((?:[^"\\]|\\.)*)"/g;
    let idMatch;
    while ((idMatch = idRe.exec(body)) !== null) {
      ids.push(JSON.parse(`"${idMatch[1]}"`));
    }
    out[setName] = ids;
  }
  return out;
}

function parseAliasMap(raw, agentForError) {
  const aliases = [];
  const re = /(\w+)\s*:\s*"((?:[^"\\]|\\.)*)"/g;
  let m;
  while ((m = re.exec(raw)) !== null) {
    aliases.push({ alias: m[1], canonical: JSON.parse(`"${m[2]}"`) });
  }
  if (aliases.length === 0) {
    fail(
      `${rel(MODEL_REGISTRY_PATH)}: agent \`${agentForError}\` has an empty or unparseable \`aliases:\` map.`,
    );
  }
  return aliases;
}

// ---------------------------------------------------------------------------
// Markdown rendering
// ---------------------------------------------------------------------------

function renderPluginVarsTable(entries, parentSentinel) {
  const lines = [];
  lines.push("| Variable | Example | Description |");
  lines.push("| :--- | :--- | :--- |");
  for (const e of entries) {
    lines.push(
      `| \`{{${e.name}}}\` | \`${escapeCell(e.example)}\` | ${escapeCell(e.description)} |`,
    );
  }
  lines.push("");
  lines.push(`Sentinel for an issue with no parent: **\`${escapeCell(parentSentinel)}\`** ` +
    `— emitted as the rendered value of \`{{parent}}\` when the issue's frontmatter has no \`parent:\` field.`);
  return lines.join("\n");
}

function renderModelRegistryTable(agents) {
  const lines = [];
  lines.push("| Agent | Aliases (alias → canonical) | Versioned ids |");
  lines.push("| :--- | :--- | :--- |");
  for (const a of agents) {
    const aliases = a.aliases.length
      ? a.aliases.map((x) => `\`${x.alias}\` → \`${x.canonical}\``).join("<br>")
      : "_(none)_";
    const versioned = a.versioned.length
      ? a.versioned.map((v) => `\`${v}\``).join("<br>")
      : "_(none)_";
    lines.push(`| \`${a.agent}\` | ${aliases} | ${versioned} |`);
  }
  return lines.join("\n");
}

function escapeCell(s) {
  // Escape in HTML-safe order: & first, then < and >, then Markdown chars.
  // If & were last, a description containing e.g. "&lt;" would become
  // "&amp;lt;" (double-escaped) instead of the expected "&amp;lt;".
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("|", "\\|")
    .replaceAll("\n", " ");
}

// ---------------------------------------------------------------------------
// Sentinel-replacement engine
// ---------------------------------------------------------------------------

/**
 * Rewrite every `<!-- AUTO-GENERATED:<key> -->...<!-- /AUTO-GENERATED:<key> -->`
 * block in `pages` using the rendered content from `blocks[key]`. Throws if a
 * page has unmatched markers, an unknown key, or no markers at all.
 *
 * Returns the list of (path, before, after) so the caller can summarise
 * what changed.
 */
function rewritePages(pages, blocks) {
  const summary = [];
  for (const path of pages) {
    const before = readFileSync(path, "utf8");
    const after = rewriteOnePage(path, before, blocks);
    if (before !== after) {
      writeFileSync(path, after, "utf8");
    }
    summary.push({ path, changed: before !== after });
  }
  return summary;
}

function rewriteOnePage(path, content, blocks) {
  // Pre-check: every open sentinel must have a matching close and vice versa.
  // The replacement regex below only matches complete open/close pairs, so an
  // open marker without a close is silently skipped — unless we check here.
  const balance = {};
  for (const m of content.matchAll(new RegExp(SENTINEL_OPEN_RE.source, "g")))
    balance[m[1]] = (balance[m[1]] || 0) + 1;
  for (const m of content.matchAll(new RegExp(SENTINEL_CLOSE_RE.source, "g")))
    balance[m[1]] = (balance[m[1]] || 0) - 1;
  for (const [key, delta] of Object.entries(balance)) {
    if (delta !== 0) {
      const dir = delta > 0 ? "open marker without a matching close" : "close marker without a matching open";
      fail(`${rel(path)}: AUTO-GENERATED:${key} has an unmatched ${dir}.`);
    }
  }

  const re = new RegExp(SENTINEL_BLOCK_RE.source, "g");
  let found = 0;
  const seen = new Set();
  const out = content.replace(re, (full, key) => {
    found++;
    if (seen.has(key)) {
      fail(`${rel(path)}: AUTO-GENERATED:${key} appears more than once. Each key must appear at most once per page.`);
    }
    seen.add(key);
    if (!Object.prototype.hasOwnProperty.call(blocks, key)) {
      fail(
        `${rel(path)}: unknown AUTO-GENERATED key \`${key}\`. Known keys: ${Object.keys(blocks).join(", ") || "(none)"}.`,
      );
    }
    return `<!-- AUTO-GENERATED:${key} -->\n${blocks[key]}\n<!-- /AUTO-GENERATED:${key} -->`;
  });
  if (found === 0) {
    fail(
      `${rel(path)}: no AUTO-GENERATED sentinels found. Each managed page needs at least one ` +
        `<!-- AUTO-GENERATED:<key> -->...<!-- /AUTO-GENERATED:<key> --> block. ` +
        `If this page is not meant to carry generated content, remove it from the PAGES list in scripts/check-workflow-docs.mjs.`,
    );
  }
  return out;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Find the matching closing brace for the opening brace at `openIdx` and
 * return the slice between them, exclusive of the braces. Walks character-by-
 * character so it survives nested braces inside the literal.
 *
 * Strings (single, double, backtick) and line/block comments are skipped so
 * a `}` inside `"foo}"` doesn't terminate the scan.
 */
function sliceBalanced(src, openIdx, openCh, closeCh) {
  if (src[openIdx] !== openCh) {
    fail(`Internal error: sliceBalanced expected '${openCh}' at index ${openIdx}, got '${src[openIdx]}'.`);
  }
  let depth = 0;
  let i = openIdx;
  let inString = null; // '"' | "'" | "`" | null
  let templateDepth = 0;
  while (i < src.length) {
    const c = src[i];
    const c2 = src[i + 1];

    if (inString === null) {
      // Skip line comments.
      if (c === "/" && c2 === "/") {
        const nl = src.indexOf("\n", i + 2);
        i = nl === -1 ? src.length : nl + 1;
        continue;
      }
      // Skip block comments.
      if (c === "/" && c2 === "*") {
        const end = src.indexOf("*/", i + 2);
        i = end === -1 ? src.length : end + 2;
        continue;
      }
      if (c === '"' || c === "'" || c === "`") {
        inString = c;
        i++;
        continue;
      }
      if (c === openCh) {
        depth++;
        i++;
        continue;
      }
      if (c === closeCh) {
        depth--;
        if (depth === 0) {
          return src.slice(openIdx + 1, i);
        }
        i++;
        continue;
      }
      i++;
      continue;
    }

    // Inside a string.
    if (c === "\\") {
      i += 2;
      continue;
    }
    if (inString === "`" && c === "$" && c2 === "{") {
      // Template substitution: `…${expr}…`
      // Walk until the matching `}` (these don't count toward our outer depth).
      templateDepth++;
      i += 2;
      while (templateDepth > 0 && i < src.length) {
        if (src[i] === "{") templateDepth++;
        else if (src[i] === "}") templateDepth--;
        i++;
      }
      continue;
    }
    if (c === inString) {
      inString = null;
      i++;
      continue;
    }
    i++;
  }
  fail(`Internal error: sliceBalanced ran off the end of the source without finding a matching '${closeCh}'.`);
}

function rel(p) {
  return relative(REPO_ROOT, p);
}

function fail(message) {
  console.error(`check-workflow-docs: ${message}`);
  process.exit(2);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const pluginVarSrc = readFileSync(PLUGIN_VAR_REGISTRY_PATH, "utf8");
  const modelSrc = readFileSync(MODEL_REGISTRY_PATH, "utf8");

  const parentSentinel = extractParentNoneSentinel(pluginVarSrc);
  const pluginVars = extractPluginVars(pluginVarSrc, {
    PARENT_NONE_SENTINEL: parentSentinel,
  });
  const modelAgents = extractModelRegistry(modelSrc);

  const blocks = {
    "plugin-vars-table": renderPluginVarsTable(pluginVars, parentSentinel),
    "model-registry-table": renderModelRegistryTable(modelAgents),
  };

  // Pages that carry one or more sentinel blocks. Adding a new managed page:
  // create the file, drop in the sentinel pair(s), and append the path here.
  const pages = [
    join(REFERENCE_DIR, "plugin-vars.md"),
    join(REFERENCE_DIR, "workflow-schema.md"),
  ];

  const summary = rewritePages(pages, blocks);
  for (const s of summary) {
    const tag = s.changed ? "wrote" : "unchanged";
    console.log(`${tag} ${rel(s.path)}`);
  }

  if (checkMode) {
    runCheckGuard(pages);
  }
}

function runCheckGuard(pages) {
  const relPaths = pages.map(rel);
  let diff;
  try {
    diff = execFileSync("git", ["diff", "--", ...relPaths], {
      cwd: REPO_ROOT,
      encoding: "utf8",
    });
  } catch (e) {
    fail(`git diff failed: ${e.message}`);
  }
  if (diff.trim().length > 0) {
    console.error("");
    console.error("Reference docs are stale. The auto-generated tables in these pages drifted from the registry sources:");
    console.error("");
    for (const p of relPaths) {
      console.error(`  - ${p}`);
    }
    console.error("");
    console.error("Fix:");
    console.error("  node scripts/check-workflow-docs.mjs");
    console.error("  git add docs/workflow-modules/reference/");
    console.error("  git commit -m '<your subject>'");
    console.error("");
    console.error("--- diff ---");
    console.error(diff);
    process.exit(1);
  }
  console.log("workflow-docs check: ok");
}

main();
