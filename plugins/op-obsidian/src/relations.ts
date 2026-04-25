// Pure relation registry + frontmatter mutators for two-way issue linking.
//
// No `obsidian` imports — operates on plain `Record<string, unknown>` copies of
// frontmatter so the logic can be unit-tested without a vault. The
// obsidian-bound `applyLink`/`removeLink`/`linkCheck`/`migrateLinks` glue in
// `links.ts` calls these and turns the returned deltas into
// `app.fileManager.processFrontMatter` writes.
//
// Adding a new relation is a config-only change: append an entry to
// `RELATIONS` and wire it into the schema doc. The verb surface (`op-set-link`,
// etc.) takes the relation name as a parameter and consults the registry, so
// no command-side code needs to change.

export type RelationName =
  | "parent"
  | "children"
  | "depends_on"
  | "depended_on_by"
  | "related_to";

export type Cardinality = "many-to-one" | "many-to-many";

export interface RelationDef {
  /** Canonical field name on the source issue. */
  name: RelationName;
  /** Field name on the target issue that mirrors this relation. */
  inverse: RelationName;
  /**
   * Pair-level cardinality. `many-to-one` means there is a scalar side
   * (`parent`) and a list side (`children`) — exactly one inverse slot, with
   * cleanup-of-old-holder semantics on reassignment. `many-to-many` means both
   * sides are lists with idempotent append/remove.
   */
  cardinality: Cardinality;
  /** Is this field stored as a list (`children`) or scalar (`parent`)? */
  isList: boolean;
  /** Is the inverse field stored as a list? */
  inverseIsList: boolean;
}

export const RELATIONS: Record<RelationName, RelationDef> = {
  parent: {
    name: "parent",
    inverse: "children",
    cardinality: "many-to-one",
    isList: false,
    inverseIsList: true,
  },
  children: {
    name: "children",
    inverse: "parent",
    cardinality: "many-to-one",
    isList: true,
    inverseIsList: false,
  },
  depends_on: {
    name: "depends_on",
    inverse: "depended_on_by",
    cardinality: "many-to-many",
    isList: true,
    inverseIsList: true,
  },
  depended_on_by: {
    name: "depended_on_by",
    inverse: "depends_on",
    cardinality: "many-to-many",
    isList: true,
    inverseIsList: true,
  },
  related_to: {
    name: "related_to",
    inverse: "related_to",
    cardinality: "many-to-many",
    isList: true,
    inverseIsList: true,
  },
};

export const RELATION_NAMES: RelationName[] = Object.keys(RELATIONS) as RelationName[];

export function isRelationName(v: unknown): v is RelationName {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(RELATIONS, v);
}

export function getRelation(name: string): RelationDef {
  if (!isRelationName(name)) {
    throw new Error(
      `Unknown relation "${name}". Known: ${RELATION_NAMES.join(", ")}`,
    );
  }
  return RELATIONS[name];
}

export interface ValidateLinkInput {
  srcId: string;
  dstId: string;
  relation: string;
}

export function validateLinkArgs(input: ValidateLinkInput): {
  srcId: string;
  dstId: string;
  relation: RelationDef;
} {
  const srcId = input.srcId?.trim();
  const dstId = input.dstId?.trim();
  if (!srcId) throw new Error("srcId is required");
  if (!dstId) throw new Error("dstId is required");
  if (srcId === dstId) {
    throw new Error(`Cannot link issue to itself: ${srcId}`);
  }
  const relation = getRelation(input.relation);
  return { srcId, dstId, relation };
}

/**
 * Cleanup directive returned by `computeApply` when a many-to-one reassignment
 * orphans a previous holder. The obsidian-bound caller looks up the holder
 * issue, opens its frontmatter, and removes `remove` from its `field` list.
 */
export interface Cleanup {
  /** Issue id whose frontmatter needs the cleanup write. */
  holderId: string;
  /** List field on the holder to remove from (always the inverse list). */
  field: RelationName;
  /** Id to remove from that list. */
  remove: string;
}

export interface ApplyResult {
  srcFmNext: Record<string, unknown>;
  dstFmNext: Record<string, unknown>;
  /** True when either fm changed; false on a fully idempotent re-apply. */
  changed: boolean;
  cleanups: Cleanup[];
}

/**
 * Compute the two-sided delta for `op-set-link srcId relation→dstId`.
 *
 * Returns the next frontmatter for both files plus any cleanup directives the
 * caller must apply (used when a many-to-one reassignment orphans a previous
 * holder). The function does not mutate its inputs.
 *
 * Symmetric relations (`related_to ↔ related_to`) are handled without
 * double-writing: `srcFmNext` and `dstFmNext` are independent copies even
 * though they carry the same field name, so each side gets exactly one append
 * of the other's id.
 */
