#!/usr/bin/env bun
/**
 * Normalize the Intervals.icu OpenAPI spec for SDK generation.
 *
 * The upstream spec (https://intervals.icu/api/v1/docs) is springdoc output with
 * a few quirks that hurt generated-SDK ergonomics:
 *
 *  1. Partial-segment path params such as `/wellness{ext}` and `/events{format}`,
 *     where the param toggles JSON ("") vs CSV (".csv"). SDK callers want JSON,
 *     and an empty-string path param fails client-side validation in most
 *     generators. For JSON-listing endpoints we strip the param and merge the
 *     operation into the bare path. For workout-file downloads the param is
 *     semantic (.zwo/.mrc/.erg/.fit) and is kept.
 *
 *  2. multipart uploads declared under `application/json` with a binary `file`
 *     property. We re-home the schema under `multipart/form-data`.
 *
 *  3. Response content under the wildcard ("star/star") media type. We rename it
 *     to `application/json`; every such response carries a JSON schema.
 *
 *  4. springdoc de-dupes clashing Java method names with `_1`/`_2` suffixes
 *     (`updateWellness_1`, `listTags_2`). Generators turn operationIds into
 *     function names, so we rename them to human names.
 *
 * The script fails loudly when the upstream spec drifts in ways it does not
 * recognize, so CI catches new endpoints or renames instead of silently
 * producing a wrong SDK.
 *
 * Usage:  bun spec/normalize.ts [--fetch]
 *   --fetch  re-download the upstream spec before normalizing
 */

const SPEC_URL = "https://intervals.icu/api/v1/docs";
const DIR = new URL(".", import.meta.url).pathname;
const SRC = `${DIR}intervals-openapi.json`;
const OUT = `${DIR}intervals-openapi.normalized.json`;

// {ext}/{format} handling, keyed by operationId. Every {ext}/{format} path must be
// covered by one of these lists; the script fails on anything new upstream.
const STRIP_EXT_OPS = new Set([
  // athlete-level listings (JSON by default, ".csv" variant for humans)
  "listWellnessRecords",
  "listGear",
  "listEvents",
  "getAthleteSummary",
  "listAthletePowerCurves",
  "listAthletePaceCurves",
  "listAthleteHRCurves",
  "listActivityPowerCurves",
  "listActivityPaceCurves",
  "listActivityHRCurves",
  // activity-level charts/streams
  "getActivityStreams",
  "listActivityPowerCurves_1",
  "getActivityPowerCurve",
  "getActivityPaceCurve",
  "getActivityHRCurve",
  "getPowerVsHR",
]);
const KEEP_EXT_OPS = new Set([
  // ext is the requested file format (.zwo/.mrc/.erg/.fit)
  "downloadWorkout",
  "downloadWorkoutForAthlete",
  "downloadWorkout_1",
]);

// operationId renames: springdoc suffixes to human function names.
const RENAME_OPS: Record<string, string> = {
  updateWellness_1: "updateWellnessRecord", // PUT /wellness (date inside body) vs /wellness/{date}
  listTags: "listWorkoutTags",
  listTags_1: "listEventTags",
  listTags_2: "listActivityTags",
  downloadWorkout_1: "downloadEventWorkout", // GET /events/{eventId}/download{ext}
  getSettings: "getDeviceSettings", // /athlete/{id}/settings/{deviceClass}
  getSettings_1: "getSportSettings",
  updateSettings: "updateSportSettings",
  updateSettingsMulti: "updateSportSettingsMulti",
  createSettings: "createSportSettings",
  deleteSettings: "deleteSportSettings",
  listSettings: "listSportSettings",
  listActivityPowerCurves_1: "getActivityPowerCurves", // /activity/{id}/power-curves
};

// Query params springdoc marks required:true but the server actually defaults when
// omitted. Keyed by UPSTREAM operationId (before RENAME_OPS). Do not add entries
// without verification. Evidence per entry (2026-07-31):
// - createEvent.upsertOnUid: omitted for weeks in production use with correct
//   default (create, no upsert) behavior.
// - All others: requests omitting the params pass Spring parameter binding and
//   reach handler logic (domain 422/404 errors, not "required parameter missing"
//   400s), probed against the live API with zero-mutation requests.
const OPTIONAL_QUERY_PARAMS: Record<string, string[]> = {
  createEvent: ["upsertOnUid"],
  createMultipleEvents: ["upsertOnUid", "updatePlanApplied"],
  updateReminder: ["reset", "snoozeDays"],
  updateSettings: ["recalcHrZones"], // renamed to updateSportSettings afterwards
};

type Dict = Record<string, any>;

