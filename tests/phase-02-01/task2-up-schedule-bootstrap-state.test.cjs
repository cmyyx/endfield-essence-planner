const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const manifestPath = path.join(root, "js/app.resource-manifest.js");
const bootstrapSource = read("js/bootstrap.entry.js");
const bootstrapResourcesSource = read("js/bootstrap.resources.js");
const appCoreSource = read("js/app.core.js");
const appStateSource = read("js/app.state.js");
const manifest = require(manifestPath);

assert.equal(fs.existsSync(manifestPath), true, "js/app.resource-manifest.js should exist");
assert.equal(Array.isArray(manifest.boot && manifest.boot.data), true, "manifest boot.data should exist");
assert.equal(
  manifest.boot.data.includes("./data/up-schedules.js"),
  true,
  "manifest boot.data should include ./data/up-schedules.js"
);

assert.match(
  bootstrapSource,
  /__BOOTSTRAP_RESOURCES__/,
  "bootstrap should consume bootstrap.resources as startup resource source boundary"
);
assert.match(
  bootstrapResourcesSource,
  /__APP_RESOURCE_MANIFEST/,
  "bootstrap.resources should consume window.__APP_RESOURCE_MANIFEST as startup resource source"
);
assert.match(
  bootstrapSource,
  /startupDataScripts\.map\(\s*function\s*\(src\)\s*\{\s*return\s+loadScript\(src\);\s*\}\s*\)/,
  "bootstrap data loading should consume startupDataScripts from manifest"
);

assert.match(
  appCoreSource,
  /const\s+weaponUpSchedules\s*=\s*/,
  "app.core should expose weaponUpSchedules runtime reference"
);

assert.match(
  appStateSource,
  /state\.upScheduleRawSource\s*=/,
  "app.state should define up schedule raw state slot"
);
assert.match(
  appStateSource,
  /state\.upScheduleNormalized\s*=/,
  "app.state should define up schedule normalized state slot"
);
assert.match(
  appStateSource,
  /state\.upScheduleIssues\s*=/,
  "app.state should define up schedule issues state slot"
);

console.log("task2-up-schedule-bootstrap-state: ok");