export function computeApply(input: {
  srcFm: Record<string, unknown>;
  dstFm: Record<string, unknown>;
  srcId: string;
  dstId: string;
  relation: string;
}): ApplyResult {
  const { srcId, dstId, relation } = validateLinkArgs(input);
  const srcFmNext = shallowClone(input.srcFm);
  const dstFmNext = shallowClone(input.dstFm);
  const cleanups: Cleanup[] = [];
  let changed = false;

  // Source side: srcId.<relation.name> ← dstId
  if (relation.isList) {
    if (addToList(srcFmNext, relation.name, dstId)) changed = true;
  } else {
    const before = readScalar(srcFmNext, relation.name);
    if (before !== dstId) {
      if (before && before !== dstId) {
        // Reparent: the old holder of the scalar relationship needs its
        // inverse list trimmed of srcId. (e.g. set parent=Y_NEW on X — X used
        // to have parent=Y_OLD, so Y_OLD.children must drop X.)
        cleanups.push({ holderId: before, field: relation.inverse, remove: srcId });
      }
      srcFmNext[relation.name] = dstId;
      changed = true;
    }
  }

  // Target side: dstId.<relation.inverse> ← srcId
  if (relation.inverseIsList) {
    if (addToList(dstFmNext, relation.inverse, srcId)) changed = true;
  } else {
    const before = readScalar(dstFmNext, relation.inverse);
    if (before !== srcId) {
      if (before && before !== srcId) {
        cleanups.push({ holderId: before, field: relation.name, remove: dstId });
      }
      dstFmNext[relation.inverse] = srcId;
      changed = true;
    }
  }

  return { srcFmNext, dstFmNext, changed, cleanups };
}

export interface RemoveResult {
  srcFmNext: Record<string, unknown>;
  dstFmNext: Record<string, unknown>;
  /** True when either fm changed; false on a no-op (link wasn't present). */
  changed: boolean;
}

/**
 * Compute the two-sided delta for `op-remove-link srcId relation→dstId`.
 *
 * Idempotent: removing a link that isn't there returns `changed: false` and
 * the original fms unchanged. Cleanup of orphans is not applicable here — the
 * caller is removing a known pair, and its inverse on the other file is the
 * only other write.
 */
export function computeRemove(input: {
  srcFm: Record<string, unknown>;
  dstFm: Record<string, unknown>;
  srcId: string;
  dstId: string;
  relation: string;
}): RemoveResult {
  const { srcId, dstId, relation } = validateLinkArgs(input);
  const srcFmNext = shallowClone(input.srcFm);
  const dstFmNext = shallowClone(input.dstFm);
  let changed = false;

  if (relation.isList) {
    if (removeFromList(srcFmNext, relation.name, dstId)) changed = true;
  } else {
    if (readScalar(srcFmNext, relation.name) === dstId) {
      delete srcFmNext[relation.name];
      changed = true;
    }
  }

  if (relation.inverseIsList) {
    if (removeFromList(dstFmNext, relation.inverse, srcId)) changed = true;
  } else {
    if (readScalar(dstFmNext, relation.inverse) === srcId) {
      delete dstFmNext[relation.inverse];
      changed = true;
    }
  }

  return { srcFmNext, dstFmNext, changed };
}

export interface DriftEntry {
  issueId: string;
  relation: RelationName;
  target: string;
  /**
   * `missing-inverse`: target exists, but its inverse field doesn't list
   * `issueId`. Repairable by re-applying the link.
   * `dangling-target`: target id doesn't resolve to any known issue. Not
   * auto-repairable — surfaced so the user can fix it manually.
   */
  problem: "missing-inverse" | "dangling-target";
}

/**
 * Walk every issue's link fields and report any one-sided drift.
 *
 * `issuesById` is a snapshot keyed by canonical id (`OP-12` etc.); the value
 * is the issue's frontmatter. Both `ISSUES/` and `RESOLVED ISSUES/` should be
 * included by the caller — a child can resolve before its parent and the
 * parent→child link must remain valid.
 */
export function scanDrift(
  issuesById: Map<string, Record<string, unknown>>,
): DriftEntry[] {
  const drift: DriftEntry[] = [];
  for (const [id, fm] of issuesById.entries()) {
    for (const relName of RELATION_NAMES) {
      const def = RELATIONS[relName];
      const targets = readField(fm, relName, def.isList);
      for (const target of targets) {
        if (target === id) {
          // Self-link in stored data — treat as drift on the stored side. The
          // inverse direction would also report it; dedupe at the caller if
          // needed.
          drift.push({
            issueId: id,
            relation: relName,
            target,
            problem: "dangling-target",
          });
          continue;
        }
        const targetFm = issuesById.get(target);
        if (!targetFm) {
          drift.push({
            issueId: id,
            relation: relName,
            target,
            problem: "dangling-target",
          });
          continue;
        }
        const inverseTargets = readField(targetFm, def.inverse, def.inverseIsList);
        if (!inverseTargets.includes(id)) {
          drift.push({
            issueId: id,
            relation: relName,
            target,
            problem: "missing-inverse",
          });
        }
      }
    }
  }
  return drift;
}