async function main() {
  if (process.argv.includes("--fetch")) {
    const res = await fetch(SPEC_URL);
    if (!res.ok) throw new Error(`fetch ${SPEC_URL} -> ${res.status}`);
    await Bun.write(SRC, await res.text());
    console.log(`fetched ${SPEC_URL} -> ${SRC}`);
  }

  const doc: Dict = JSON.parse(await Bun.file(SRC).text());
  const stats = { stripped: 0, merged: 0, kept: 0, multipart: 0, star: 0, renamed: 0, relaxed: 0 };
  const renamesSeen = new Set<string>();
  const relaxedSeen = new Set<string>();
  const methods = ["get", "put", "post", "delete", "patch"];

  // -- 1. {ext}/{format} paths ------------------------------------------------
  const newPaths: Dict = {};
  for (const [path, item] of Object.entries<Dict>(doc.paths)) {
    const m = path.match(/\{(ext|format)\}/);
    if (!m) {
      newPaths[path] = mergePathItem(newPaths[path], item, path);
      continue;
    }
    const param = m[1];
    const ops = methods.filter((v) => item[v]);
    const opIds = ops.map((v) => item[v].operationId as string);
    const strip = opIds.every((id) => STRIP_EXT_OPS.has(id));
    const keep = opIds.every((id) => KEEP_EXT_OPS.has(id));
    if (!strip && !keep) {
      throw new Error(
        `Unclassified {${param}} path ${path} (ops: ${opIds.join(",")}); update STRIP/KEEP lists`,
      );
    }
    if (keep) {
      stats.kept++;
      newPaths[path] = mergePathItem(newPaths[path], item, path);
      continue;
    }
    // strip: drop the param from every op, merge into the bare path
    const bare = path.replace(`{${param}}`, "");
    for (const v of ops) {
      const op = item[v];
      op.parameters = (op.parameters ?? []).filter(
        (p: Dict) => !(p.in === "path" && p.name === param),
      );
    }
    stats.stripped++;
    if (newPaths[bare] || doc.paths[bare]) stats.merged++;
    newPaths[bare] = mergePathItem(newPaths[bare] ?? doc.paths[bare], item, bare);
  }
  doc.paths = newPaths;

  // -- 2, 3, 4. per-operation fixes ------------------------------------------
  for (const item of Object.values<Dict>(doc.paths)) {
    for (const v of methods) {
      const op = item[v];
      if (!op) continue;
      // server-defaulted query params: required:true -> optional (upstream ids)
      for (const name of OPTIONAL_QUERY_PARAMS[op.operationId] ?? []) {
        const p = (op.parameters ?? []).find((q: Dict) => q.in === "query" && q.name === name);
        if (p?.required) {
          p.required = false;
          relaxedSeen.add(`${op.operationId}.${name}`);
          stats.relaxed++;
        }
      }
      // operationId renames
      if (op.operationId in RENAME_OPS) {
        renamesSeen.add(op.operationId);
        op.operationId = RENAME_OPS[op.operationId];
        stats.renamed++;
      }
      // multipart mislabeled as application/json
      const rb = op.requestBody?.content;
      if (rb?.["application/json"]?.schema?.properties?.file?.format === "binary") {
        const schema = rb["application/json"];
        op.requestBody.content = { "multipart/form-data": schema };
        stats.multipart++;
      }
      // wildcard responses -> application/json
      for (const resp of Object.values<Dict>(op.responses ?? {})) {
        const c = resp.content;
        if (c?.["*/*"]) {
          c["application/json"] = c["*/*"];
          delete c["*/*"];
          stats.star++;
        }
      }
    }
  }

  const unseen = Object.keys(RENAME_OPS).filter((k) => !renamesSeen.has(k));
  if (unseen.length)
    throw new Error(`RENAME_OPS entries not found upstream (spec drifted?): ${unseen.join(", ")}`);
  const expectedRelaxed = Object.entries(OPTIONAL_QUERY_PARAMS).flatMap(([id, names]) =>
    names.map((n) => `${id}.${n}`),
  );
  const unrelaxed = expectedRelaxed.filter((k) => !relaxedSeen.has(k));
  if (unrelaxed.length)
    throw new Error(
      `OPTIONAL_QUERY_PARAMS entries not found as required upstream (spec drifted?): ${unrelaxed.join(", ")}`,
    );

  await Bun.write(OUT, JSON.stringify(doc, null, 2) + "\n");
  const opCount = Object.values<Dict>(doc.paths).reduce(
    (n, item) => n + methods.filter((v) => item[v]).length,
    0,
  );
  console.log(
    `normalized -> ${OUT}\n` +
      `  paths: ${Object.keys(doc.paths).length}, operations: ${opCount}\n` +
      `  ext-params stripped: ${stats.stripped} (merged into existing paths: ${stats.merged}), kept: ${stats.kept}\n` +
      `  multipart fixed: ${stats.multipart}, wildcard responses -> json: ${stats.star}, operationIds renamed: ${stats.renamed}, required params relaxed: ${stats.relaxed}`,
  );
}

function mergePathItem(existing: Dict | undefined, incoming: Dict, path: string): Dict {
  if (!existing) return incoming;
  const merged = { ...existing };
  for (const [k, v] of Object.entries(incoming)) {
    if (["get", "put", "post", "delete", "patch"].includes(k)) {
      if (merged[k] && merged[k] !== v)
        throw new Error(`method collision merging ${k.toUpperCase()} ${path}`);
      merged[k] = v;
    } else if (!(k in merged)) {
      merged[k] = v;
    }
  }
  return merged;
}

await main();
