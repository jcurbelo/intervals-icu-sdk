#!/usr/bin/env bun
/**
 * Summarize what changed between two snapshots of the upstream OpenAPI spec,
 * as Markdown. The Spec drift workflow uses this for the body of the pull
 * request it opens; it is also handy locally after `bun run spec`:
 *
 *   git show HEAD:spec/intervals-openapi.json > /tmp/old.json
 *   bun scripts/spec-drift-report.ts /tmp/old.json spec/intervals-openapi.json
 */

export {};

type Spec = {
  paths?: Record<string, unknown>;
  components?: { schemas?: Record<string, { properties?: Record<string, unknown> }> };
};

const [oldPath, newPath] = process.argv.slice(2);
if (!oldPath || !newPath) {
  console.error("usage: bun scripts/spec-drift-report.ts <old-spec.json> <new-spec.json>");
  process.exit(2);
}

const oldSpec = (await Bun.file(oldPath).json()) as Spec;
const newSpec = (await Bun.file(newPath).json()) as Spec;

function compare(before: Record<string, unknown> = {}, after: Record<string, unknown> = {}) {
  const added = Object.keys(after).filter((k) => !Object.hasOwn(before, k));
  const removed = Object.keys(before).filter((k) => !Object.hasOwn(after, k));
  const changed = Object.keys(after).filter(
    (k) => Object.hasOwn(before, k) && JSON.stringify(before[k]) !== JSON.stringify(after[k]),
  );
  return { added, removed, changed };
}

const code = (s: string) => `\`${s}\``;
const list = (keys: string[]) => (keys.length === 0 ? "none" : keys.map(code).join(", "));

const paths = compare(oldSpec.paths, newSpec.paths);
const oldSchemas = oldSpec.components?.schemas ?? {};
const newSchemas = newSpec.components?.schemas ?? {};
const schemas = compare(oldSchemas, newSchemas);

const out: string[] = [];
out.push("### Paths");
out.push(`- Added: ${list(paths.added)}`);
out.push(`- Removed: ${list(paths.removed)}`);
out.push(`- Changed: ${list(paths.changed)}`);
out.push("");
out.push("### Schemas");
out.push(`- Added: ${list(schemas.added)}`);
out.push(`- Removed: ${list(schemas.removed)}`);
out.push(`- Changed: ${list(schemas.changed)}`);
for (const name of schemas.changed) {
  const props = compare(oldSchemas[name]?.properties, newSchemas[name]?.properties);
  const bits = [
    ...props.added.map((k) => `+${k}`),
    ...props.removed.map((k) => `-${k}`),
    ...props.changed.map((k) => `~${k}`),
  ];
  out.push(
    `  - ${code(name)}: ${bits.length ? bits.map(code).join(", ") : "no property added/removed/retyped (reorder or nested change)"}`,
  );
}
console.log(out.join("\n"));
