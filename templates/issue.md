<%*
const project = await tp.system.prompt("Project slug (e.g. jira-bases)");
if (!project) return;
const slug = await tp.system.prompt("Issue slug (e.g. fix login bug)");
if (!slug) return;

const issuesFolder = `Projects/${project}/ISSUES`;
const resolvedFolder = `Projects/${project}/RESOLVED ISSUES`;

const files = app.vault.getMarkdownFiles().filter(f =>
  f.path.startsWith(issuesFolder + "/") || f.path.startsWith(resolvedFolder + "/")
);

let maxN = 0;
let prefix = null;
for (const f of files) {
  const fm = app.metadataCache.getFileCache(f)?.frontmatter;
  const id = fm?.id;
  if (typeof id !== "string") continue;
  const m = id.match(/^([A-Z]+)-(\d+)$/);
  if (!m) continue;
  prefix = prefix ?? m[1];
  const n = parseInt(m[2], 10);
  if (n > maxN) maxN = n;
}

if (!prefix) {
  prefix = await tp.system.prompt("ID prefix for first issue (e.g. JB)");
  if (!prefix) return;
  prefix = prefix.toUpperCase();
}

const id = `${prefix}-${maxN + 1}`;
const today = tp.date.now("YYYY-MM-DD");
const heading = slug.charAt(0).toUpperCase() + slug.slice(1);
await tp.file.move(`${issuesFolder}/${id} ${slug}`);
-%>
---
id: <% id %>
project: <% project %>
type: issue
status: open
priority: med
created: <% today %>
assignee: earchibald
tags:
  - project/<% project %>
  - issue
---

# <% heading %>
