import { readFile } from "node:fs/promises";
import { validateMapManifest } from "./validate_map_data.mjs";

const base = JSON.parse(await readFile("docs/map-data/fixtures/synthetic-show-floor.json", "utf8"));
const cases = JSON.parse(await readFile("docs/map-data/fixtures/negative-cases.json", "utf8"));

function currentEditionFixture() {
  const fixture = structuredClone(base);
  fixture.map_id = "atlanta-2026-test-only";
  fixture.event_key = "atlanta-2026";
  fixture.edition_namespace = "event/atlanta-2026";
  fixture.status = "active";
  fixture.source_refs.forEach((source) => { source.edition_namespace = "event/atlanta-2026"; });
  return fixture;
}

function setPath(target, path, value) {
  const parts = path.split(".");
  const final = parts.pop();
  let cursor = target;
  for (const part of parts) cursor = cursor[part];
  cursor[final] = value;
}

const cleanFailures = validateMapManifest(currentEditionFixture());
if (cleanFailures.length) {
  console.error("The clean future-edition control fixture failed:");
  cleanFailures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

let failedCases = 0;
for (const testCase of cases) {
  const fixture = currentEditionFixture();
  for (const [path, value] of Object.entries(testCase.set)) setPath(fixture, path, value);
  const failures = validateMapManifest(fixture);
  if (!failures.some((failure) => failure.includes(testCase.expects))) {
    failedCases += 1;
    console.error(`FAIL ${testCase.id}: expected '${testCase.expects}', received ${JSON.stringify(failures)}`);
  } else {
    console.log(`PASS ${testCase.id}`);
  }
}

if (failedCases) process.exit(1);
console.log(`Map guard tests: PASS (${cases.length} unsafe cases rejected; clean future-edition control accepted)`);
