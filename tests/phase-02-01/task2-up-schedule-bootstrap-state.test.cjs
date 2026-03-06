const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const manifestPath = path.join(root, "js/app.resource-manifest.js");
const bootstrapPath = path.join(root, "js/bootstrap.entry.js");
const bootstrapResourcesPath = path.join(root, "js/bootstrap.resources.js");
const appCorePath = path.join(root, "js/app.core.js");
const appStatePath = path.join(root, "js/app.state.js");

assert.equal(fs.existsSync(manifestPath), true, "js/app.resource-manifest.js should exist");
assert.equal(fs.existsSync(bootstrapPath), true, "js/bootstrap.entry.js should exist");
assert.equal(fs.existsSync(bootstrapResourcesPath), true, "js/bootstrap.resources.js should exist");
assert.equal(fs.existsSync(appCorePath), true, "js/app.core.js should exist");
assert.equal(fs.existsSync(appStatePath), true, "js/app.state.js should exist");

const bootstrapSource = read("js/bootstrap.entry.js");
const bootstrapResourcesSource = read("js/bootstrap.resources.js");
const appCoreSource = read("js/app.core.js");
const appStateSource = read("js/app.state.js");
const manifest = require(manifestPath);

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

const bootstrapResourcesSandbox = {
  window: {
    __APP_RESOURCE_MANIFEST: manifest,
  },
};
vm.runInNewContext(bootstrapResourcesSource, bootstrapResourcesSandbox, { filename: bootstrapResourcesPath });
assert.equal(
  typeof (bootstrapResourcesSandbox.__BOOTSTRAP_RESOURCES__ || {}).resolveBootResourceConfig,
  "function",
  "bootstrap.resources should expose resolveBootResourceConfig"
);
const resolvedBootResourceConfig =
  bootstrapResourcesSandbox.__BOOTSTRAP_RESOURCES__.resolveBootResourceConfig({
    warnOnce: () => {},
  });
assert.equal(
  Array.isArray(resolvedBootResourceConfig.startupDataScripts),
  true,
  "resolved boot config should expose startupDataScripts"
);
assert.equal(
  resolvedBootResourceConfig.startupDataScripts.includes("./data/up-schedules.js"),
  true,
  "startupDataScripts should include ./data/up-schedules.js"
);
assert.match(
  bootstrapSource,
  /startupDataScripts\s*\.map\s*\(\s*(?:function\s*\(\s*src\s*\)|\(\s*src\s*\)\s*=>)[\s\S]*?loadScript\(\s*src\s*\)/,
  "bootstrap data loading should consume startupDataScripts from manifest"
);

assert.match(
  appCoreSource,
  /weaponUpSchedules\s*=\s*[\s\S]*window\.WEAPON_UP_SCHEDULES/,
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
