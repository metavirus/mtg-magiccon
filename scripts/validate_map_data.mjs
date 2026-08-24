import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const bannedRoutingKeys = new Set(["edges", "origin", "route_edges", "routes", "routing_graph", "transforms"]);

export function validateMapManifest(manifest) {
  const failures = [];
  const fail = (message) => failures.push(message);
  const uniqueIndex = (records, label) => {
    const index = new Map();
    for (const record of records) {
      if (!record?.id) fail(`${label} contains a record without an id`);
      else if (index.has(record.id)) fail(`${label} contains duplicate id ${record.id}`);
      else index.set(record.id, record);
    }
    return index;
  };
  const findBannedKeys = (value, path = "manifest") => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) return value.forEach((item, index) => findBannedKeys(item, `${path}[${index}]`));
    for (const [key, child] of Object.entries(value)) {
      if (bannedRoutingKeys.has(key)) fail(`${path}.${key} is parked routing data and cannot enter the active contract`);
      findBannedKeys(child, `${path}.${key}`);
    }
  };

  findBannedKeys(manifest);
  if (manifest.schema_version !== "1.0.0") fail("unsupported schema_version");
  if (!Array.isArray(manifest.levels) || manifest.levels.length === 0) fail("manifest needs at least one level");

  const levels = uniqueIndex(manifest.levels ?? [], "levels");
  const objects = uniqueIndex(manifest.objects ?? [], "objects");
  const sources = uniqueIndex(manifest.source_refs ?? [], "source_refs");
  uniqueIndex(manifest.bindings ?? [], "bindings");
  uniqueIndex(manifest.search_entries ?? [], "search_entries");

  const historical = manifest.edition_namespace?.startsWith("historical/");
  if (historical && manifest.status === "active") fail("historical namespaces cannot be active");
  if (manifest.status === "active" && manifest.edition_namespace !== `event/${manifest.event_key}`) {
    fail("active manifests must use the exact event namespace");
  }

  const requireSources = (record, label) => {
    if (!Array.isArray(record.source_ref_ids) || record.source_ref_ids.length === 0) {
      fail(`${label} has no source references`);
      return;
    }
    for (const sourceId of record.source_ref_ids) {
      const source = sources.get(sourceId);
      if (!source) fail(`${label} references missing source ${sourceId}`);
      else if (manifest.status === "active" && source.edition_namespace !== manifest.edition_namespace) {
        fail(`${label} uses cross-edition source ${sourceId}`);
      }
    }
  };

  for (const source of manifest.source_refs ?? []) {
    if (!source.edition_namespace) fail(`source ${source.id} has no edition namespace`);
    if (manifest.status === "active" && source.artifact_id?.includes("2025")) {
      fail(`active manifest contains historical artifact ${source.artifact_id}`);
    }
  }
  for (const level of manifest.levels ?? []) {
    if (level.parent_level_id && !levels.has(level.parent_level_id)) fail(`level ${level.id} has missing parent level`);
    requireSources(level, `level ${level.id}`);
  }
  for (const object of manifest.objects ?? []) {
    if (object.revision_id !== manifest.revision_id) fail(`object ${object.id} has a mixed revision`);
    if (!levels.has(object.level_id)) fail(`object ${object.id} references missing level ${object.level_id}`);
    if (object.parent_id) {
      const parent = objects.get(object.parent_id);
      if (!parent) fail(`object ${object.id} references missing parent ${object.parent_id}`);
      else if (parent.level_id !== object.level_id) fail(`object ${object.id} and its parent are on different levels`);
    }
    for (const childId of object.children_order ?? []) {
      const child = objects.get(childId);
      if (!child) fail(`object ${object.id} orders missing child ${childId}`);
      else if (child.parent_id !== object.id) fail(`object ${object.id} orders ${childId}, but that child does not point back to it`);
    }
    for (const accessPoint of object.access_points ?? []) {
      if (accessPoint.object_id !== object.id) fail(`access point ${accessPoint.id} belongs to the wrong object`);
    }
    if (object.geometry?.kind === "rect" &&
        (object.geometry.x + object.geometry.width > 1 || object.geometry.y + object.geometry.height > 1)) {
      fail(`object ${object.id} extends outside its normalized level`);
    }
    requireSources(object, `object ${object.id}`);
  }
  for (const object of manifest.objects ?? []) {
    const seen = new Set([object.id]);
    let parentId = object.parent_id;
    while (parentId) {
      if (seen.has(parentId)) { fail(`object containment cycle includes ${object.id}`); break; }
      seen.add(parentId);
      parentId = objects.get(parentId)?.parent_id;
    }
  }
  for (const binding of manifest.bindings ?? []) {
    if (binding.revision_id !== manifest.revision_id) fail(`binding ${binding.id} has a mixed revision`);
    const target = objects.get(binding.spatial_object_id);
    if (!target) fail(`binding ${binding.id} references missing spatial object`);
    const focus = binding.focus_object_id ? objects.get(binding.focus_object_id) : undefined;
    if (binding.focus_object_id && !focus) fail(`binding ${binding.id} references missing focus object`);
    if (focus && focus.id !== target?.id && focus.parent_id !== target?.id) fail(`binding ${binding.id} focus is not the target or its direct child`);
    if (binding.review_state === "reviewed" && target?.review_state !== "reviewed") fail(`reviewed binding ${binding.id} points to an unreviewed object`);
    requireSources(binding, `binding ${binding.id}`);
  }
  for (const entry of manifest.search_entries ?? []) {
    if (!objects.has(entry.spatial_object_id)) fail(`search entry ${entry.id} references missing spatial object`);
    if (entry.focus_object_id && !objects.has(entry.focus_object_id)) fail(`search entry ${entry.id} references missing focus object`);
    for (const term of entry.normalized_terms ?? []) {
      if (term !== term.trim().toLowerCase()) fail(`search entry ${entry.id} contains non-normalized term '${term}'`);
    }
  }
  if (manifest.status === "active") {
    for (const object of manifest.objects ?? []) if (object.review_state !== "reviewed") fail(`active manifest contains unreviewed object ${object.id}`);
    for (const binding of manifest.bindings ?? []) if (binding.review_state !== "reviewed") fail(`active manifest contains unresolved binding ${binding.id}`);
  }
  return failures;
}

async function runCli() {
  const fixturePath = resolve(process.argv[2] ?? "docs/map-data/fixtures/synthetic-show-floor.json");
  const manifest = JSON.parse(await readFile(fixturePath, "utf8"));
  const failures = validateMapManifest(manifest);
  if (failures.length) {
    console.error(`Map data validation failed (${failures.length}):`);
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(`Map data validation: PASS (${manifest.levels.length} level, ${manifest.objects.length} objects, ${manifest.bindings.length} binding, ${manifest.search_entries.length} search entries)`);
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await runCli();