export interface MigrateResult {
  fmNext: Record<string, unknown>;
  /** True when the fm was rewritten (including pure key removal). */
  changed: boolean;
  /** Human-readable per-key notes for the caller's report. */
  diff: string[];
}

/**
 * Rewrite the interim `parent_issue` / `subissues` keys to the canonical
 * `parent` / `children`. Idempotent: an fm with no interim keys returns
 * `changed: false` and no diff.
 *
 * Conflict resolution: if both interim and canonical keys are present, the
 * canonical key wins for scalars and is union-merged for lists. Either way
 * the interim key is removed.
 */
export function computeMigrate(fm: Record<string, unknown>): MigrateResult {
  const fmNext = shallowClone(fm);
  const diff: string[] = [];
  let changed = false;

  if ("parent_issue" in fmNext) {
    const v = fmNext.parent_issue;
    if (typeof v === "string" && v.length > 0) {
      const existing = readScalar(fmNext, "parent");
      if (!existing) {
        fmNext.parent = v;
        diff.push(`parent_issue → parent (${v})`);
      } else if (existing === v) {
        diff.push(`parent_issue=${v} dropped (parent already canonical)`);
      } else {
        diff.push(
          `parent_issue=${v} dropped (parent already set to ${existing} — kept canonical)`,
        );
      }
    }
    delete fmNext.parent_issue;
    changed = true;
  }

  if ("subissues" in fmNext) {
    const v = fmNext.subissues;
    const items = Array.isArray(v)
      ? v.filter((x): x is string => typeof x === "string" && x.length > 0)
      : [];
    if (items.length > 0) {
      const existing = readField(fmNext, "children", true);
      const merged = uniq([...existing, ...items]);
      if (existing.length === 0) {
        fmNext.children = merged;
        diff.push(`subissues → children (${items.join(", ")})`);
      } else {
        const added = items.filter((i) => !existing.includes(i));
        if (added.length > 0) {
          fmNext.children = merged;
          diff.push(`subissues merged into children: +${added.join(", ")}`);
        } else {
          diff.push(
            `subissues=[${items.join(", ")}] dropped (children already covers all)`,
          );
        }
      }
    }
    delete fmNext.subissues;
    changed = true;
  }

  return { fmNext, changed, diff };
}

// ---------- internal helpers ----------

function shallowClone(fm: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fm)) {
    next[k] = Array.isArray(v) ? [...v] : v;
  }
  return next;
}

function readScalar(fm: Record<string, unknown>, key: string): string | undefined {
  const v = fm[key];
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

function readField(
  fm: Record<string, unknown>,
  name: string,
  isList: boolean,
): string[] {
  const v = fm[name];
  if (isList) {
    if (!Array.isArray(v)) return [];
    return v.filter((x): x is string => typeof x === "string" && x.length > 0);
  }
  if (typeof v === "string" && v.length > 0) return [v];
  return [];
}

function addToList(
  fm: Record<string, unknown>,
  key: string,
  value: string,
): boolean {
  const current = Array.isArray(fm[key])
    ? (fm[key] as unknown[]).filter((x): x is string => typeof x === "string" && x.length > 0)
    : [];
  if (current.includes(value)) {
    // Normalize: if the underlying value wasn't already a clean string list,
    // rewrite to the cleaned form so subsequent reads are deterministic.
    if (!Array.isArray(fm[key]) || (fm[key] as unknown[]).length !== current.length) {
      fm[key] = current;
      return true;
    }
    return false;
  }
  fm[key] = [...current, value];
  return true;
}

function removeFromList(
  fm: Record<string, unknown>,
  key: string,
  value: string,
): boolean {
  const current = Array.isArray(fm[key])
    ? (fm[key] as unknown[]).filter((x): x is string => typeof x === "string" && x.length > 0)
    : [];
  const idx = current.indexOf(value);
  if (idx === -1) return false;
  const next = current.filter((x) => x !== value);
  if (next.length === 0) {
    delete fm[key];
  } else {
    fm[key] = next;
  }
  return true;
}

function uniq<T>(xs: T[]): T[] {
  const seen = new Set<T>();
  const out: T[] = [];
  for (const x of xs) {
    if (!seen.has(x)) {
      seen.add(x);
      out.push(x);
    }
  }
  return out;
}
